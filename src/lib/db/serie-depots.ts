import { calculerSerie, type Situation, type SituationMetre } from '../core/serie';
import type { LigneMetre } from '../core/metre';
import { articlesDuMarche, lireMarche, lireProfil } from './depots';
import { lignesDeLAttachement, listerAttachements, versDimensions } from './metre-depots';
import type { MarcheRecord, ProfilEntreprise } from './schema';
import { db } from './schema';

export interface ContexteDocuments {
	marche: MarcheRecord;
	profil?: ProfilEntreprise;
	situations: Situation[];
}

/**
 * Assemble toutes les situations d'un marché à partir de la base,
 * puis calcule les documents (attachements, décomptes, récapitulations, certificats).
 */
export async function chargerContexte(marcheId: string): Promise<ContexteDocuments | undefined> {
	const marche = await lireMarche(marcheId);
	if (!marche) return undefined;

	const articles = await articlesDuMarche(marcheId);
	const codeParArticleId = new Map(
		(await db.articles.where('marcheId').equals(marcheId).toArray()).map((a) => [a.id, a.code]),
	);
	const uniteParCode = new Map(articles.map((a) => [a.code, a.unite]));

	const attachements = await listerAttachements(marcheId);
	const situationsMetre: SituationMetre[] = [];
	for (const att of attachements) {
		const lignes = await lignesDeLAttachement(att.id);
		const lignesMetre: LigneMetre[] = [];
		for (const l of lignes) {
			const code = codeParArticleId.get(l.articleId);
			const unite = code ? uniteParCode.get(code) : undefined;
			if (!code || !unite) continue;
			lignesMetre.push({
				code,
				unite,
				dims: versDimensions(l),
				aDeduire: l.aDeduire ? BigInt(l.aDeduire) : undefined,
			});
		}
		situationsMetre.push({ numero: att.numero, dateArrete: att.dateArrete, lignes: lignesMetre });
	}

	const situations = calculerSerie(
		articles,
		situationsMetre,
		BigInt(marche.tauxTVA),
		BigInt(marche.tauxRetenue),
	);

	return { marche, profil: await lireProfil(), situations };
}
