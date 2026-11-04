/**
 * Montant en toutes lettres, en français, pour le certificat de paiement.
 * Exemple : 64742872n -> "Soixante-quatre mille sept cent quarante-deux dinars huit cent soixante-douze millimes"
 */

const UNITES = [
  'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf',
];
const DIZAINES = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];

/** 0 à 99. `finale` : indique si le mot termine le nombre (pour « quatre-vingts »). */
function sous100(n: number, finale = true): string {
  if (n < 20) return UNITES[n];
  if (n < 70) {
    const dizaine = DIZAINES[Math.floor(n / 10)];
    const unite = n % 10;
    if (unite === 0) return dizaine;
    if (unite === 1) return `${dizaine} et un`;
    return `${dizaine}-${UNITES[unite]}`;
  }
  if (n < 80) {
    const r = n - 60;
    if (r === 11) return 'soixante et onze';
    return `soixante-${UNITES[r]}`;
  }
  const r = n - 80;
  if (r === 0) return finale ? 'quatre-vingts' : 'quatre-vingt';
  return `quatre-vingt-${sous100(r)}`;
}

/** 0 à 999. */
function sous1000(n: number, finale = true): string {
  const centaines = Math.floor(n / 100);
  const reste = n % 100;
  if (centaines === 0) return sous100(reste, finale);

  const prefixe = centaines === 1 ? '' : `${UNITES[centaines]} `;
  const s = reste === 0 && finale && centaines > 1 ? 's' : '';
  const texte = `${prefixe}cent${s}`;
  return reste === 0 ? texte : `${texte} ${sous100(reste, finale)}`;
}

/** Entier positif jusqu'à 999 999 999. */
function entierEnLettres(n: number): string {
  if (n < 0 || n >= 1_000_000_000) throw new RangeError('Montant hors limite');
  if (n === 0) return 'zéro';

  const millions = Math.floor(n / 1_000_000);
  const milliers = Math.floor((n % 1_000_000) / 1000);
  const reste = n % 1000;
  const parties: string[] = [];

  if (millions > 0) {
    parties.push(millions === 1 ? 'un million' : `${sous1000(millions, false)} millions`);
  }
  if (milliers > 0) {
    parties.push(milliers === 1 ? 'mille' : `${sous1000(milliers, false)} mille`);
  }
  if (reste > 0) {
    parties.push(sous1000(reste));
  }
  return parties.join(' ');
}

function majuscule(texte: string): string {
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

/** Montant en millimes -> "… dinars … millimes", première lettre en majuscule. */
export function montantEnLettres(millimes: bigint): string {
  if (millimes < 0n) throw new RangeError('Montant négatif non géré');
  const dinars = Number(millimes / 1000n);
  const millimesRestants = Number(millimes % 1000n);

  const txtDinars = `${entierEnLettres(dinars)} dinar${dinars === 1 ? '' : 's'}`;
  const txtMillimes = `${entierEnLettres(millimesRestants)} millime${millimesRestants === 1 ? '' : 's'}`;
  return majuscule(`${txtDinars} ${txtMillimes}`);
}
