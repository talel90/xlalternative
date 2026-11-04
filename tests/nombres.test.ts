import { describe, expect, it } from 'vitest';
import { arrondiDiv, formatDecimal, parseDecimal } from '../src/lib/core/nombres';
import { montantEnLettres } from '../src/lib/core/enLettres';

describe('arrondiDiv', () => {
  it('arrondit les moitiés vers le haut', () => {
    expect(arrondiDiv(5n, 2n)).toBe(3n);
    expect(arrondiDiv(3n, 2n)).toBe(2n);
    expect(arrondiDiv(4n, 2n)).toBe(2n);
  });
  it('arrondit les négatifs symétriquement', () => {
    expect(arrondiDiv(-5n, 2n)).toBe(-3n);
  });
});

describe('parseDecimal / formatDecimal', () => {
  it('lit la virgule française en millièmes', () => {
    expect(parseDecimal('179,250')).toBe(179250n);
    expect(parseDecimal('179.25')).toBe(179250n);
    expect(parseDecimal('1 150,000')).toBe(1150000n);
  });
  it('arrondit au millième inférieur saisi', () => {
    expect(parseDecimal('0,0005')).toBe(1n);
  });
  it('rejette une saisie invalide', () => {
    expect(() => parseDecimal('12a')).toThrow();
  });
  it('formate en style français', () => {
    expect(formatDecimal(64742872n)).toBe('64 742,872');
    expect(formatDecimal(179250n)).toBe('179,250');
    expect(formatDecimal(0n)).toBe('0,000');
  });
});

describe('montantEnLettres', () => {
  it('reproduit le montant du certificat de référence', () => {
    expect(montantEnLettres(64742872n)).toBe(
      'Soixante-quatre mille sept cent quarante-deux dinars huit cent soixante-douze millimes',
    );
  });
  it('gère les formes particulières', () => {
    expect(montantEnLettres(81000n)).toBe('Quatre-vingt-un dinars zéro millimes');
    expect(montantEnLettres(80000n)).toBe('Quatre-vingts dinars zéro millimes');
    expect(montantEnLettres(21000n)).toBe('Vingt et un dinars zéro millimes');
    expect(montantEnLettres(1000000n)).toBe('Mille dinars zéro millimes');
    expect(montantEnLettres(200000n)).toBe('Deux cents dinars zéro millimes');
    expect(montantEnLettres(1001n)).toBe('Un dinar un millime');
  });
});
