import { controlerAvantValidation, peutValider, type Controle } from '../core/validation';
import { chargerContexte } from './serie-depots';
import { db } from './schema';
import { lireAttachement } from './metre-depots';

/** Contrôles affichés avant validation d'un attachement. */
export async function controlesDeLAttachement(marcheId: string, numero: number): Promise<Controle[]> {
	const ctx = await chargerContexte(marcheId);
	if (!ctx) return [];
	const idx = ctx.situations.findIndex((s) => s.numero === numero);
	const situation = ctx.situations[idx];
	if (!situation) return [];
	return controlerAvantValidation(
		situation,
		idx > 0 ? ctx.situations[idx - 1] : undefined,
		BigInt(ctx.marche.montantMarcheTTC),
	);
}

/**
 * Valide un attachement : contrôle, verrouillage des lignes, et snapshot des résultats.
 * Les attachements se valident dans l'ordre : N+1 ne peut l'être que si N l'est.
 */
export async function validerAttachement(marcheId: string, numero: number): Promise<void> {
	const ctx = await chargerContexte(marcheId);
	if (!ctx) throw new Error('Marché introuvable.');

	const idx = ctx.situations.findIndex((s) => s.numero === numero);
	const situation = ctx.situations[idx];
	if (!situation) throw new Error('Attachement introuvable.');

	if (numero > 1) {
		const precedent = await lireAttachement(marcheId, numero - 1);
		if (precedent?.statut !== 'valide') {
			throw new Error(`Validez d'abord l'attachement N°${numero - 1}.`);
		}
	}

	const controles = await controlesDeLAttachement(marcheId, numero);
	if (!peutValider(controles)) {
		const bloquants = controles.filter((c) => c.niveau === 'bloquant').map((c) => c.message);
		throw new Error(bloquants.join(' '));
	}

	const snapshot = JSON.stringify({
		htva: situation.decompte.htva.toString(),
		tva: situation.decompte.tva.toString(),
		ttc: situation.decompte.ttc.toString(),
		retenue: situation.recapitulation.retenue.toString(),
		acomptesAnterieurs: situation.recapitulation.acomptesAnterieurs.toString(),
		resteAPayer: situation.recapitulation.resteAPayer.toString(),
		cumuls: situation.attachement.map((l) => [l.code, l.cumul.toString()]),
	});

	const att = await lireAttachement(marcheId, numero);
	if (!att) throw new Error('Attachement introuvable.');
	await db.attachements.update(att.id, { statut: 'valide', snapshot, updatedAt: Date.now() });
}
