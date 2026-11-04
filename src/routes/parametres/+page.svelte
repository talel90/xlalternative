<script lang="ts">
	import { onMount } from 'svelte';
	import { lireProfil, sauverProfil } from '$lib/db/depots';
	import { exporterTout, importerTout, telechargerSauvegarde } from '$lib/db/sauvegarde-depots';
	import { lireSauvegarde } from '$lib/sauvegarde/format';

	let nom = $state('');
	let codeTVA = $state('');
	let banque = $state('');
	let rib = $state('');
	let message = $state('');
	let erreur = $state('');

	onMount(async () => {
		const p = await lireProfil();
		if (p) {
			nom = p.nom;
			codeTVA = p.codeTVA;
			banque = p.banque;
			rib = p.rib;
		}
	});

	async function enregistrer(e: SubmitEvent) {
		e.preventDefault();
		await sauverProfil({ nom: nom.trim(), codeTVA: codeTVA.trim(), banque: banque.trim(), rib: rib.trim() });
		message = 'Profil enregistré.';
	}

	async function exporter() {
		erreur = '';
		try {
			telechargerSauvegarde(await exporterTout());
			message = 'Sauvegarde téléchargée. Conservez-la hors de cet appareil (WhatsApp, e-mail, clé USB).';
		} catch (e) {
			erreur = `Export impossible : ${e instanceof Error ? e.message : String(e)}`;
		}
	}

	async function importer(e: Event) {
		erreur = '';
		message = '';
		const fichier = (e.target as HTMLInputElement).files?.[0];
		if (!fichier) return;
		if (!window.confirm('L’import remplace TOUTES les données de cet appareil. Continuer ?')) {
			(e.target as HTMLInputElement).value = '';
			return;
		}
		try {
			const sauvegarde = lireSauvegarde(await fichier.text());
			await importerTout(sauvegarde);
			message = 'Sauvegarde restaurée.';
			const p = await lireProfil();
			nom = p?.nom ?? '';
			codeTVA = p?.codeTVA ?? '';
			banque = p?.banque ?? '';
			rib = p?.rib ?? '';
		} catch (err) {
			erreur = err instanceof Error ? err.message : String(err);
		} finally {
			(e.target as HTMLInputElement).value = '';
		}
	}
</script>

<h1>Votre entreprise</h1>
<p>Renseignée une seule fois. Elle apparaît sur tous les documents.</p>

<form onsubmit={enregistrer}>
	<label>Nom de la société <input bind:value={nom} required /></label>
	<label>Code TVA <input bind:value={codeTVA} /></label>
	<label>Banque <input bind:value={banque} /></label>
	<label>RIB / n° de compte <input bind:value={rib} /></label>
	<button type="submit">Enregistrer</button>
</form>

<h2>Sauvegarde</h2>
<p>Toutes les données sont sur cet appareil. Exportez une sauvegarde après chaque validation d'attachement.</p>
<button type="button" onclick={exporter}>Exporter une sauvegarde</button>

<label>Restaurer une sauvegarde (.json)
	<input type="file" accept=".json,application/json" onchange={importer} />
</label>

{#if message}<p class="ok">{message}</p>{/if}
{#if erreur}<p class="erreur">{erreur}</p>{/if}

<style>
	h2 {
		margin-top: 2rem;
		font-size: 1.1rem;
	}
	.ok {
		color: #15803d;
	}
	.erreur {
		color: #b91c1c;
	}
</style>
