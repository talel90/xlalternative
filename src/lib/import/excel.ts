import type { LigneBrute } from './bordereau';

/**
 * Lit la première feuille d'un fichier Excel (.xlsx / .xls) en lignes de texte.
 * SheetJS n'est chargé qu'au moment de l'import, pour garder l'ouverture de l'appli légère.
 */
export async function lireFichierExcel(fichier: File): Promise<LigneBrute[]> {
	const XLSX = await import('xlsx');
	const buffer = await fichier.arrayBuffer();
	const classeur = XLSX.read(buffer, { type: 'array' });
	const feuille = classeur.Sheets[classeur.SheetNames[0]];
	if (!feuille) return [];

	const lignes = XLSX.utils.sheet_to_json<unknown[]>(feuille, { header: 1, raw: true, defval: '' });
	return lignes.map((ligne) =>
		ligne.map((cellule) => (cellule === null || cellule === undefined ? '' : String(cellule).trim())),
	);
}
