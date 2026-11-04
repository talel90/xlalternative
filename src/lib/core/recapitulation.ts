import { arrondiDiv } from './nombres';

export interface Recapitulation {
  /** Total TTC du décompte (millimes) */
  ttc: bigint;
  /** Retenue de garantie (millimes) */
  retenue: bigint;
  /** Acomptes déjà délivrés (millimes) */
  acomptesAnterieurs: bigint;
  /** Reste à payer (millimes) */
  resteAPayer: bigint;
}

/**
 * Retenue de garantie = 1/20e du TTC (5 %). Base et taux à confirmer (PLAN §8, question 4).
 */
export function calculerRecapitulation(
  ttc: bigint,
  acomptesAnterieurs = 0n,
  tauxRetenue = 5n,
): Recapitulation {
  const retenue = arrondiDiv(ttc * tauxRetenue, 100n);
  return {
    ttc,
    retenue,
    acomptesAnterieurs,
    resteAPayer: ttc - retenue - acomptesAnterieurs,
  };
}
