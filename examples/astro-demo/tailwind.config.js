// tailwind.config.js
import thepiaPlugin from '@thepia/branding/tailwind/source';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{html,js,svelte,ts,astro}',
    './node_modules/@thepia/flows-auth/**/*.{js,svelte,ts}',
    './node_modules/@thepia/branding/**/*.{js,svelte,ts}'
  ],
  plugins: [thepiaPlugin]
};
