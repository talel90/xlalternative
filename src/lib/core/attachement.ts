import type { Unite } from './gabarits';
import { totalParArticle, type LigneMetre } from './metre';

export interface ArticleMarche {
  code: string;
  designation: string;
  unite: Unite;
  /** Quantité prévue au bordereau, en millièmes */
  qtePrevue: bigint;
  /** Prix unitaire HT, en millimes */
  puHT: bigint;
}

export interface LigneAttachement {
  code: string;
  designation: string;
  unite: Unite;
  qtePrevue: bigint;
  puHT: bigint;
  /** Cumul des attachements précédents (millièmes) */
  precedent: bigint;
  /** Quantité du mois, issue du métré (millièmes) */
  duMois: bigint;
  /** precedent + duMois (millièmes) */
  cumul: bigint;
  /** cumul − qtePrevue : positif = en plus, négatif = en moins */
  ecart: bigint;
}

/**
 * Calcule l'état d'attachement d'une situation.
 * `cumulsPrecedents` vient du snapshot de l'attachement N−1 (vide pour le N°1).
 */
export function calculerAttachement(
  articles: readonly ArticleMarche[],
  lignesMetre: readonly LigneMetre[],
  cumulsPrecedents: ReadonlyMap<string, bigint> = new Map(),
): LigneAttachement[] {
  const duMoisParArticle = totalParArticle(lignesMetre);

  return articles.map((article) => {
    const precedent = cumulsPrecedents.get(article.code) ?? 0n;
    const duMois = duMoisParArticle.get(article.code) ?? 0n;
    const cumul = precedent + duMois;
    return {
      code: article.code,
      designation: article.designation,
      unite: article.unite,
      qtePrevue: article.qtePrevue,
      puHT: article.puHT,
      precedent,
      duMois,
      cumul,
      ecart: cumul - article.qtePrevue,
    };
  });
}
