import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../src/lib/db/schema';
import {
	articlesDuMarcheRecords,
	ajouterLigne,
	creerAttachement,
	lireAttachement,
	listerAttachements,
} from '../src/lib/db/metre-depots';
import { creerMarche, lireProfil, sauverProfil, montantVersMillimes } from '../src/lib/db/depots';
import { chargerContexte } from '../src/lib/db/serie-depots';
import { validerAttachement } from '../src/lib/db/validation-depots';
import { exporterTout, importerTout } from '../src/lib/db/sauvegarde-depots';
import { lireSauvegarde } from '../src/lib/sauvegarde/format';
import { dossierSituation } from '../src/lib/pdf/documents';
import { importerDepuisTexte } from '../src/lib/import/bordereau';

const BORDEREAU = [
	'N°\tDésignation\tUnité\tQuantité\tPrix',
	'A\tDémolition d’une clôture existante\tml\t180,000\t60,000',
	'E\tEnduit\tm²\t760,000\t24,000',
].join('\n');

async function viderBase() {
	await Promise.all(db.tables.map((t) => t.clear()));
}

async function marcheDeTest(): Promise<string> {
	await sauverProfil({ nom: 'KYMBAT', codeTVA: '1741960X/A/M/000', banque: 'WIFAK BANK', rib: '47008000000013554408' });
	const r = importerDepuisTexte(BORDEREAU);
	if ('erreur' in r) throw new Error(r.erreur);
	return creerMarche(
		{
			numero: '12/2025',
			lot: '1',
			intitule: 'Démolition et reconstruction de la clôture',
			maitreOuvrage: 'Commissariat régional de Sfax 1',
			commissariat: 'Sfax 1',
			dateApprobation: '2025-12-26',
			montantMarcheTTC: montantVersMillimes('138 493,000').toString(),
			tauxTVA: 19,
			tauxRetenue: 5,
			gestion: '2026',
		},
		r.articles,
	);
}

describe('parcours complet sur la base locale', () => {
	beforeEach(async () => {
		await viderBase();
	});

	it('deux attachements : métré, validation, verrouillage, enchaînement', async () => {
		const marcheId = await marcheDeTest();
		const articles = await articlesDuMarcheRecords(marcheId);
		const demolition = articles.find((a) => a.code === 'A')!;

		// Attachement N°1 : 179,250 ml de démolition
		const att1 = await creerAttachement(marcheId, '2026-09-15');
		expect(att1.numero).toBe(1);
		await ajouterLigne(att1.id, { articleId: demolition.id, libelle: 'Tronçon 1', nbr: '1000', L: '179250' });
		await validerAttachement(marcheId, 1);
		expect((await lireAttachement(marcheId, 1))?.statut).toBe('valide');

		// La ligne est verrouillée
		await expect(
			ajouterLigne(att1.id, { articleId: demolition.id, libelle: 'Ajout tardif', nbr: '1000', L: '1000' }),
		).rejects.toThrow('verrouillé');

		// Attachement N°2 : 0,500 ml de plus, il doit repartir du cumul N°1
		const att2 = await creerAttachement(marcheId, '2026-10-15');
		expect(att2.numero).toBe(2);
		await ajouterLigne(att2.id, { articleId: demolition.id, libelle: 'Tronçon 2', nbr: '1000', L: '500' });

		const ctx = await chargerContexte(marcheId);
		expect(ctx?.situations).toHaveLength(2);
		const [s1, s2] = ctx!.situations;
		expect(s1.attachement.find((l) => l.code === 'A')?.cumul).toBe(179250n);
		expect(s2.attachement.find((l) => l.code === 'A')?.precedent).toBe(179250n);
		expect(s2.attachement.find((l) => l.code === 'A')?.cumul).toBe(179750n);

		// N°2 ne peut être validé qu'après N°1 (déjà validé ici), puis le reste à payer s'enchaîne
		await validerAttachement(marcheId, 2);
		expect(s2.recapitulation.acomptesAnterieurs).toBe(s1.recapitulation.resteAPayer);

		// Les documents se génèrent (définition PDF prête)
		const dossier = dossierSituation(ctx!, 2);
		expect(dossier).toBeDefined();
	});

	it('refuse de valider N°2 si N°1 n’est pas validé', async () => {
		const marcheId = await marcheDeTest();
		const articles = await articlesDuMarcheRecords(marcheId);
		const a = articles[0];
		await creerAttachement(marcheId, '2026-09-15');
		const att2 = await creerAttachement(marcheId, '2026-10-15');
		await ajouterLigne(att2.id, { articleId: a.id, libelle: 'x', nbr: '1000', L: '10000' });
		await expect(validerAttachement(marcheId, 2)).rejects.toThrow("Validez d'abord");
	});

	it('sauvegarde : export, effacement, restauration à l’identique', async () => {
		const marcheId = await marcheDeTest();
		const articles = await articlesDuMarcheRecords(marcheId);
		const att = await creerAttachement(marcheId, '2026-09-15');
		await ajouterLigne(att.id, { articleId: articles[0].id, libelle: 'x', nbr: '1000', L: '5000' });
		await validerAttachement(marcheId, 1);

		const texte = JSON.stringify(await exporterTout());
		const compteAvant = (await listerAttachements(marcheId)).length;

		await viderBase();
		expect(await lireProfil()).toBeUndefined();

		await importerTout(lireSauvegarde(texte));
		expect((await lireProfil())?.nom).toBe('KYMBAT');
		expect((await listerAttachements(marcheId)).length).toBe(compteAvant);
		expect((await lireAttachement(marcheId, 1))?.statut).toBe('valide');

		const ctx = await chargerContexte(marcheId);
		expect(ctx?.situations[0].decompte.htva).toBe(300000n); // 5 ml × 60 dt = 300 dt
	});
});
