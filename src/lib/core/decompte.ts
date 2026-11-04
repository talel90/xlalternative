import { MILLIEME, arrondiDiv } from './nombres';
import { LigneAttachement } from './attachement';

export interface LigneDecompte {
  code: string;
  designation: string;
  cumul: bigint;
  puHT: bigint;
  /** cumul × PU, arrondi au millime (millimes) */
  montantHT: bigint;
}

export interface Decompte {
  lignes: LigneDecompte[];
  /** Total HTVA (millimes) */
  htva: bigint;
  /** TVA (millimes) */
  tva: bigint;
  /** Total TTC (millimes) */
  ttc: bigint;
}

export function calculerDecompte(
  lignesAttachement: readonly LigneAttachement[],
  tauxTVA = 19n,
): Decompte {
  const lignes = lignesAttachement.map((l) => ({
    code: l.code,
    designation: l.designation,
    cumul: l.cumul,
    puHT: l.puHT,
    montantHT: arrondiDiv(l.cumul * l.puHT, MILLIEME),
  }));
  const htva = lignes.reduce((somme, l) => somme + l.montantHT, 0n);
  const tva = arrondiDiv(htva * tauxTVA, 100n);
  return { lignes, htva, tva, ttc: htva + tva };
}
