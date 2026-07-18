import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync
} from 'node:fs';
import { join, resolve } from 'node:path';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import sveltePreprocess from 'svelte-preprocess';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { preprocessSvelteSource } from './scripts/preprocess-svelte';

// preprocessSvelteSource (imported above) strips TS + lang="ts" from .svelte on
// the way to dist/src so consumers can compile the shipped source without their
// own preprocessor. Shared with the dist/src sync test.

// Helper function to recursively copy directory (async: .svelte files are
// preprocessed on the way out — see preprocessSvelteSource).
async function copyDirRecursive(src: string, dest: string) {
  if (!existsSync(src)) return;

  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    // Skip .gitignore files to prevent pnpm from ignoring package contents
    if (entry.name === '.gitignore') {
      continue;
    }

    if (entry.isDirectory()) {
      await copyDirRecursive(srcPath, destPath);
    } else if (entry.name.endsWith('.svelte')) {
      // Ship a TS-free, consumer-compilable component.
      const out = await preprocessSvelteSource(readFileSync(srcPath, 'utf8'), srcPath);
      // Skip the write if unchanged (compare against the *preprocessed* result),
      // so `build:watch` doesn't churn mtimes and flood consumer file watchers.
      if (existsSync(destPath) && readFileSync(destPath, 'utf8') === out) {
        continue;
      }
      writeFileSync(destPath, out, 'utf8');
    } else {
      // Skip the write if content is unchanged, so `build:watch` doesn't
      // touch every file's mtime on every rebuild — that floods consumers'
      // dev-server file watchers (e.g. astro-demo running build:watch
      // alongside `astro dev`) with spurious change events for the whole
      // tree and can trigger HMR re-transform races.
      if (existsSync(destPath) && readFileSync(destPath).equals(readFileSync(srcPath))) {
        continue;
      }
      copyFileSync(srcPath, destPath);
    }
  }
}

// Custom plugin to fix .d.ts imports for Deno compatibility
function fixDtsImports() {
  return {
    name: 'fix-dts-imports',
    writeBundle() {
      const distDir = resolve(__dirname, 'dist');
      const dtsFiles: string[] = [];

      // Find all .d.ts files
      function findDtsFiles(dir: string) {
        if (!existsSync(dir)) return;
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = join(dir, entry.name);
          if (entry.isDirectory()) {
            findDtsFiles(fullPath);
          } else if (entry.name.endsWith('.d.ts')) {
            dtsFiles.push(fullPath);
          }
        }
      }

      findDtsFiles(distDir);

      // Fix imports in each .d.ts file
      for (const filePath of dtsFiles) {
        let content = readFileSync(filePath, 'utf-8');
        // Add .d.ts extension to relative imports that don't have it
        content = content.replace(/from ['"](\.[^'"]+?)(?<!\.d\.ts)['"];/g, "from '$1.d.ts';");
        writeFileSync(filePath, content, 'utf-8');
      }

      console.log(`✅ Fixed imports in ${dtsFiles.length} .d.ts files for Deno compatibility`);
    }
  };
}

// Custom plugin to copy source files to dist/src for source imports
function copySourceFiles() {
  return {
    name: 'copy-source-files',
    async writeBundle() {
      const srcDir = resolve(__dirname, 'src');
      const distSrcDir = resolve(__dirname, 'dist/src');

      console.log('📦 Copying source files to dist/src (preprocessing .svelte to strip TS)...');

      // Copy entire src directory to dist/src
      await copyDirRecursive(srcDir, distSrcDir);

      console.log('✅ Copied all source files to dist/src');

      // Also copy to dist/paraglide for backward compatibility
      const paraglideSrc = resolve(__dirname, 'src/paraglide');
      const paraglideDistRoot = resolve(__dirname, 'dist/paraglide');

      if (existsSync(paraglideSrc)) {
        await copyDirRecursive(paraglideSrc, paraglideDistRoot);
        console.log('✅ Copied Paraglide files to dist/paraglide');
      }
    }
  };
}

export default defineConfig({
  plugins: [
    // Paraglide plugin - automatically compiles translations during build
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide',
      // src/paraglide is committed to the repo, so don't emit the auto-generated
      // .gitignore (which ignores '*' and would keep the output untracked).
      emitGitIgnore: false,
      // Pin the output layout. paraglideVitePlugin takes CompilerOptions directly,
      // so outputStructure is a TOP-LEVEL option (there is no `compilerOptions`
      // wrapper — nesting it is silently ignored). Paraglide 2.4.0 defaults to
      // "message-modules" (a barrel of per-message files, no per-locale
      // en.js/da.js), but the committed src/paraglide and the package.json exports
      // assume "locale-modules" (messages/_index.js with inline functions +
      // en.js/da.js). Without this pin the layout drifts by environment and breaks
      // tests/package/paraglide-build-verification.
      outputStructure: 'locale-modules'
    }),
    svelte({
      preprocess: sveltePreprocess(),
      compilerOptions: {
        dev: false
      },
      emitCss: true
    }),
    dts({
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'tests/**/*']
    }),
    fixDtsImports(),
    copySourceFiles()
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ThepiaAuthLibrary',
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: ['svelte', 'svelte/store', 'd3'],
      output: {
        assetFileNames: 'flows-auth.[ext]',
        globals: {
          svelte: 'Svelte',
          'svelte/store': 'SvelteStore',
          d3: 'D3'
        }
      },
      // Suppress dynamic import warnings for modules that are both statically and dynamically imported
      onwarn(warning, warn) {
        // Skip certain warnings
        if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return;

        // Skip dynamic import warnings for specific modules we know about
        if (
          warning.message?.includes('dynamically imported') &&
          (warning.message.includes('webauthn') ||
            warning.message.includes('sessionManager') ||
            warning.message.includes('invitation-tokens') ||
            warning.message.includes('telemetry') ||
            warning.message.includes('api-detection'))
        ) {
          return;
        }

        // Use default for everything else
        warn(warning);
      }
    },
    sourcemap: true,
    target: 'es2020',
    minify: 'esbuild', // Strip comments and minify dist builds
    // Vite's default emptyOutDir wipes dist/ at the start of every build,
    // including every `build:watch` rebuild cycle - combined with
    // copySourceFiles() that means the whole dist/src tree gets deleted and
    // recreated on every rebuild regardless of what changed, flooding
    // consumers' dev-server file watchers (e.g. astro-demo running
    // build:watch alongside `astro dev`) and triggering HMR re-transform
    // races. copySourceFiles()'s content-comparison skip only helps once
    // dist/ is allowed to persist across builds.
    emptyOutDir: false
  }
});
