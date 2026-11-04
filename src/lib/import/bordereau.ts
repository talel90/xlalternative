import type { Unite } from '../core/gabarits';
import { parseDecimal } from '../core/nombres';

/** Ligne brute issue d'un tableau (Excel, presse-papiers ou CSV), cellules en texte. */
export type LigneBrute = string[];

export interface ColonnesBordereau {
	code: number;
	designation: number;
	unite: number;
	quantite: number;
	prix: number;
}

export interface ArticleImporte {
	ligneSource: number;
	code: string;
	designation: string;
	unite: Unite;
	qtePrevue: bigint;
	puHT: bigint;
}

export interface ErreurImport {
	ligneSource: number;
	message: string;
}

export interface ResultatImport {
	colonnes: ColonnesBordereau;
	articles: ArticleImporte[];
	erreurs: ErreurImport[];
}

/** Découpe un texte collé (tabulations entre cellules, retours à la ligne entre lignes). */
export function parseCollage(texte: string): LigneBrute[] {
	return texte
		.split(/\r?\n/)
		.filter((ligne) => ligne.trim() !== '')
		.map((ligne) => ligne.split('\t').map((cellule) => cellule.trim()));
}

/** Normalise une unité saisie dans un bordereau vers les unités gérées par l'application. */
export function normaliserUnite(brute: string): Unite | null {
	const u = brute
		.trim()
		.toLowerCase()
		.replace(/\s/g, '')
		.replace(/[²]/g, '2')
		.replace(/[³]/g, '3')
		.replace(/\.$/, '');
	switch (u) {
		case 'ml':
		case 'm.l':
			return 'ml';
		case 'm2':
		case 'm^2':
			return 'm2';
		case 'm3':
		case 'm^3':
			return 'm3';
		case 'u':
		case 'ens':
		case 'forfait':
		case 'f':
			return 'U';
		case 'kg':
			return 'kg';
		default:
			return null;
	}
}

function normaliserEntete(texte: string): string {
	return texte
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9°]+/g, ' ')
		.trim();
}

/**
 * Repère les colonnes à partir de l'en-tête (N°, Désignation, Unité, Qté, PU).
 * Retourne null si l'en-tête est introuvable : l'utilisateur choisira alors les colonnes.
 */
export function detecterColonnes(lignes: readonly LigneBrute[]): ColonnesBordereau | null {
	for (const ligne of lignes.slice(0, 15)) {
		const entetes = ligne.map(normaliserEntete);
		const trouver = (motifs: RegExp[]) => entetes.findIndex((e) => motifs.some((m) => m.test(e)));

		const designation = trouver([/designation/, /libelle/]);
		const quantite = trouver([/quantite/, /^qte/, /\bqte\b/]);
		const prix = trouver([/prix/, /\bpu\b/]);
		const unite = trouver([/^unite/, /^u$/, /\bunite\b/]);
		const code = trouver([/^n$/, /^n°/, /\bn\b/, /article/, /^code$/]);

		if (designation >= 0 && quantite >= 0 && prix >= 0) {
			return {
				code: code >= 0 ? code : 0,
				designation,
				unite: unite >= 0 ? unite : -1,
				quantite,
				prix,
			};
		}
	}
	return null;
}

/**
 * Transforme les lignes en articles. Les lignes sans quantité ni prix (titres, sous-totaux)
 * sont ignorées sans erreur ; les lignes incomplètes ou mal lues sont signalées.
 */
export function lignesVersArticles(
	lignes: readonly LigneBrute[],
	colonnes: ColonnesBordereau,
): ResultatImport {
	const articles: ArticleImporte[] = [];
	const erreurs: ErreurImport[] = [];

	lignes.forEach((ligne, index) => {
		const ligneSource = index + 1;
		const cellule = (i: number) => (i >= 0 && i < ligne.length ? ligne[i] : '');

		const designation = cellule(colonnes.designation);
		const quantiteBrute = cellule(colonnes.quantite);
		const prixBrut = cellule(colonnes.prix);
		if (designation === '' || (quantiteBrute === '' && prixBrut === '')) return;

		// En-tête répété ou ligne de titre : on ignore sans bruit
		if (normaliserEntete(designation).startsWith('designation')) return;

		const code = cellule(colonnes.code) || `L${ligneSource}`;
		const unite = normaliserUnite(cellule(colonnes.unite));

		try {
			if (unite === null) {
				throw new Error(`Unité inconnue : "${cellule(colonnes.unite)}"`);
			}
			articles.push({
				ligneSource,
				code,
				designation,
				unite,
				qtePrevue: parseDecimal(quantiteBrute, 3),
				puHT: parseDecimal(prixBrut, 3),
			});
		} catch (e) {
			erreurs.push({ ligneSource, message: e instanceof Error ? e.message : String(e) });
		}
	});

	return { colonnes, articles, erreurs };
}

/** Pipeline complet pour un texte collé. */
export function importerDepuisTexte(texte: string): ResultatImport | { erreur: string } {
	const lignes = parseCollage(texte);
	const colonnes = detecterColonnes(lignes);
	if (!colonnes) {
		return { erreur: "En-tête introuvable : il faut une colonne Désignation, Quantité et Prix." };
	}
	return lignesVersArticles(lignes, colonnes);
}
