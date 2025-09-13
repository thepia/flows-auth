# Svelte 5 Migration Plan for flows-auth

## Migration Status: 🟡 READY TO PROCEED

**Date**: September 14, 2025  
**Prepared by**: Claude Code Analysis  
**Target Version**: Svelte 5.x (from Svelte 4.x)

## Executive Summary

flows-auth is ready to migrate to Svelte 5. The broader ecosystem compatibility issues that made this migration "not viable in early 2025" have been resolved. Both Astro 5 and @astrojs/svelte v7.1.1 now provide stable Svelte 5 support.

## Migration Prerequisites ✅

### Framework Compatibility
- ✅ **Svelte 5**: Stable since October 22, 2024
- ✅ **@astrojs/svelte**: v7.1.1 with full Svelte 5 support
- ✅ **Vite ecosystem**: Compatible with current tooling
- ✅ **TypeScript**: Enhanced support in Svelte 5

### Library Dependencies
- ✅ **@simplewebauthn/browser**: Framework-agnostic, no migration needed
- ✅ **Testing libraries**: @testing-library/svelte v4+ supports Svelte 5
- ✅ **Build tools**: vite-plugin-svelte has stable Svelte 5 support

## Impact Assessment

### Components Requiring Migration: 15 files

#### Core Components (High Priority)
1. **`src/components/core/SignInCore.svelte`** - 1045 lines
   - Complex reactive logic with `$:` statements
   - Multiple `export let` props → `$props()` runes
   - Context usage patterns (minimal changes)

2. **`src/components/SignInForm.svelte`** - 251 lines
   - Wrapper component with presentational props
   - Event dispatcher patterns (unchanged)

3. **`src/components/AccountCreationForm.svelte`**
   - Registration flow component
   - Form validation and state management

#### Form Components (Medium Priority)
4. **`src/components/core/EmailInput.svelte`**
5. **`src/components/core/CodeInput.svelte`**  
6. **`src/components/core/AuthButton.svelte`**
7. **`src/components/core/AuthStateMessage.svelte`**
8. **`src/components/core/AuthNewUserInfo.svelte`**

#### Utility Components (Lower Priority)
9. **`src/components/UserManagement.svelte`**
10. **`src/components/TestFlow.svelte`**
11. **`src/components/EmailVerificationBanner.svelte`**
12. **`src/components/EmailVerificationPrompt.svelte`**
13. **`src/components/ErrorReportingStatus.svelte`**
14. **`src/components/SessionStateMachineFlow.svelte`**
15. **`src/components/SignInStateMachineFlow.svelte`**

### Store Architecture Analysis

#### Current Pattern (Svelte 4)
```typescript
// src/stores/auth-store.ts
import { writable, derived, get } from 'svelte/store';

export function createAuthStore(config: AuthConfig): AuthStore {
  const { subscribe, set, update } = writable(initialState);
  // ... store logic
}
```

#### Migration Considerations
- **Keep current pattern**: Svelte stores remain fully supported in Svelte 5
- **Future enhancement**: Consider runes for new global state patterns
- **No breaking changes**: Existing store patterns work unchanged

## Migration Strategy

### Phase 1: Automated Migration (1-2 hours)
```bash
# Run automated migration tool
npx sv migrate svelte-5

# Review automated changes
git diff --stat
```

**Expected automated changes:**
- `export let` → `let { prop } = $props()`
- Component instantiation patterns
- Basic TypeScript improvements

### Phase 2: Manual Review and Testing (2-3 days)

#### Component-by-Component Review
Each component requires manual verification of:

1. **Props Migration**:
   ```svelte
   <!-- Before (Svelte 4) -->
   export let initialEmail = '';
   export let className = '';
   export let disabled = false;
   
   <!-- After (Svelte 5) -->
   let { 
     initialEmail = '', 
     className = '', 
     disabled = false 
   } = $props();
   ```

2. **Reactive Statements**: Most `$:` patterns continue to work
   ```svelte
   <!-- These patterns remain valid -->
   $: authConfig = store?.getConfig();
   $: isNewUser = currentState === 'userChecked' && !userExists;
   ```

3. **Event Dispatching**: Unchanged patterns
   ```svelte
   <!-- Remains the same -->
   const dispatch = createEventDispatcher<{
     success: { user: User; method: AuthMethod };
   }>();
   ```

