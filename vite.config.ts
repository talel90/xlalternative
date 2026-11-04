import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const base = process.env.BASE_PATH ?? '';

export default defineConfig({
	plugins: [
		sveltekit(),
		VitePWA({
			registerType: 'autoUpdate',
			base: `${base}/`,
			scope: `${base}/`,
			includeAssets: ['favicon.svg', 'robots.txt'],
			manifest: {
				name: 'Décompte BTP',
				short_name: 'Décompte BTP',
				description: 'Attachements, décomptes et certificats de paiement, hors ligne.',
				theme_color: '#1e3a8a',
				background_color: '#ffffff',
				display: 'standalone',
				start_url: `${base}/`,
				scope: `${base}/`,
				lang: 'fr',
				icons: [{ src: `${base}/favicon.svg`, sizes: 'any', type: 'image/svg+xml', purpose: 'any' }]
			},
			workbox: {
				// Précache complet, y compris les modules chargés à la demande (pdfmake, SheetJS).
				globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,json,txt}'],
				navigateFallback: `${base}/index.html`
			}
		})
	]
});
