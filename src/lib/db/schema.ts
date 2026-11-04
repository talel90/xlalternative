import Dexie, { type EntityTable } from 'dexie';
import type { Unite } from '../core/gabarits';

/**
 * Montants et quantités sont stockés en chaînes d'entiers (millimes / millièmes),
 * pour rester exacts et sérialisables dans la sauvegarde .json.
 */

export interface ProfilEntreprise {
	id: 'profil';
	nom: string;
	codeTVA: string;
	banque: string;
	rib: string;
	updatedAt: number;
}

export interface MarcheRecord {
	id: string;
	numero: string;
	lot: string;
	intitule: string;
	maitreOuvrage: string;
	commissariat: string;
	dateApprobation: string;
	montantMarcheTTC: string;
	tauxTVA: number;
	tauxRetenue: number;
	gestion: string;
	statut: 'brouillon' | 'actif' | 'clos';
	updatedAt: number;
}

export interface ArticleRecord {
	id: string;
	marcheId: string;
	ordre: number;
	code: string;
	designation: string;
	unite: Unite;
	qtePrevue: string;
	puHT: string;
	updatedAt: number;
}

export interface BibliothequeRecord {
	id: string;
	designation: string;
	unite: Unite;
	dernierPU: string;
	nbUtilisations: number;
	updatedAt: number;
}

export interface AttachementRecord {
	id: string;
	marcheId: string;
	numero: number;
	dateArrete: string;
	statut: 'brouillon' | 'valide';
	/** Résultats figés à la validation (JSON) */
	snapshot?: string;
	updatedAt: number;
}

/** Une ligne de métré. Dimensions en millièmes sous forme de chaînes. */
export interface LigneMetreRecord {
	id: string;
	attachementId: string;
	articleId: string;
	ordre: number;
	libelle: string;
	nbr: string;
	L?: string;
	l?: string;
	h?: string;
	kgml?: string;
	aDeduire?: string;
	updatedAt: number;
}

/** Élément type réutilisable (ex. P1 = poteau 0,25 × 0,25 × 2,50). */
export interface ElementTypeRecord {
	id: string;
	marcheId: string;
	code: string;
	libelle: string;
	L?: string;
	l?: string;
	h?: string;
	updatedAt: number;
}

class BtpDb extends Dexie {
	entreprise!: EntityTable<ProfilEntreprise, 'id'>;
	marches!: EntityTable<MarcheRecord, 'id'>;
	articles!: EntityTable<ArticleRecord, 'id'>;
	bibliotheque!: EntityTable<BibliothequeRecord, 'id'>;
	attachements!: EntityTable<AttachementRecord, 'id'>;
	lignesMetre!: EntityTable<LigneMetreRecord, 'id'>;
	elementsTypes!: EntityTable<ElementTypeRecord, 'id'>;

	constructor() {
		super('decompte-btp');
		this.version(1).stores({
			entreprise: 'id',
			marches: 'id, updatedAt',
			// Un code d'article est unique dans un marché.
			articles: 'id, marcheId, &[marcheId+code]',
			bibliotheque: 'id, &designation',
		});
		this.version(2).stores({
			attachements: 'id, marcheId, &[marcheId+numero]',
			lignesMetre: 'id, attachementId, articleId',
			elementsTypes: 'id, marcheId, &[marcheId+code]',
		});
	}
}

export const db = new BtpDb();
