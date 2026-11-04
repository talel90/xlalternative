<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { lireMarche } from '$lib/db/depots';
	import {
		creerAttachement,
		creerElement,
		listerAttachements,
		listerElements,
		supprimerElement,
	} from '$lib/db/metre-depots';
	import type { AttachementRecord, ElementTypeRecord, MarcheRecord } from '$lib/db/schema';
	import { formatDecimal } from '$lib/core/nombres';

	const id = $derived(page.params.id ?? '');

	let marche = $state<MarcheRecord | undefined>();
	let attachements = $state<AttachementRecord[]>([]);
	let elements = $state<ElementTypeRecord[]>([]);
	let chargement = $state(true);

	let dateArrete = $state(new Date().toISOString().slice(0, 10));
	let elCode = $state('');
	let elLibelle = $state('');
	let elL = $state('');
	let ell = $state('');
	let elh = $state('');

	async function recharger() {
		marche = await lireMarche(id);
		attachements = await listerAttachements(id);
		elements = await listerElements(id);
	}

	onMount(async () => {
		await recharger();
		chargement = false;
	});

	async function nouvelAttachement() {
		await creerAttachement(id, dateArrete);
		await recharger();
	}

	async function ajouterElement() {
		const { lireDimension } = await import('$lib/db/metre-depots');
		await creerElement(id, {
			code: elCode.trim().toUpperCase(),
			libelle: elLibelle.trim(),
			L: lireDimension(elL),
			l: lireDimension(ell),
			h: lireDimension(elh),
		});
		elCode = elLibelle = elL = ell = elh = '';
		await recharger();
	}

	async function retirerElement(e: ElementTypeRecord) {
		await supprimerElement(e.id);
		await recharger();
	}
</script>

{#if chargement}
	<p>Chargement…</p>
{:else if !marche}
	<p class="erreur">Marché introuvable.</p>
	<a href="/">Retour aux marchés</a>
{:else}
	<h1>Marché N°{marche.numero}</h1>
	<p>{marche.intitule} — lot {marche.lot}</p>

	<h2>Attachements</h2>
	{#if attachements.length === 0}
		<p>Aucun attachement pour l'instant.</p>
	{:else}
		<ul class="liste">
			{#each attachements as a (a.id)}
				<li>
					<a href={`/marche/${id}/attachement/${a.numero}`}>Attachement N°{a.numero}</a>
					<span class="sous">du {a.dateArrete} · {a.statut}</span>
				</li>
			{/each}
		</ul>
	{/if}

	<div class="nouveau">
		<label>Date d'arrêté <input type="date" bind:value={dateArrete} /></label>
		<button type="button" onclick={nouvelAttachement}>+ Nouvel attachement</button>
	</div>

	<h2>Éléments types</h2>
	<p class="sous">Définissez une fois les éléments qui se répètent (poteau, semelle, longrine). Dans le métré, il suffit d'écrire « P1 × 24 ».</p>

	{#if elements.length > 0}
		<ul class="liste">
			{#each elements as e (e.id)}
				<li>
					<strong>{e.code}</strong> {e.libelle}
					<span class="sous">
						{#if e.L}L {formatDecimal(BigInt(e.L))}{/if}
						{#if e.l} · l {formatDecimal(BigInt(e.l))}{/if}
						{#if e.h} · H {formatDecimal(BigInt(e.h))}{/if}
					</span>
					<button type="button" class="secondaire" onclick={() => retirerElement(e)}>Supprimer</button>
				</li>
			{/each}
		</ul>
	{/if}

	<div class="grille">
		<label>Code <input bind:value={elCode} placeholder="P1" /></label>
		<label>Libellé <input bind:value={elLibelle} placeholder="Poteau" /></label>
		<label>Longueur <input bind:value={elL} inputmode="decimal" /></label>
		<label>Largeur <input bind:value={ell} inputmode="decimal" /></label>
		<label>Hauteur <input bind:value={elh} inputmode="decimal" /></label>
	</div>
	<button type="button" onclick={ajouterElement} disabled={elCode.trim() === '' || elLibelle.trim() === ''}>
		Ajouter l'élément type
	</button>
{/if}

<style>
	.liste {
		list-style: none;
		padding: 0;
	}
	.liste li {
		background: #fff;
		border: 1px solid #e5e7eb;
		border-radius: 0.4rem;
		padding: 0.6rem;
		margin-top: 0.4rem;
	}
	.sous {
		color: #6b7280;
		font-size: 0.9rem;
	}
	.nouveau {
		margin-top: 1rem;
	}
	.grille {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
	}
	.secondaire {
		background: #e5e7eb !important;
		color: #111827 !important;
		margin-top: 0 !important;
		padding: 0.3rem 0.6rem !important;
		font-size: 0.85rem !important;
		margin-left: 0.5rem;
	}
	.erreur {
		color: #b91c1c;
	}
</style>
