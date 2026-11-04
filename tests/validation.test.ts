import { describe, expect, it } from 'vitest';
import { calculerSerie, type Situation } from '../src/lib/core/serie';
import { controlerAvantValidation, peutValider } from '../src/lib/core/validation';
import type { ArticleMarche } from '../src/lib/core/attachement';

const article: ArticleMarche = {
	code: 'X',
	designation: 'Article test',
	unite: 'U',
	qtePrevue: 3000n,
	puHT: 1000000n,
};

function serie(lignes: { numero: number; date: string; nbr: bigint }[]): Situation[] {
	return calculerSerie(
		[article],
		lignes.map((l) => ({
			numero: l.numero,
			dateArrete: l.date,
			lignes: l.nbr === 0n ? [] : [{ code: 'X', unite: 'U', dims: { nbr: l.nbr } }],
		})),
	);
}

describe('controlerAvantValidation', () => {
	it('bloque un attachement sans quantité', () => {
		const [s] = serie([{ numero: 1, date: '2026-09-15', nbr: 0n }]);
		const controles = controlerAvantValidation(s, undefined, 10n ** 12n);
		expect(peutValider(controles)).toBe(false);
	});

	it('bloque une date d’arrêté antérieure à la précédente', () => {
		const [s1, s2] = serie([
			{ numero: 1, date: '2026-10-15', nbr: 1000n },
			{ numero: 2, date: '2026-09-01', nbr: 1000n },
		]);
		const controles = controlerAvantValidation(s2, s1, 10n ** 12n);
		expect(controles.some((c) => c.niveau === 'bloquant')).toBe(true);
	});

	it('avertit quand le cumul dépasse la quantité prévue', () => {
		const [s] = serie([{ numero: 1, date: '2026-09-15', nbr: 4000n }]);
		const controles = controlerAvantValidation(s, undefined, 10n ** 12n);
		expect(controles.some((c) => c.niveau === 'avertissement' && c.message.includes('X'))).toBe(true);
		expect(peutValider(controles)).toBe(true);
	});

	it('avertit quand le total dépasse le montant du marché', () => {
		const [s] = serie([{ numero: 1, date: '2026-09-15', nbr: 1000n }]);
		const controles = controlerAvantValidation(s, undefined, 1000n);
		expect(controles.some((c) => c.message.includes('montant du marché'))).toBe(true);
	});

	it('aucun contrôle pour une situation saine', () => {
		const [s1, s2] = serie([
			{ numero: 1, date: '2026-09-15', nbr: 1000n },
			{ numero: 2, date: '2026-10-15', nbr: 1000n },
		]);
		expect(controlerAvantValidation(s2, s1, 10n ** 12n)).toEqual([]);
	});
});
