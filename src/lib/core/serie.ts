import { calculerAttachement, type ArticleMarche, type LigneAttachement } from './attachement';
import { calculerDecompte, type Decompte } from './decompte';
import { montantEnLettres } from './enLettres';
import type { LigneMetre } from './metre';
import { calculerRecapitulation, type Recapitulation } from './recapitulation';

/** Métré saisi pour une situation (un attachement). */
export interface SituationMetre {
	numero: number;
	dateArrete: string;
	lignes: LigneMetre[];
}

/** Ensemble des documents calculés pour une situation. */
export interface Situation {
	numero: number;
	dateArrete: string;
	attachement: LigneAttachement[];
	decompte: Decompte;
	recapitulation: Recapitulation;
	/** Montant du certificat en toutes lettres */
	enLettres: string;
}

/**
 * Calcule toutes les situations d'un marché, dans l'ordre des numéros.
 * - Chaque attachement repart des cumuls de l'attachement précédent.
 * - Les acomptes d'une situation sont la somme des montants déjà payés (reste à payer des situations précédentes).
 */
export function calculerSerie(
	articles: readonly ArticleMarche[],
	situations: readonly SituationMetre[],
	tauxTVA = 19n,
	tauxRetenue = 5n,
): Situation[] {
	const ordonnees = [...situations].sort((a, b) => a.numero - b.numero);
	const resultats: Situation[] = [];
	let cumulsPrecedents = new Map<string, bigint>();
	let dejaPaye = 0n;

	for (const s of ordonnees) {
		const attachement = calculerAttachement(articles, s.lignes, cumulsPrecedents);
		const decompte = calculerDecompte(attachement, tauxTVA);
		const recapitulation = calculerRecapitulation(decompte.ttc, dejaPaye, tauxRetenue);

		resultats.push({
			numero: s.numero,
			dateArrete: s.dateArrete,
			attachement,
			decompte,
			recapitulation,
			enLettres: montantEnLettres(recapitulation.resteAPayer),
		});

		cumulsPrecedents = new Map(attachement.map((l) => [l.code, l.cumul]));
		dejaPaye += recapitulation.resteAPayer;
	}

	return resultats;
}
