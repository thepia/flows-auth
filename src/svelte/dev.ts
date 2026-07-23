/**
 * Development-only exports for @thepia/flows-auth
 *
 * These components have heavy dependencies (like @xyflow/svelte) and are only
 * intended for use in demo/development applications, NOT production apps.
 *
 * Import from: @thepia/flows-auth/dev
 *
 * Example:
 * ```typescript
 * import { SessionStateMachineFlow } from '@thepia/flows-auth/dev';
 * ```
 */

// Flow visualization components (require @xyflow/svelte)
export { default as SessionStateMachineFlow } from './components/SessionStateMachineFlow.svelte';
export { default as SignInStateMachineFlow } from './components/SignInStateMachineFlow.svelte';
export { default as TestFlow } from './components/TestFlow.svelte';
