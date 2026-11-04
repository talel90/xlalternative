import type { ArticleMarche } from '../core/attachement';
import { parseDecimal } from '../core/nombres';
import type { ArticleImporte } from '../import/bordereau';
import { db, type MarcheRecord, type ProfilEntreprise } from './schema';

const maintenant = () => Date.now();

// ---------- Profil entreprise ----------

export async function lireProfil(): Promise<ProfilEntreprise | undefined> {
	return db.entreprise.get('profil');
}

export async function sauverProfil(
	profil: Pick<ProfilEntreprise, 'nom' | 'codeTVA' | 'banque' | 'rib'>,
): Promise<void> {
	await db.entreprise.put({ id: 'profil', ...profil, updatedAt: maintenant() });
}

// ---------- Marchés ----------

export type InfosMarche = Omit<MarcheRecord, 'id' | 'statut' | 'updatedAt'>;

export async function listerMarches(): Promise<MarcheRecord[]> {
	return db.marches.orderBy('updatedAt').reverse().toArray();
}

export async function lireMarche(id: string): Promise<MarcheRecord | undefined> {
	return db.marches.get(id);
}

/** Articles d'un marché, convertis en entiers exacts pour le moteur de calcul. */
export async function articlesDuMarche(marcheId: string): Promise<ArticleMarche[]> {
	const lignes = await db.articles.where('marcheId').equals(marcheId).sortBy('ordre');
	return lignes.map((a) => ({
		code: a.code,
		designation: a.designation,
		unite: a.unite,
		qtePrevue: BigInt(a.qtePrevue),
		puHT: BigInt(a.puHT),
	}));
}

/**
 * Crée un marché et ses articles en une seule transaction.
 * Met aussi à jour la bibliothèque de désignations (le prix sert de suggestion seulement).
 */
export async function creerMarche(
	infos: InfosMarche,
	articles: readonly ArticleImporte[],
): Promise<string> {
	const id = crypto.randomUUID();
	const now = maintenant();

	await db.transaction('rw', db.marches, db.articles, db.bibliotheque, async () => {
		await db.marches.add({ ...infos, id, statut: 'brouillon', updatedAt: now });

		await db.articles.bulkAdd(
			articles.map((a, index) => ({
				id: crypto.randomUUID(),
				marcheId: id,
				ordre: index,
				code: a.code,
				designation: a.designation,
				unite: a.unite,
				qtePrevue: a.qtePrevue.toString(),
				puHT: a.puHT.toString(),
				updatedAt: now,
			})),
		);

		for (const a of articles) {
			const existant = await db.bibliotheque.where('designation').equals(a.designation).first();
			if (existant) {
				await db.bibliotheque.update(existant.id, {
					unite: a.unite,
					dernierPU: a.puHT.toString(),
					nbUtilisations: existant.nbUtilisations + 1,
					updatedAt: now,
				});
			} else {
				await db.bibliotheque.add({
					id: crypto.randomUUID(),
					designation: a.designation,
					unite: a.unite,
					dernierPU: a.puHT.toString(),
					nbUtilisations: 1,
					updatedAt: now,
				});
			}
		}
	});

	return id;
}

/** Demande au navigateur de ne pas vider les données locales (hors ligne, stockage durable). */
export async function demanderStockageDurable(): Promise<boolean> {
	if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
	try {
		return await navigator.storage.persist();
	} catch {
		return false;
	}
}

/** Montant saisi (texte français) -> entier en millimes. */
export function montantVersMillimes(texte: string): bigint {
	return parseDecimal(texte, 3);
}
