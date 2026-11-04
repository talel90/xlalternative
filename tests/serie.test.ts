import { describe, expect, it } from 'vitest';
import type { ArticleMarche } from '../src/lib/core/attachement';
import { calculerSerie, type SituationMetre } from '../src/lib/core/serie';

const article: ArticleMarche = {
	code: 'X',
	designation: 'Article test',
	unite: 'U',
	qtePrevue: 10000n,
	puHT: 1000000n, // 1 000 dt l'unité
};

const situations: SituationMetre[] = [
	{
		numero: 1,
		dateArrete: '2026-09-15',
		lignes: [{ code: 'X', unite: 'U', dims: { nbr: 2000n } }],
	},
	{
		numero: 2,
		dateArrete: '2026-10-15',
		lignes: [{ code: 'X', unite: 'U', dims: { nbr: 1000n } }],
	},
];

describe('calculerSerie', () => {
	const [s1, s2] = calculerSerie([article], situations);

	it('situation 1 : HT 2 000 dt, TVA 19 %, retenue 5 %, reste à payer', () => {
		expect(s1.decompte.htva).toBe(2000000n);
		expect(s1.decompte.ttc).toBe(2380000n);
		expect(s1.recapitulation.retenue).toBe(119000n);
		expect(s1.recapitulation.resteAPayer).toBe(2261000n);
	});

	it('situation 2 : repart du cumul précédent (2 000 + 1 000 = 3 000)', () => {
		expect(s2.attachement[0].precedent).toBe(2000n);
		expect(s2.attachement[0].duMois).toBe(1000n);
		expect(s2.attachement[0].cumul).toBe(3000n);
	});

	it('situation 2 : déduit ce qui a déjà été payé', () => {
		expect(s2.decompte.ttc).toBe(3570000n);
		expect(s2.recapitulation.acomptesAnterieurs).toBe(2261000n);
		expect(s2.recapitulation.resteAPayer).toBe(1130500n);
	});

	it('total payé = TTC cumulé − retenue cumulée', () => {
		const payeTotal = s1.recapitulation.resteAPayer + s2.recapitulation.resteAPayer;
		expect(payeTotal).toBe(3570000n - 178500n);
	});

	it('montant du certificat en lettres', () => {
		expect(s1.enLettres).toBe('Deux mille deux cent soixante et un dinars zéro millimes');
	});

	it('trie les situations par numéro', () => {
		const inversees = calculerSerie([article], [...situations].reverse());
		expect(inversees.map((s) => s.numero)).toEqual([1, 2]);
	});
});
