<script lang="ts">
	import { onMount } from 'svelte';
	import { registerSW } from 'virtual:pwa-register';

	let { children } = $props();

	onMount(() => {
		// Enregistre le service worker : l'application fonctionne ensuite hors ligne.
		registerSW({ immediate: true });
	});
</script>

<svelte:head>
	<meta name="theme-color" content="#1e3a8a" />
</svelte:head>

{@render children()}