4. **Context Usage**: Minimal changes needed
   ```svelte
   <!-- Largely unchanged -->
   const authStoreContext = getContext<any>(AUTH_CONTEXT_KEY);
   $: store = $authStoreContext as ReturnType<typeof createAuthStore>;
   ```

#### Key Areas Requiring Attention

1. **SignInCore.svelte Critical Patterns**:
   - Complex prop destructuring
   - Reactive statement chains
   - Context integration
   - Form state management

2. **Bindable Props** (if any):
   ```svelte
   <!-- Svelte 4 -->
   export let value = '';
   
   <!-- Svelte 5 (if bindable) -->
   let { value = $bindable() } = $props();
   ```

### Phase 3: Integration Testing (1-2 days)

#### Test Categories
1. **Component rendering tests**
2. **Authentication flow integration**  
3. **WebAuthn functionality**
4. **Store reactivity patterns**
5. **Context passing between components**

#### Specific Test Areas
- Email input with WebAuthn autocomplete
- Pin validation flows
- Passkey registration/authentication
- Error state handling
- Multi-step authentication flows

## Breaking Changes to Address

### Component API Changes
- **Export bindings**: Review any `bind:` usage on component exports
- **Component instantiation**: Update any manual component creation
- **Slot patterns**: Update to snippets if using advanced slot patterns

### Build Configuration
```typescript
// vite.config.ts - update Svelte plugin
import { sveltekit } from '@sveltejs/kit/vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default {
  plugins: [
    svelte({
      // Svelte 5 specific config if needed
    })
  ]
};
```

### Package.json Updates
```json
{
  "peerDependencies": {
    "svelte": "^5.0.0"
  },
  "devDependencies": {
    "svelte": "^5.0.0",
    "@sveltejs/vite-plugin-svelte": "^5.0.0",
    "svelte-check": "^4.0.0"
  }
}
```

## Risk Mitigation

### Low Risk Items ✅
- **Store patterns**: Fully backward compatible
- **WebAuthn integration**: Framework-agnostic libraries
- **TypeScript types**: Enhanced support in Svelte 5
- **Testing framework**: Established Svelte 5 support

### Medium Risk Items ⚠️
- **Complex reactive patterns** in SignInCore
- **Build pipeline** compatibility verification  
- **Demo applications** requiring updates
- **Documentation** examples need updating

### Mitigation Strategies
1. **Incremental migration**: Migrate components individually
2. **Thorough testing**: Verify each auth flow after migration
3. **Rollback plan**: Git branches for safe experimentation
4. **Documentation updates**: Update examples and guides

## Success Criteria

### Technical Validation ✅
- [ ] All 15 components migrate successfully
- [ ] Build passes without warnings
- [ ] All existing tests pass
- [ ] TypeScript compilation succeeds
- [ ] Demo applications function correctly

### Functional Validation ✅
- [ ] Email input with WebAuthn works
- [ ] Pin-based authentication flows
- [ ] Passkey registration/authentication  
- [ ] Error handling and state transitions
- [ ] Context passing between components
- [ ] Store reactivity maintains expected behavior

## Timeline Estimate

### Optimistic: 3-4 days
- Day 1: Automated migration + initial component review
- Day 2: Manual component fixes and testing  
- Day 3: Integration testing and demo updates
- Day 4: Documentation and cleanup

### Realistic: 5-7 days
- Additional time for unexpected issues
- Comprehensive testing across all auth flows
- Demo application updates and verification
- Documentation updates

## Dependencies and Coordination

### Blocking Requirements
- ✅ Svelte 5 ecosystem stability (resolved)
- ✅ @astrojs/svelte v7 compatibility (available)
- ✅ Testing library support (available)

### Coordinated Updates Required
1. **flows.thepia.net**: Update to use migrated flows-auth
2. **thepia-all monorepo**: Update flows-auth dependency
3. **Documentation**: Update examples and integration guides
4. **Demo applications**: Verify and update if needed

## Recommendation: ✅ PROCEED WITH MIGRATION

The migration is **technically sound and strategically beneficial**:

1. **Resolved ecosystem issues**: Early 2025 compatibility problems are fixed
2. **Stable tooling**: Automated migration tools are mature
3. **Framework benefits**: Svelte 5 offers improved DX and performance
4. **Future-proofing**: Staying current with ecosystem evolution
5. **Minimal disruption**: Svelte 4 patterns largely continue to work

**Recommended approach**: Execute migration in dedicated sprint with thorough testing and coordination with dependent repositories.