# Flows App Implementation Checklist

## Overview

This checklist ensures every Thepia Flows application implements the optimal user experience with app exploration before email verification. This pattern reduces friction and demonstrates value before requiring user commitment.

## 🎯 Core Implementation Pattern

### **Registration Journey Requirements**

**✅ REQUIRED FLOW:**
1. **Registration & Passkey Setup** → User creates account
2. **Immediate App Access** → User enters app with limited functionality  
3. **App Exploration Phase** → User discovers value before verification
4. **Contextual Verification Prompts** → In-app calls-to-action
5. **Completed Registration** → Full access after email verification

**❌ AVOID:** Blocking users with verification walls immediately after registration

## 📋 Implementation Checklist

### **Phase 1: Authentication Integration**

#### **✅ flows-auth Setup**
- [ ] Install `@thepia/flows-auth` package
- [ ] Configure for `thepia.net` domain
- [ ] Set up real API endpoints (not mock)
- [ ] Implement proper error handling
- [ ] Add authentication state management

```typescript
// ✅ CORRECT: Real authentication config
const authConfig = {
  apiBaseUrl: 'https://api.thepia.com',
  domain: 'thepia.net',
  enablePasskeys: true,
  enableMagicLinks: true,
  clientId: 'your-flows-app-id'
};
```

#### **✅ Authentication States**
- [ ] Handle `authenticated-unconfirmed` state
- [ ] Handle `authenticated-confirmed` state  
- [ ] Implement proper state transitions
- [ ] Add session persistence
- [ ] Handle logout and cleanup

### **Phase 2: App Exploration Experience**

#### **✅ Immediate App Access**
- [ ] Close auth modal after successful registration
- [ ] Allow unconfirmed users into main app
- [ ] Send welcome email in background
- [ ] Store unconfirmed user state
- [ ] Enable basic app functionality

#### **✅ Limited Functionality Design**
- [ ] Define which features are available to unconfirmed users
- [ ] Create feature access control system
- [ ] Design locked feature UI patterns
- [ ] Implement graceful feature degradation
- [ ] Document access levels clearly

```typescript
// ✅ Feature access control pattern
$: canAccessAdvancedFeatures = user?.emailVerified;
$: canViewBasicContent = !!user; // Any authenticated user
$: canCreateContent = user?.emailVerified;
$: canInviteUsers = user?.emailVerified;
```

### **Phase 3: Verification Prompts**

#### **✅ Contextual Verification UI**
- [ ] Implement subtle verification banner
- [ ] Create feature-specific verification prompts
- [ ] Add dismissible verification reminders
- [ ] Design locked feature overlays
- [ ] Implement verification success states

#### **✅ Verification Banner**
- [ ] Non-intrusive top banner design
- [ ] Clear call-to-action button
- [ ] Dismissible with user preference storage
- [ ] Responsive design for mobile
- [ ] Accessible keyboard navigation

#### **✅ Feature-Gated Prompts**
- [ ] Show prompts when accessing locked features
- [ ] Explain benefits of verification
- [ ] Provide easy verification actions
- [ ] Allow continued limited access
- [ ] Track prompt interactions

### **Phase 4: Email Verification System**

#### **✅ Welcome Email Integration**
- [ ] **API server sends welcome email** automatically after successful registration
- [ ] **Frontend calls resend API** for user-requested email resends
- [ ] Include verification link with secure token (server-generated)
- [ ] Design email template with branding (server-side)
- [ ] Handle email delivery failures (server-side)
- [ ] Implement resend functionality via API calls

**🚨 CRITICAL: Email Sending Architecture**
- **API Server**: Handles ALL email sending (welcome emails, resends, templating)
- **Frontend**: Only triggers API calls for user-requested resends
- **Security**: Email credentials and logic stay server-side
- **Rate Limiting**: API server prevents email abuse
- **Audit Trail**: Server logs all email activities

#### **✅ Verification Link Handling**
- [ ] Create verification endpoint
- [ ] Validate verification tokens
- [ ] Update user verification status
- [ ] Handle expired tokens
- [ ] Redirect to success page

#### **✅ Verification Success**
- [ ] Update user state to confirmed
- [ ] Remove verification prompts
- [ ] Unlock all features
- [ ] Show success notification
- [ ] Guide user to newly available features

### **Phase 5: User Experience Polish**

