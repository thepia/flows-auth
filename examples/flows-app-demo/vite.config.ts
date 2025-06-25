import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	ssr: {
		noExternal: ['@thepia/flows-auth']
	},
	optimizeDeps: {
		include: ['@thepia/flows-auth']
	},
	server: {
		host: 'dev.thepia.net',
		port: 5175,
		https: {
			key: './certs/dev.thepia.net-key.pem',
			cert: './certs/dev.thepia.net.crt'
		}
	}
});