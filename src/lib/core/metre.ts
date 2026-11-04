import { Dimensions, Unite, totalLigne } from './gabarits';

export interface LigneMetre {
  /** Code de l'article dans le bordereau (A, B-1, C-4…) */
  code: string;
  unite: Unite;
  dims: Dimensions;
  aDeduire?: bigint;
}

/** Somme du métré par article, en millièmes. */
export function totalParArticle(lignes: readonly LigneMetre[]): Map<string, bigint> {
  const totaux = new Map<string, bigint>();
  for (const ligne of lignes) {
    const total = totalLigne(ligne.unite, ligne.dims, ligne.aDeduire ?? 0n);
    totaux.set(ligne.code, (totaux.get(ligne.code) ?? 0n) + total);
  }
  return totaux;
}
