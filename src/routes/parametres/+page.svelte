<script lang="ts">
	import { onMount } from 'svelte';
	import { lireProfil, sauverProfil } from '$lib/db/depots';

	let nom = $state('');
	let codeTVA = $state('');
	let banque = $state('');
	let rib = $state('');
	let message = $state('');

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

{#if message}<p class="ok">{message}</p>{/if}
