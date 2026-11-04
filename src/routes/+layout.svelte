<script lang="ts">
	import { onMount } from 'svelte';
	import { registerSW } from 'virtual:pwa-register';
	import { demanderStockageDurable } from '$lib/db/depots';

	let { children } = $props();

	onMount(() => {
		// Service worker : l'application fonctionne ensuite hors ligne.
		registerSW({ immediate: true });
		// Évite que le navigateur vide les données locales (marchés, métrés).
		void demanderStockageDurable();
	});
</script>

<svelte:head>
	<meta name="theme-color" content="#1e3a8a" />
</svelte:head>

<header class="nav">
	<a href="/" class="brand">Décompte BTP</a>
	<nav>
		<a href="/">Marchés</a>
		<a href="/parametres">Entreprise</a>
	</nav>
</header>

<div class="page">
	{@render children()}
</div>

<style>
	:global(body) {
		margin: 0;
		font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
		color: #111827;
		background: #f9fafb;
	}
	.nav {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		background: #1e3a8a;
		color: #fff;
	}
	.nav a {
		color: #fff;
		text-decoration: none;
		margin-left: 1rem;
	}
	.brand {
		font-weight: 700;
		margin-left: 0 !important;
	}
	.page {
		max-width: 44rem;
		margin: 0 auto;
		padding: 1rem;
	}
	:global(.page label) {
		display: block;
		margin-top: 0.75rem;
		font-weight: 600;
	}
	:global(.page input, .page textarea) {
		width: 100%;
		box-sizing: border-box;
		padding: 0.6rem;
		margin-top: 0.25rem;
		font-size: 1rem;
		border: 1px solid #d1d5db;
		border-radius: 0.4rem;
	}
	:global(.page button) {
		margin-top: 1rem;
		padding: 0.7rem 1.2rem;
		font-size: 1rem;
		background: #1e3a8a;
		color: #fff;
		border: none;
		border-radius: 0.4rem;
		cursor: pointer;
	}
	:global(.page button:disabled) {
		opacity: 0.5;
	}
	:global(.page table) {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
		margin-top: 0.5rem;
	}
	:global(.page th, .page td) {
		border-bottom: 1px solid #e5e7eb;
		padding: 0.35rem;
		text-align: left;
	}
	:global(.page .erreur) {
		color: #b91c1c;
	}
	:global(.page .ok) {
		color: #15803d;
	}
</style>
