import { describe, expect, it } from 'vitest';
import { analyserFormule } from '../src/lib/core/elements';

describe('analyserFormule', () => {
	it('lit « P1 × 24 » et ses variantes de saisie', () => {
		expect(analyserFormule('P1 × 24')).toEqual({ code: 'P1', nbr: 24000n });
		expect(analyserFormule('P1*24')).toEqual({ code: 'P1', nbr: 24000n });
		expect(analyserFormule('P1 x 2,5')).toEqual({ code: 'P1', nbr: 2500n });
	});
	it('sans multiplicateur, compte un élément', () => {
		expect(analyserFormule('S1')).toEqual({ code: 'S1', nbr: 1000n });
	});
	it('rejette une saisie qui n’est pas une formule', () => {
		expect(analyserFormule('× 24')).toBeNull();
		expect(analyserFormule('P1 × abc')).toBeNull();
		expect(analyserFormule('')).toBeNull();
	});
});
