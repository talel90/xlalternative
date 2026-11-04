import { describe, expect, it } from 'vitest';
import {
	FORMAT_SAUVEGARDE,
	VERSION_SCHEMA,
	creerSauvegarde,
	lireSauvegarde,
} from '../src/lib/sauvegarde/format';

describe('sauvegarde', () => {
	it('aller-retour : export puis lecture restitue les données', () => {
		const s = creerSauvegarde(
			{ marches: [{ id: 'm1', numero: '12/2025' }] },
			new Date('2026-11-04T10:00:00Z'),
		);
		const relue = lireSauvegarde(JSON.stringify(s));
		expect(relue.format).toBe(FORMAT_SAUVEGARDE);
		expect(relue.version).toBe(VERSION_SCHEMA);
		expect(relue.donnees.marches).toEqual([{ id: 'm1', numero: '12/2025' }]);
		expect(relue.donnees.lignesMetre).toEqual([]);
	});

	it('refuse un fichier qui n’est pas une sauvegarde', () => {
		expect(() => lireSauvegarde('{"autre": 1}')).toThrow('pas une sauvegarde');
	});

	it('refuse un JSON invalide', () => {
		expect(() => lireSauvegarde('{pas du json')).toThrow('JSON valide');
	});

	it('refuse une sauvegarde plus récente que l’application', () => {
		const s = { format: FORMAT_SAUVEGARDE, version: VERSION_SCHEMA + 1, donnees: {} };
		expect(() => lireSauvegarde(JSON.stringify(s))).toThrow('trop récente');
	});

	it('refuse une table mal formée', () => {
		const s = { format: FORMAT_SAUVEGARDE, version: VERSION_SCHEMA, donnees: { marches: 'oups' } };
		expect(() => lireSauvegarde(JSON.stringify(s))).toThrow('marches');
	});
});
