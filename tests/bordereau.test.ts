import { describe, expect, it } from 'vitest';
import {
	detecterColonnes,
	importerDepuisTexte,
	normaliserUnite,
	parseCollage,
} from '../src/lib/import/bordereau';

const COLLAGE_AVEC_ENTETE = [
	'N°\tDésignation des ouvrages\tUnité\tQuantités prévues\tPrix unitaire HT',
	'A\tDémolition d\'une clôture existante\tml\t180,000\t60,000',
	'B-1\tFouille en puits\tm³\t70,000\t50,000',
	'C-4\tBéton armé en fondation\tm³\t23,000\t1 150,000',
	'E\tEnduit\tm²\t760,000\t24,000',
].join('\n');

describe('parseCollage', () => {
	it('découpe en lignes et cellules, ignore les lignes vides', () => {
		const lignes = parseCollage('a\tb\n\nc\td\r\n');
		expect(lignes).toEqual([
			['a', 'b'],
			['c', 'd'],
		]);
	});
});

describe('normaliserUnite', () => {
	it('reconnaît les variantes d’écriture', () => {
		expect(normaliserUnite('ml')).toBe('ml');
		expect(normaliserUnite('m²')).toBe('m2');
		expect(normaliserUnite('m³')).toBe('m3');
		expect(normaliserUnite('M3')).toBe('m3');
		expect(normaliserUnite('Ens')).toBe('U');
		expect(normaliserUnite('forfait')).toBe('U');
		expect(normaliserUnite('kg')).toBe('kg');
	});
	it('renvoie null pour une unité inconnue', () => {
		expect(normaliserUnite('tonne')).toBeNull();
	});
});

describe('detecterColonnes', () => {
	it('trouve les colonnes depuis l’en-tête, même avec accents et variantes', () => {
		const lignes = parseCollage(COLLAGE_AVEC_ENTETE);
		expect(detecterColonnes(lignes)).toEqual({
			code: 0,
			designation: 1,
			unite: 2,
			quantite: 3,
			prix: 4,
		});
	});
	it('renvoie null sans en-tête reconnaissable', () => {
		expect(detecterColonnes([['x', 'y', 'z']])).toBeNull();
	});
});

describe('importerDepuisTexte', () => {
	it('importe les articles avec quantité et prix exacts en millièmes et millimes', () => {
		const resultat = importerDepuisTexte(COLLAGE_AVEC_ENTETE);
		if ('erreur' in resultat) throw new Error(resultat.erreur);

		expect(resultat.erreurs).toEqual([]);
		expect(resultat.articles).toHaveLength(4);
		expect(resultat.articles[0]).toMatchObject({
			code: 'A',
			unite: 'ml',
			qtePrevue: 180000n,
			puHT: 60000n,
		});
		expect(resultat.articles[2]).toMatchObject({
			code: 'C-4',
			unite: 'm3',
			qtePrevue: 23000n,
			puHT: 1150000n,
		});
	});

	it('signale une ligne avec unité inconnue sans bloquer les autres', () => {
		const texte = [
			'Désignation\tUnité\tQté\tPU',
			'Enduit\tm²\t10\t24',
			'Divers\tbidule\t1\t5',
		].join('\n');
		const resultat = importerDepuisTexte(texte);
		if ('erreur' in resultat) throw new Error(resultat.erreur);

		expect(resultat.articles.map((a) => a.designation)).toEqual(['Enduit']);
		expect(resultat.erreurs).toHaveLength(1);
		expect(resultat.erreurs[0].message).toContain('bidule');
	});

	it('ignore les titres et les lignes sans quantité ni prix', () => {
		const texte = [
			'Désignation\tUnité\tQté\tPU',
			'LOT GENIE CIVIL\t\t\t',
			'Enduit\tm²\t10\t24',
		].join('\n');
		const resultat = importerDepuisTexte(texte);
		if ('erreur' in resultat) throw new Error(resultat.erreur);
		expect(resultat.articles.map((a) => a.designation)).toEqual(['Enduit']);
		expect(resultat.erreurs).toEqual([]);
	});

	it('renvoie une erreur si l’en-tête est absent', () => {
		expect(importerDepuisTexte('a\tb\n1\t2')).toHaveProperty('erreur');
	});
});
