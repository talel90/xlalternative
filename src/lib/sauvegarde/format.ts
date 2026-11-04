/**
 * Format de la sauvegarde .json. Le numéro de version permet de refuser un fichier plus récent
 * que l'application, et de migrer les anciens fichiers plus tard.
 */

export const FORMAT_SAUVEGARDE = 'decompte-btp';
export const VERSION_SCHEMA = 2;

export const TABLES = [
	'entreprise',
	'marches',
	'articles',
	'bibliotheque',
	'attachements',
	'lignesMetre',
	'elementsTypes',
] as const;

export type NomTable = (typeof TABLES)[number];

export interface Sauvegarde {
	format: typeof FORMAT_SAUVEGARDE;
	version: number;
	exporteLe: string;
	donnees: Record<NomTable, Record<string, unknown>[]>;
}

export function creerSauvegarde(
	donnees: Partial<Record<NomTable, Record<string, unknown>[]>>,
	date: Date = new Date(),
): Sauvegarde {
	const complet = {} as Record<NomTable, Record<string, unknown>[]>;
	for (const t of TABLES) complet[t] = donnees[t] ?? [];
	return {
		format: FORMAT_SAUVEGARDE,
		version: VERSION_SCHEMA,
		exporteLe: date.toISOString(),
		donnees: complet,
	};
}

/** Lit et vérifie un fichier de sauvegarde. Lève une erreur explicite si le fichier n'est pas utilisable. */
export function lireSauvegarde(texte: string): Sauvegarde {
	let brut: unknown;
	try {
		brut = JSON.parse(texte);
	} catch {
		throw new Error("Le fichier n'est pas un JSON valide.");
	}
	if (typeof brut !== 'object' || brut === null) {
		throw new Error("Le fichier ne contient pas de sauvegarde.");
	}
	const s = brut as Partial<Sauvegarde>;
	if (s.format !== FORMAT_SAUVEGARDE) {
		throw new Error("Ce fichier n'est pas une sauvegarde Décompte BTP.");
	}
	if (typeof s.version !== 'number' || s.version > VERSION_SCHEMA) {
		throw new Error(
			`Sauvegarde trop récente (version ${String(s.version)}). Mettez l'application à jour.`,
		);
	}
	const donnees = (s.donnees ?? {}) as Partial<Record<NomTable, unknown>>;
	const complet = {} as Record<NomTable, Record<string, unknown>[]>;
	for (const t of TABLES) {
		const valeur = donnees[t];
		if (valeur !== undefined && !Array.isArray(valeur)) {
			throw new Error(`Donnée « ${t} » mal formée dans la sauvegarde.`);
		}
		complet[t] = (valeur ?? []) as Record<string, unknown>[];
	}
	return { format: FORMAT_SAUVEGARDE, version: s.version, exporteLe: String(s.exporteLe ?? ''), donnees: complet };
}
