import { creerSauvegarde, TABLES, type NomTable, type Sauvegarde } from '../sauvegarde/format';
import { db } from './schema';

/** Lit toute la base et la range dans une sauvegarde. */
export async function exporterTout(): Promise<Sauvegarde> {
	const donnees: Partial<Record<NomTable, Record<string, unknown>[]>> = {};
	for (const nom of TABLES) {
		donnees[nom] = (await db.table(nom).toArray()) as Record<string, unknown>[];
	}
	return creerSauvegarde(donnees);
}

/**
 * Remplace toutes les données locales par celles de la sauvegarde.
 * Opération atomique : en cas d'erreur, la base reste inchangée.
 */
export async function importerTout(sauvegarde: Sauvegarde): Promise<void> {
	const tables = TABLES.map((nom) => db.table(nom));
	await db.transaction('rw', tables, async () => {
		for (const nom of TABLES) {
			await db.table(nom).clear();
			const lignes = sauvegarde.donnees[nom];
			if (lignes.length > 0) await db.table(nom).bulkPut(lignes);
		}
	});
}

/** Déclenche le téléchargement du fichier .json dans le navigateur. */
export function telechargerSauvegarde(s: Sauvegarde): void {
	const blob = new Blob([JSON.stringify(s)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const date = s.exporteLe.slice(0, 10);
	const a = document.createElement('a');
	a.href = url;
	a.download = `sauvegarde-decompte-btp-${date}.json`;
	a.click();
	URL.revokeObjectURL(url);
}
