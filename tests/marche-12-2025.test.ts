import { describe, expect, it } from 'vitest';
import { parseDecimal } from '../src/lib/core/nombres';
import { calculerAttachement, type ArticleMarche } from '../src/lib/core/attachement';
import type { LigneMetre } from '../src/lib/core/metre';
import { calculerDecompte } from '../src/lib/core/decompte';
import { calculerRecapitulation } from '../src/lib/core/recapitulation';
import { controlerMontantMarche } from '../src/lib/core/controles';
import { montantEnLettres } from '../src/lib/core/enLettres';

/** Bordereau du Marché N°12/2025 LOT 1 (valeurs lues sur les photos). */
const P = parseDecimal;
const articles: ArticleMarche[] = [
  { code: 'A', designation: "Démolition d'une cloture existante", unite: 'ml', qtePrevue: P('180,000'), puHT: P('60,000') },
  { code: 'B-1', designation: 'fouille en puits', unite: 'm3', qtePrevue: P('70,000'), puHT: P('50,000') },
  { code: 'B-2', designation: 'Fouille en rigole', unite: 'm3', qtePrevue: P('15,000'), puHT: P('50,000') },
  { code: 'C-1', designation: 'Gros béton', unite: 'm3', qtePrevue: P('55,000'), puHT: P('280,000') },
  { code: 'C-2', designation: 'Béton de propreté', unite: 'm3', qtePrevue: P('4,000'), puHT: P('300,000') },
  { code: 'C-4', designation: 'Béton armé en fondation', unite: 'm3', qtePrevue: P('23,000'), puHT: P('1 150,000') },
  { code: 'C-5', designation: 'Béton armé en élévation', unite: 'm3', qtePrevue: P('13,000'), puHT: P('1 150,000') },
  { code: 'D', designation: 'Mur en brique de 25', unite: 'm2', qtePrevue: P('324,000'), puHT: P('40,000') },
  { code: 'E', designation: 'Enduit', unite: 'm2', qtePrevue: P('760,000'), puHT: P('24,000') },
];

/** Métré de l'attachement N°1 : une ligne par article, dimensions déjà cumulées sur la photo. */
const metre: LigneMetre[] = [
  { code: 'A', unite: 'ml', dims: { nbr: P('1'), L: P('179,250') } },
  { code: 'B-1', unite: 'm3', dims: { nbr: P('1'), L: P('65,086'), l: P('1'), h: P('1') } },
  { code: 'B-2', unite: 'm3', dims: { nbr: P('1'), L: P('5,355'), l: P('1'), h: P('1') } },
  { code: 'C-1', unite: 'm3', dims: { nbr: P('1'), L: P('35,199'), l: P('1'), h: P('1') } },
  { code: 'C-2', unite: 'm3', dims: { nbr: P('1'), L: P('1,935'), l: P('1'), h: P('1') } },
  { code: 'C-4', unite: 'm3', dims: { nbr: P('1'), L: P('13,011'), l: P('1'), h: P('1') } },
  { code: 'C-5', unite: 'm3', dims: { nbr: P('1'), L: P('4,780'), l: P('1'), h: P('1') } },
  { code: 'D', unite: 'm2', dims: { nbr: P('1'), L: P('114,357'), h: P('1') } },
  { code: 'E', unite: 'm2', dims: { nbr: P('1'), L: P('313,423'), h: P('1') } },
];

describe('Marché 12/2025 — Attachement N°1', () => {
  const lignes = calculerAttachement(articles, metre);

  it('calcule le cumul de chaque article (qté du mois, sans précédent)', () => {
    const cumuls = Object.fromEntries(lignes.map((l) => [l.code, l.cumul]));
    expect(cumuls).toEqual({
      A: P('179,250'),
      'B-1': P('65,086'),
      'B-2': P('5,355'),
      'C-1': P('35,199'),
      'C-2': P('1,935'),
      'C-4': P('13,011'),
      'C-5': P('4,780'),
      D: P('114,357'),
      E: P('313,423'),
    });
  });

  it('détecte les écarts en moins par rapport au bordereau', () => {
    const a = lignes.find((l) => l.code === 'A')!;
    expect(a.ecart).toBe(P('-0,750'));
  });

  it('montants HT par article : valeurs papier exactes sauf C-4 et C-5', () => {
    const { lignes: montants } = calculerDecompte(lignes);
    const montantPar = Object.fromEntries(montants.map((l) => [l.code, l.montantHT]));
    expect(montantPar.A).toBe(P('10 755,000'));
    expect(montantPar['B-1']).toBe(P('3 254,300'));
    expect(montantPar['B-2']).toBe(P('267,750'));
    expect(montantPar['C-1']).toBe(P('9 855,720'));
    expect(montantPar['C-2']).toBe(P('580,500'));
    expect(montantPar.D).toBe(P('4 574,280'));
    expect(montantPar.E).toBe(P('7 522,152'));
  });

  // Écart connu : papier C-4 = 14 962,190 et C-5 = 5 497,345 ; quantité × PU donne 14 962,650 et 5 497,000.
  // Total HTVA calculé 57 269,352 contre 57 269,237 papier (0,115 dt). Voir PLAN.md §6 et §8.1.
  it.skip('HTVA total = 57 269,237 (écart connu C-4/C-5, à trancher)', () => {
    expect(calculerDecompte(lignes).htva).toBe(P('57 269,237'));
  });
});

describe('Marché 12/2025 — chaîne de fin à partir du HTVA papier', () => {
  // Le HTVA papier sert de point de départ : on valide TVA, TTC, retenue et reste à payer.
  const htva = P('57 269,237');

  it('TVA 19 % = 10 881,155 et TTC = 68 150,392', () => {
    const tva = (htva * 19n + 50n) / 100n;
    expect(tva).toBe(P('10 881,155'));
    expect(htva + tva).toBe(P('68 150,392'));
  });

  it('retenue 5 % = 3 407,520 et reste à payer = 64 742,872', () => {
    const recap = calculerRecapitulation(P('68 150,392'));
    expect(recap.retenue).toBe(P('3 407,520'));
    expect(recap.resteAPayer).toBe(P('64 742,872'));
  });

  it('montant en lettres du certificat', () => {
    expect(montantEnLettres(P('64 742,872'))).toBe(
      'Soixante-quatre mille sept cent quarante-deux dinars huit cent soixante-douze millimes',
    );
  });
});

describe('Contrôle du bordereau', () => {
  it('Σ qté × PU HT des 9 articles lus = 104 250,000 HT', () => {
    const { htBordereau, ttcBordereau } = controlerMontantMarche(articles, P('138 493,000'));
    expect(htBordereau).toBe(P('104 250,000'));
    expect(ttcBordereau).toBe(P('124 057,500'));
  });

  it('signale l’écart avec le montant du certificat (138 493,000) : bordereau incomplet ou erreur', () => {
    const { coherent, ecart } = controlerMontantMarche(articles, P('138 493,000'));
    expect(coherent).toBe(false);
    expect(ecart).toBe(P('14 435,500'));
  });
});
