import { totalParArticle, type LigneMetre } from '../core/metre';
import { totalLigne, type Dimensions, type Unite, GABARITS, type Champ } from '../core/gabarits';
import { parseDecimal } from '../core/nombres';
import {
	db,
	type AttachementRecord,
	type ElementTypeRecord,
	type LigneMetreRecord,
	type ArticleRecord,
} from './schema';

const maintenant = () => Date.now();

// ---------- Attachements ----------

export async function listerAttachements(marcheId: string): Promise<AttachementRecord[]> {
	return db.attachements.where('marcheId').equals(marcheId).sortBy('numero');
}

export async function lireAttachement(
	marcheId: string,
	numero: number,
): Promise<AttachementRecord | undefined> {
	return db.attachements.where('[marcheId+numero]').equals([marcheId, numero]).first();
}

/** Crée l'attachement suivant (numéro = dernier + 1). */
export async function creerAttachement(marcheId: string, dateArrete: string): Promise<AttachementRecord> {
	const existants = await listerAttachements(marcheId);
	const numero = existants.length === 0 ? 1 : Math.max(...existants.map((a) => a.numero)) + 1;
	const record: AttachementRecord = {
		id: crypto.randomUUID(),
		marcheId,
		numero,
		dateArrete,
		statut: 'brouillon',
		updatedAt: maintenant(),
	};
	await db.attachements.add(record);
	return record;
}

// ---------- Lignes de métré ----------

export async function lignesDeLAttachement(attachementId: string): Promise<LigneMetreRecord[]> {
	return db.lignesMetre.where('attachementId').equals(attachementId).sortBy('ordre');
}

export interface DonneesLigne {
	articleId: string;
	libelle: string;
	nbr: string;
	L?: string;
	l?: string;
	h?: string;
	kgml?: string;
	aDeduire?: string;
}

async function prochainOrdre(attachementId: string): Promise<number> {
	const lignes = await lignesDeLAttachement(attachementId);
	return lignes.length === 0 ? 0 : Math.max(...lignes.map((l) => l.ordre)) + 1;
}

/** Un attachement validé est figé : aucune ligne ne peut plus y être ajoutée, modifiée ou supprimée. */
export async function verifierBrouillon(attachementId: string): Promise<void> {
	const att = await db.attachements.get(attachementId);
	if (att?.statut === 'valide') {
		throw new Error(`L'attachement N°${att.numero} est validé et verrouillé.`);
	}
}

export async function ajouterLigne(attachementId: string, donnees: DonneesLigne): Promise<void> {
	await verifierBrouillon(attachementId);
	await db.lignesMetre.add({
		id: crypto.randomUUID(),
		attachementId,
		ordre: await prochainOrdre(attachementId),
		updatedAt: maintenant(),
		...donnees,
	});
}

export async function modifierLigne(id: string, donnees: Partial<DonneesLigne>): Promise<void> {
	const l = await db.lignesMetre.get(id);
	if (l) await verifierBrouillon(l.attachementId);
	await db.lignesMetre.update(id, { ...donnees, updatedAt: maintenant() });
}

export async function supprimerLigne(id: string): Promise<void> {
	const l = await db.lignesMetre.get(id);
	if (l) await verifierBrouillon(l.attachementId);
	await db.lignesMetre.delete(id);
}

/** Copie une ligne juste après elle-même (utile pour les mesures répétées). */
export async function dupliquerLigne(id: string): Promise<void> {
	const source = await db.lignesMetre.get(id);
	if (!source) return;
	await verifierBrouillon(source.attachementId);
	const lignes = await lignesDeLAttachement(source.attachementId);
	const suivantes = lignes.filter((l) => l.ordre > source.ordre);
	await db.transaction('rw', db.lignesMetre, async () => {
		for (const l of suivantes) {
			await db.lignesMetre.update(l.id, { ordre: l.ordre + 1 });
		}
		const { id: _ancienId, ...reste } = source;
		await db.lignesMetre.add({
			...reste,
			id: crypto.randomUUID(),
			ordre: source.ordre + 1,
			updatedAt: maintenant(),
		});
	});
}

// ---------- Éléments types ----------

export async function listerElements(marcheId: string): Promise<ElementTypeRecord[]> {
	return db.elementsTypes.where('marcheId').equals(marcheId).sortBy('code');
}

export async function creerElement(
	marcheId: string,
	donnees: Omit<ElementTypeRecord, 'id' | 'marcheId' | 'updatedAt'>,
): Promise<void> {
	await db.elementsTypes.add({
		id: crypto.randomUUID(),
		marcheId,
		updatedAt: maintenant(),
		...donnees,
	});
}

export async function supprimerElement(id: string): Promise<void> {
	await db.elementsTypes.delete(id);
}

// ---------- Calculs ----------

/** Convertit une ligne stockée (chaînes) en dimensions exactes du moteur. */
export function versDimensions(
	l: Pick<LigneMetreRecord, 'nbr' | 'L' | 'l' | 'h' | 'kgml'>,
): Dimensions {
	const dims: Dimensions = { nbr: BigInt(l.nbr) };
	if (l.L !== undefined) dims.L = BigInt(l.L);
	if (l.l !== undefined) dims.l = BigInt(l.l);
	if (l.h !== undefined) dims.h = BigInt(l.h);
	if (l.kgml !== undefined) dims.kgml = BigInt(l.kgml);
	return dims;
}

/** Total (millièmes) du mois par article, à partir des lignes saisies. */
export async function totauxDuMois(
	attachementId: string,
	articles: readonly ArticleRecord[],
): Promise<Map<string, bigint>> {
	const lignes = await lignesDeLAttachement(attachementId);
	const articleParId = new Map(articles.map((a) => [a.id, a]));
	const lignesMetre: LigneMetre[] = [];
	for (const l of lignes) {
		const article = articleParId.get(l.articleId);
		if (!article) continue;
		lignesMetre.push({
			code: article.code,
			unite: article.unite,
			dims: versDimensions(l),
			aDeduire: l.aDeduire ? BigInt(l.aDeduire) : undefined,
		});
	}
	return totalParArticle(lignesMetre);
}

/** Total d'une ligne en millièmes, pour l'affichage en direct pendant la saisie. */
export function totalDUneLigne(unite: Unite, l: DonneesLigne): bigint {
	return totalLigne(unite, versDimensions(l), l.aDeduire ? BigInt(l.aDeduire) : 0n);
}

/** Champs à afficher pour une unité. */
export function champsPourUnite(unite: Unite): readonly Champ[] {
	return GABARITS[unite];
}

/** Saisie française d'une dimension -> millièmes en chaîne, ou undefined si vide. */
export function lireDimension(texte: string): string | undefined {
	if (texte.trim() === '') return undefined;
	return parseDecimal(texte, 3).toString();
}

// ---------- Articles du marché ----------

export async function articlesDuMarcheRecords(marcheId: string): Promise<ArticleRecord[]> {
	return db.articles.where('marcheId').equals(marcheId).sortBy('ordre');
}
