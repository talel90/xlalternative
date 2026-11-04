import type { ArticleMarche, LigneAttachement } from './attachement';
import { MILLIEME, arrondiDiv } from './nombres';

/** Articles dont le cumul dépasse la quantité prévue au bordereau. */
export function depassementsQuantite(lignes: readonly LigneAttachement[]): LigneAttachement[] {
  return lignes.filter((l) => l.ecart > 0n);
}

/**
 * Compare Σ (qté prévue × PU HT) du bordereau au montant du marché TTC.
 * Le montant du marché est TTC ; on compare donc avec HTVA × (1 + TVA).
 */
export function controlerMontantMarche(
  articles: readonly ArticleMarche[],
  montantMarcheTTC: bigint,
  tauxTVA = 19n,
): { htBordereau: bigint; ttcBordereau: bigint; ecart: bigint; coherent: boolean } {
  const htBordereau = articles.reduce(
    (somme, a) => somme + arrondiDiv(a.qtePrevue * a.puHT, MILLIEME),
    0n,
  );
  const ttcBordereau = htBordereau + arrondiDiv(htBordereau * tauxTVA, 100n);
  const ecart = montantMarcheTTC - ttcBordereau;
  return { htBordereau, ttcBordereau, ecart, coherent: ecart === 0n };
}
