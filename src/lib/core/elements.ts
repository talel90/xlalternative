import { parseDecimal } from './nombres';

export interface FormuleElement {
	/** Code de l'élément type (P1, S1…) */
	code: string;
	/** Nombre d'éléments, en millièmes */
	nbr: bigint;
}

/**
 * Lit une saisie rapide du type « P1 × 24 », « P1*24 », « P1 x 2,5 » ou « P1 ».
 * Renvoie null si la saisie n'a pas cette forme.
 */
export function analyserFormule(texte: string): FormuleElement | null {
	const m = texte.trim().match(/^([A-Za-z0-9][A-Za-z0-9-]*)(?:\s*[x×*]\s*(\d+(?:[.,]\d+)?))?$/);
	if (!m) return null;
	const code = m[1];
	const nbr = m[2] !== undefined ? parseDecimal(m[2], 3) : 1000n;
	return { code, nbr };
}
