import type { Situation } from './serie';

export type NiveauControle = 'bloquant' | 'avertissement';

export interface Controle {
	niveau: NiveauControle;
	message: string;
}

/**
 * Contrôles exécutés avant de valider un attachement.
 * - Bloquant : attachement vide, date d'arrêté antérieure à la précédente.
 * - Avertissement : quantité cumulée au-delà du bordereau, total cumulé au-delà du montant du marché.
 */
export function controlerAvantValidation(
	situation: Situation,
	precedente: Situation | undefined,
	montantMarcheTTC: bigint,
): Controle[] {
	const controles: Controle[] = [];

	const aDuMetre = situation.attachement.some((l) => l.duMois !== 0n);
	if (!aDuMetre) {
		controles.push({ niveau: 'bloquant', message: 'Aucune quantité saisie ce mois-ci.' });
	}

	if (precedente && situation.dateArrete < precedente.dateArrete) {
		controles.push({
			niveau: 'bloquant',
			message: `La date d'arrêté (${situation.dateArrete}) est antérieure à celle de l'attachement N°${precedente.numero} (${precedente.dateArrete}).`,
		});
	}

	for (const l of situation.attachement) {
		if (l.ecart > 0n) {
			controles.push({
				niveau: 'avertissement',
				message: `${l.code} : quantité cumulée supérieure à la quantité prévue au bordereau.`,
			});
		}
	}

	if (situation.decompte.ttc > montantMarcheTTC) {
		controles.push({
			niveau: 'avertissement',
			message: 'Le total TTC cumulé dépasse le montant du marché.',
		});
	}

	return controles;
}

/** La validation est possible si aucun contrôle bloquant ne subsiste. */
export function peutValider(controles: readonly Controle[]): boolean {
	return !controles.some((c) => c.niveau === 'bloquant');
}
