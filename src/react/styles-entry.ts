/**
 * CSS aggregator for the React component port, consumed by `vite.css.config.mjs` as a
 * second build-lib entry point (alongside the existing Svelte entry) so both targets'
 * component styles land in the single shared `dist/flows-auth.css` (`./style.css` export).
 *
 * Not part of the `./react` (tsup) JS bundle -- see `scripts/build.mjs`'s CSS-only pass
 * for how this file is actually consumed, and the Phase C report for why the styles are
 * merged into one shared stylesheet rather than shipped separately per target: the visual
 * design is intentionally identical between the Svelte and React components (same class
 * names throughout), so one stylesheet serving both avoids consumers having to reason
 * about which target's CSS file to import.
 *
 * Each `.tsx` component also imports its own CSS directly (e.g. `import
 * './AuthButton.css'`), so components remain self-sufficient for consumers who bundle
 * from source (e.g. a workspace-linked example app) rather than only from `dist/`.
 */
import './components/shared.css';
import './components/core/AuthStateMessage.css';
import './components/core/AuthButton.css';
import './components/core/EmailInput.css';
import './components/core/CodeInput.css';
import './components/core/PinEntryStep.css';
import './components/core/AuthNewUserInfo.css';
import './components/core/AuthExplainer.css';
import './components/core/SignInCore.css';
import './components/SignInForm.css';
