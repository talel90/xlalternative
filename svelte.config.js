import adapter from '@sveltejs/adapter-static';

// Sous-chemin de publication, ex. "/xlalternative" pour GitHub Pages. Vide en local.
const base = process.env.BASE_PATH ?? '';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({ fallback: 'index.html' }),
		paths: { base }
	}
};

export default config;