#### **✅ Progressive Disclosure**
- [ ] Show feature previews to unconfirmed users
- [ ] Explain what verification unlocks
- [ ] Use clear visual hierarchy
- [ ] Provide helpful tooltips
- [ ] Guide users through verification

#### **✅ Mobile Experience**
- [ ] Responsive verification prompts
- [ ] Touch-friendly verification actions
- [ ] Mobile-optimized email app integration
- [ ] Proper viewport handling
- [ ] Accessible touch targets

#### **✅ Error Handling**
- [ ] Handle verification failures gracefully
- [ ] Provide clear error messages
- [ ] Offer alternative verification methods
- [ ] Support customer service escalation
- [ ] Log verification issues

## 🔧 Technical Implementation

### **Required Components**

#### **✅ VerificationBanner.svelte**
```svelte
<!-- Subtle top banner for unconfirmed users -->
<div class="verification-banner">
  <span>📧 Please verify your email to unlock all features</span>
  <button on:click={handleVerify}>Verify now</button>
  <button on:click={handleDismiss}>×</button>
</div>
```

#### **✅ VerificationPrompt.svelte**
```svelte
<!-- Feature-specific verification prompts -->
<div class="verification-prompt">
  <h3>🔓 Unlock {featureName}</h3>
  <p>Verify your email to access this feature</p>
  <button on:click={openEmailApp}>Check Email</button>
  <button on:click={resendEmail}>Resend Link</button>
</div>
```

#### **✅ FeatureGate.svelte**
```svelte
<!-- Wrapper for locked features -->
{#if canAccess}
  <slot />
{:else}
  <div class="locked-feature" on:click={showVerificationPrompt}>
    <div class="lock-overlay">
      <div class="lock-icon">🔒</div>
      <h4>{featureName}</h4>
      <p>Verify email to unlock</p>
    </div>
  </div>
{/if}
```

### **State Management Pattern**

```typescript
// ✅ User verification state management
export const userStore = derived(authStore, ($auth) => ({
  user: $auth.user,
  isAuthenticated: !!$auth.user,
  isConfirmed: $auth.user?.emailVerified || false,
  isUnconfirmed: $auth.user && !$auth.user.emailVerified,
  canAccessBasicFeatures: !!$auth.user,
  canAccessAdvancedFeatures: $auth.user?.emailVerified || false
}));
```

## 🚨 Critical Requirements

### **✅ Must Implement**
- [ ] **Immediate app access** after registration
- [ ] **App exploration phase** with limited functionality
- [ ] **Contextual verification prompts** within app content
- [ ] **Feature-gated access** with clear upgrade paths
- [ ] **Background email sending** without blocking UX

### **❌ Must Avoid**
- [ ] **Verification walls** immediately after registration
- [ ] **Blocking entire app** until email verified
- [ ] **Intrusive verification popups** that interrupt workflow
- [ ] **Hidden functionality** without explanation
- [ ] **Poor mobile experience** for verification

## 📊 Success Metrics

### **User Experience Indicators**
- [ ] **High exploration rate**: Users try multiple features before verifying
- [ ] **Low abandonment**: Users don't leave immediately after registration
- [ ] **Natural verification**: Users verify when they need locked features
- [ ] **Feature discovery**: Users understand what verification unlocks
- [ ] **Smooth transitions**: No jarring UX changes during verification

### **Technical Indicators**
- [ ] **Fast app entry**: No delays after registration
- [ ] **Reliable email delivery**: Welcome emails sent successfully
- [ ] **Secure verification**: Tokens properly validated
- [ ] **State consistency**: User state synchronized across tabs
- [ ] **Error resilience**: Graceful handling of verification failures

## 🔄 Testing Checklist

### **Registration Flow Testing**
- [ ] Test complete registration with passkey
- [ ] Verify immediate app access after registration
- [ ] Confirm welcome email is sent
- [ ] Test app functionality with unconfirmed user
- [ ] Verify locked features show appropriate prompts

### **Verification Flow Testing**
- [ ] Test email verification link functionality
- [ ] Verify feature unlocking after confirmation
- [ ] Test resend email functionality
- [ ] Confirm verification success states
- [ ] Test expired token handling

### **Cross-Device Testing**
- [ ] Test on mobile devices
- [ ] Verify email app integration
- [ ] Test responsive verification prompts
- [ ] Confirm touch interactions work
- [ ] Test across different browsers

This checklist ensures every Flows app provides the optimal user experience with app exploration before requiring email verification commitment.
