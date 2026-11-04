import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	plugins: [
		sveltekit({
			adapter: adapter({ fallback: 'index.html' })
		}),
		VitePWA({
			registerType: 'autoUpdate',
			includeAssets: ['favicon.svg', 'robots.txt'],
			manifest: {
				name: 'Décompte BTP',
				short_name: 'Décompte BTP',
				description: 'Attachements, décomptes et certificats de paiement, hors ligne.',
				theme_color: '#1e3a8a',
				background_color: '#ffffff',
				display: 'standalone',
				start_url: '/',
				lang: 'fr',
				icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }]
			},
			workbox: {
				// Précache complet, y compris les modules chargés à la demande (pdfmake, SheetJS).
				globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,json,txt}'],
				navigateFallback: '/index.html'
			}
		})
	]
});
