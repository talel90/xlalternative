<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { chargerContexte, type ContexteDocuments } from '$lib/db/serie-depots';
	import { dossierSituation } from '$lib/pdf/documents';
	import { formatDecimal } from '$lib/core/nombres';
	import type { Situation } from '$lib/core/serie';

	const marcheId = $derived(page.params.id ?? '');
	const numero = $derived(Number(page.params.n));

	let contexte = $state<ContexteDocuments | undefined>();
	let situation = $derived<Situation | undefined>(contexte?.situations.find((s) => s.numero === numero));
	let chargement = $state(true);
	let exportEnCours = $state(false);
	let erreur = $state('');

	onMount(async () => {
		contexte = await chargerContexte(marcheId);
		chargement = false;
	});

	async function exporterPdf() {
		if (!contexte) return;
		const definition = dossierSituation(contexte, numero);
		if (!definition) return;
		exportEnCours = true;
		erreur = '';
		try {
			const { telechargerPdf } = await import('$lib/pdf/generer');
			await telechargerPdf(definition, `Attachement-${contexte.marche.numero}-N${numero}.pdf`);
		} catch (e) {
			erreur = `Export impossible : ${e instanceof Error ? e.message : String(e)}`;
		} finally {
			exportEnCours = false;
		}
	}
</script>

{#if chargement}
	<p>Calcul des documents…</p>
{:else if !contexte || !situation}
	<p class="erreur">Attachement introuvable.</p>
	<a href={`/marche/${marcheId}`}>Retour au marché</a>
{:else}
	<a href={`/marche/${marcheId}/attachement/${numero}`}>← Saisie du métré</a>
	<h1>Documents — Attachement N°{numero}</h1>
	<p class="sous">Arrêté au {situation.dateArrete}. Les documents sont calculés à partir du métré saisi.</p>

	<button type="button" onclick={exporterPdf} disabled={exportEnCours}>
		{exportEnCours ? 'Génération…' : 'Télécharger le PDF du dossier'}
	</button>
	{#if erreur}<p class="erreur">{erreur}</p>{/if}

	<h2>Attachement</h2>
	<table>
		<thead><tr><th>Art.</th><th>Désignation</th><th>U</th><th>Prévu</th><th>Préc.</th><th>Mois</th><th>Cumul</th><th>Écart</th></tr></thead>
		<tbody>
			{#each situation.attachement as l (l.code)}
				<tr>
					<td>{l.code}</td><td>{l.designation}</td><td>{l.unite}</td>
					<td>{formatDecimal(l.qtePrevue)}</td><td>{formatDecimal(l.precedent)}</td>
					<td>{formatDecimal(l.duMois)}</td><td>{formatDecimal(l.cumul)}</td>
					<td class={l.ecart > 0n ? 'erreur' : ''}>{formatDecimal(l.ecart)}</td>
				</tr>
			{/each}
		</tbody>
	</table>

	<h2>Décompte provisoire</h2>
	<table>
		<thead><tr><th>Art.</th><th>Désignation</th><th>Cumul</th><th>PU HT</th><th>Montant HT</th></tr></thead>
		<tbody>
			{#each situation.decompte.lignes as l (l.code)}
				<tr><td>{l.code}</td><td>{l.designation}</td><td>{formatDecimal(l.cumul)}</td><td>{formatDecimal(l.puHT)}</td><td>{formatDecimal(l.montantHT)}</td></tr>
			{/each}
			<tr><td></td><td><strong>Total HTVA</strong></td><td colspan="2"></td><td>{formatDecimal(situation.decompte.htva)}</td></tr>
			<tr><td></td><td>T.V.A. {contexte.marche.tauxTVA}%</td><td colspan="2"></td><td>{formatDecimal(situation.decompte.tva)}</td></tr>
			<tr><td></td><td><strong>Total TTC</strong></td><td colspan="2"></td><td>{formatDecimal(situation.decompte.ttc)}</td></tr>
		</tbody>
	</table>

	<h2>Récapitulation et certificat</h2>
	<table>
		<tbody>
			<tr><td>Total TTC</td><td>{formatDecimal(situation.recapitulation.ttc)}</td></tr>
			<tr><td>Retenue de garantie ({contexte.marche.tauxRetenue}%)</td><td>{formatDecimal(situation.recapitulation.retenue)}</td></tr>
			<tr><td>Déjà payé (acomptes antérieurs)</td><td>{formatDecimal(situation.recapitulation.acomptesAnterieurs)}</td></tr>
			<tr><td><strong>Reste à payer</strong></td><td><strong>{formatDecimal(situation.recapitulation.resteAPayer)}</strong></td></tr>
		</tbody>
	</table>
	<p>Arrêté à la somme de : <em>{situation.enLettres}</em></p>
{/if}

<style>
	.sous {
		color: #6b7280;
		font-size: 0.9rem;
	}
	.erreur {
		color: #b91c1c;
	}
	h2 {
		margin-top: 1.5rem;
		font-size: 1.05rem;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.82rem;
	}
	th,
	td {
		border-bottom: 1px solid #e5e7eb;
		padding: 0.3rem;
		text-align: left;
	}
</style>
