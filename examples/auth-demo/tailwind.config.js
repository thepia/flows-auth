// tailwind.config.js
import thepiaPlugin from '@thepia/branding/tailwind/source';


/** @type {import('tailwindcss').Config} */
export default {
  content: [
    // Scan auth-demo app files for Tailwind classes
    './src/**/*.{html,js,svelte,ts}',

    // CRITICAL: Include flows-auth package files to ensure all component classes are built
    // Without this, Tailwind v4's auto-scanning won't find classes used in AuthButton,
    // EmailInput, and other flows-auth components, causing missing styles
    './node_modules/@thepia/flows-auth/**/*.{js,svelte,ts}',

    // Include branding package for any component classes
    './node_modules/@thepia/branding/**/*.{js,svelte,ts}'
  ],
  safelist: [
    // Ensure brand font classes are always generated
    'font-brand-lead',
    'font-brand-body',
    'font-brand-mono'
  ],
  plugins: [
    thepiaPlugin,
    // other plugins...
  ]
}
