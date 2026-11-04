import { formatDecimal } from '../core/nombres';
import type { Situation } from '../core/serie';
import type { ContexteDocuments } from '../db/serie-depots';

/**
 * Définitions pdfmake des documents d'une situation.
 * Un seul fichier PDF regroupe : métré (résumé), attachement, décompte, récapitulation, certificat.
 */

type Bloc = Record<string, unknown>;

function enteteProjet(ctx: ContexteDocuments, titre: string, situation: Situation): Bloc[] {
	const { marche, profil } = ctx;
	return [
		{ text: 'RÉPUBLIQUE TUNISIENNE — MINISTÈRE DE L’ÉDUCATION', style: 'petit' },
		{ text: titre, style: 'titre', margin: [0, 8, 0, 4] },
		{
			text: [
				`Projet : ${marche.intitule}\n`,
				`Marché N°${marche.numero} — Lot ${marche.lot}\n`,
				`Entreprise : ${profil?.nom ?? '—'}\n`,
				`Attachement N°${situation.numero} arrêté au ${situation.dateArrete}`,
			],
			margin: [0, 0, 0, 10],
		},
	];
}

function tableau(entetes: string[], lignes: string[][], largeurs: (string | number)[]): Bloc {
	return {
		table: {
			headerRows: 1,
			widths: largeurs,
			body: [entetes.map((t) => ({ text: t, style: 'entete' })), ...lignes],
		},
		layout: 'lightHorizontalLines',
		fontSize: 8,
	};
}

function attachementBloc(ctx: ContexteDocuments, s: Situation): Bloc[] {
	const lignes = s.attachement.map((l) => [
		l.code,
		l.designation,
		l.unite,
		formatDecimal(l.qtePrevue),
		formatDecimal(l.precedent),
		formatDecimal(l.duMois),
		formatDecimal(l.cumul),
		formatDecimal(l.ecart),
	]);
	return [
		...enteteProjet(ctx, 'ÉTAT D’ATTACHEMENT', s),
		tableau(
			['Art.', 'Désignation', 'U', 'Qté prévue', 'Précédent', 'Du mois', 'Cumul', 'Écart'],
			lignes,
			['auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
		),
	];
}

function decompteBloc(ctx: ContexteDocuments, s: Situation): Bloc[] {
	const d = s.decompte;
	const lignes = d.lignes.map((l) => [
		l.code,
		l.designation,
		formatDecimal(l.cumul),
		formatDecimal(l.puHT),
		formatDecimal(l.montantHT),
	]);
	const tauxTVA = ctx.marche.tauxTVA;
	lignes.push(['', { text: 'Total HTVA', bold: true } as unknown as string, '', '', formatDecimal(d.htva)]);
	lignes.push(['', `T.V.A. ${tauxTVA}%`, '', '', formatDecimal(d.tva)]);
	lignes.push(['', { text: 'Total TTC', bold: true } as unknown as string, '', '', formatDecimal(d.ttc)]);

	return [
		{ text: '', pageBreak: 'before' },
		...enteteProjet(ctx, 'DÉCOMPTE PROVISOIRE', s),
		tableau(['Art.', 'Désignation', 'Quantité', 'PU HT', 'Montant HT'], lignes, ['auto', '*', 'auto', 'auto', 'auto']),
	];
}

function recapitulationBloc(ctx: ContexteDocuments, s: Situation): Bloc[] {
	const r = s.recapitulation;
	return [
		{ text: '', pageBreak: 'before' },
		...enteteProjet(ctx, 'RÉCAPITULATION', s),
		tableau(
			['Dépenses faites (TTC)', 'Retenue de garantie', 'Déjà payé', 'Reste à payer'],
			[[formatDecimal(r.ttc), formatDecimal(r.retenue), formatDecimal(r.acomptesAnterieurs), formatDecimal(r.resteAPayer)]],
			['*', '*', '*', '*'],
		),
	];
}

function certificatBloc(ctx: ContexteDocuments, s: Situation): Bloc[] {
	const r = s.recapitulation;
	const p = ctx.profil;
	return [
		{ text: '', pageBreak: 'before' },
		...enteteProjet(ctx, 'CERTIFICAT POUR PAIEMENT', s),
		{
			text: [
				`Le marché approuvé au profit de ${p?.nom ?? '—'} pour l’exécution des travaux est certifié.\n\n`,
				`Montant à payer : ${formatDecimal(r.resteAPayer)} dt\n`,
				`Arrêté à la somme de : ${s.enLettres}\n\n`,
				`Paiement au compte : ${p?.banque ?? ''} — ${p?.rib ?? ''}\n`,
				p?.codeTVA ? `Code TVA : ${p.codeTVA}\n` : '',
			],
			lineHeight: 1.3,
		},
	];
}

/** Définition complète du dossier PDF d'une situation. */
export function dossierSituation(ctx: ContexteDocuments, numero: number): Record<string, unknown> | undefined {
	const s = ctx.situations.find((x) => x.numero === numero);
	if (!s) return undefined;

	return {
		pageSize: 'A4',
		pageMargins: [40, 40, 40, 40],
		defaultStyle: { fontSize: 9 },
		styles: {
			titre: { fontSize: 13, bold: true, alignment: 'center' },
			petit: { fontSize: 7, color: '#555555' },
			entete: { bold: true, fillColor: '#eeeeee' },
		},
		content: [
			...attachementBloc(ctx, s),
			...decompteBloc(ctx, s),
			...recapitulationBloc(ctx, s),
			...certificatBloc(ctx, s),
		],
	};
}
