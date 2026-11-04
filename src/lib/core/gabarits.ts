import { MILLIEME, arrondiDiv } from './nombres';

export type Unite = 'ml' | 'm2' | 'm3' | 'U' | 'kg';
export type Champ = 'nbr' | 'L' | 'l' | 'h' | 'kgml';

/** Dimensions d'une ligne de métré, toutes en millièmes. */
export type Dimensions = Partial<Record<Champ, bigint>> & { nbr: bigint };

/** Champs affichés et utilisés dans le calcul, selon l'unité de l'article. */
export const GABARITS: Record<Unite, readonly Champ[]> = {
  ml: ['nbr', 'L'],
  m2: ['nbr', 'L', 'h'],
  m3: ['nbr', 'L', 'l', 'h'],
  U: ['nbr'],
  kg: ['nbr', 'L', 'kgml'],
};

/** Produit de facteurs exprimés en millièmes ; le résultat reste en millièmes. */
export function produitMille(facteurs: readonly bigint[]): bigint {
  if (facteurs.length === 0) return 0n;
  return facteurs.reduce((acc, f, i) => (i === 0 ? f : arrondiDiv(acc * f, MILLIEME)));
}

/** Total brut d'une ligne (avant déduction), selon le gabarit de l'unité. */
export function totalBrut(unite: Unite, dims: Dimensions): bigint {
  const facteurs = GABARITS[unite].map((champ) => {
    const valeur = dims[champ];
    if (valeur === undefined) {
      throw new Error(`Champ "${champ}" manquant pour une unité ${unite}`);
    }
    return valeur;
  });
  return produitMille(facteurs);
}

/** Total d'une ligne de métré : brut − à déduire. */
export function totalLigne(unite: Unite, dims: Dimensions, aDeduire = 0n): bigint {
  return totalBrut(unite, dims) - aDeduire;
}
