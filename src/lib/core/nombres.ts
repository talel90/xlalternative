/**
 * Nombres exacts : quantités et montants sont manipulés en entiers (BigInt).
 * - Quantités et dimensions : millièmes (179,250 -> 179250n)
 * - Montants : millimes (60,000 dt -> 60000n)
 */

export const MILLIEME = 1000n;

/** Division entière avec arrondi au plus proche, moitiés vers l'extérieur (0,5 -> 1). */
export function arrondiDiv(num: bigint, den: bigint): bigint {
  if (den <= 0n) throw new RangeError('Le dénominateur doit être strictement positif');
  const negatif = num < 0n;
  const a = negatif ? -num : num;
  const q = (a * 2n + den) / (2n * den);
  return negatif ? -q : q;
}

/**
 * Lit un nombre saisi avec virgule ou point, et le convertit en entier à `decimales` décimales.
 * "179,250" -> 179250n ; "0,0005" (3 décimales) -> 1n (arrondi).
 */
export function parseDecimal(texte: string, decimales = 3): bigint {
  const propre = texte.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(propre)) {
    throw new Error(`Nombre invalide : "${texte}"`);
  }
  const negatif = propre.startsWith('-');
  const [entier, fraction = ''] = (negatif ? propre.slice(1) : propre).split('.');
  const d = BigInt(decimales);
  const chiffres = (fraction + '0'.repeat(decimales + 1)).slice(0, decimales + 1);
  const combine = BigInt(entier) * 10n ** (d + 1n) + BigInt(chiffres);
  const valeur = arrondiDiv(combine, 10n);
  return negatif ? -valeur : valeur;
}

/** Formate un entier à `decimales` décimales : 64742872n -> "64 742,872". */
export function formatDecimal(n: bigint, decimales = 3): string {
  const negatif = n < 0n;
  const a = negatif ? -n : n;
  const echelle = 10n ** BigInt(decimales);
  const entier = (a / echelle).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const fraction = (a % echelle).toString().padStart(decimales, '0');
  const corps = decimales > 0 ? `${entier},${fraction}` : entier;
  return negatif ? `-${corps}` : corps;
}
