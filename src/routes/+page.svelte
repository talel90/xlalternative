<script lang="ts">
	import { onMount } from 'svelte';
	import { listerMarches } from '$lib/db/depots';
	import type { MarcheRecord } from '$lib/db/schema';
	import { formatDecimal } from '$lib/core/nombres';

	let marches = $state<MarcheRecord[]>([]);
	let chargement = $state(true);

	onMount(async () => {
		marches = await listerMarches();
		chargement = false;
	});
</script>

<h1>Marchés</h1>

<a href="/marche/nouveau" class="bouton">+ Nouveau marché</a>

{#if chargement}
	<p>Chargement…</p>
{:else if marches.length === 0}
	<p>Aucun marché pour l'instant. Commencez par renseigner votre entreprise, puis créez un marché.</p>
{:else}
	<ul class="liste">
		{#each marches as m (m.id)}
			<li>
				<strong>Marché N°{m.numero}</strong> — {m.intitule}
				<div class="sous">Lot {m.lot} · {m.statut} · {formatDecimal(BigInt(m.montantMarcheTTC))} dt TTC</div>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.bouton {
		display: inline-block;
		margin-top: 0.75rem;
		padding: 0.6rem 1rem;
		background: #1e3a8a;
		color: #fff;
		border-radius: 0.4rem;
		text-decoration: none;
	}
	.liste {
		list-style: none;
		padding: 0;
	}
	.liste li {
		background: #fff;
		border: 1px solid #e5e7eb;
		border-radius: 0.4rem;
		padding: 0.75rem;
		margin-top: 0.5rem;
	}
	.sous {
		color: #6b7280;
		font-size: 0.9rem;
	}
</style>
