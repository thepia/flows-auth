<!--
  Demo component showing how the app uses merged Paraglide messages
  that combine library defaults + app-specific overrides
-->
<script>
  // ✅ Using app's merged Paraglide messages (library + app overrides)
  import * as m from '../../paraglide/messages.js';
  
  // Helper function for translation (same pattern as library components)
  const getDisplayText = (key, variables) => {
    const messages = m as unknown as {[key: string]: (variables?: any) => string};
    return messages[key]?.(variables) || key;
  };
  
  // Demo data
  const companyName = "Demo Corp";
  
  // Translation examples
  const examples = [
    {
      category: "App Overrides (Demo-specific)",
      items: [
        { key: "signIn.title", expected: "🚀 Demo Sign In", description: "Overridden with demo branding" },
        { key: "signIn.subtitle", expected: "Experience passwordless authentication with Demo Corp", description: "Customized demo description" },
        { key: "branding.poweredBy", expected: "Thepia Flows Demo", description: "Demo-specific branding" },
        { key: "auth.signIn", expected: "🔐 Sign In with Demo", description: "Demo-specific button text" }
      ]
    },
    {
      category: "Library Defaults (Inherited)",
      items: [
        { key: "email.label", expected: "Email address", description: "Standard email field label" },
        { key: "auth.loading", expected: "Loading...", description: "Standard loading message" },
        { key: "branding.securedBy", expected: "Secured by", description: "Standard security branding" },
        { key: "error.network", expected: "Network error. Please check your connection.", description: "Standard error message" }
      ]
    },
    {
      category: "App-Specific (Demo only)",
      items: [
        { key: "overview.title", expected: "Thepia Flows Authentication", description: "Demo page title" },
        { key: "overview.subtitle", expected: "Passwordless authentication with WebAuthn passkeys and magic links", description: "Demo page subtitle" }
      ]
    }
  ];
</script>

<div class="translation-demo">
  <div class="demo-header">
    <h3>🌐 Multi-Directory Paraglide Message Merging Demo</h3>
    <p class="demo-description">
      This component demonstrates how the auth-demo app successfully merges translations from:
    </p>
    <ul class="source-list">
      <li><strong>flows-auth/messages/</strong> → Library defaults (143 keys)</li>
      <li><strong>auth-demo/messages/</strong> → App-specific overrides (77 keys)</li>
    </ul>
    <p class="merge-info">
      <strong>Result:</strong> Single compiled Paraglide bundle with app overrides taking priority
    </p>
  </div>

  {#each examples as section}
    <div class="translation-section">
      <h4 class="section-title">{section.category}</h4>
      
      <div class="translation-grid">
        {#each section.items as item}
          {@const actualValue = getDisplayText(item.key, { companyName })}
          {@const isOverride = actualValue !== item.key}
          
          <div class="translation-item" class:override={isOverride} class:missing={!isOverride}>
            <div class="translation-key">
              <code>{item.key}</code>
            </div>
            
            <div class="translation-result">
              <div class="actual-value" class:success={isOverride} class:error={!isOverride}>
                {actualValue}
              </div>
              
              {#if item.expected && actualValue !== item.expected}
                <div class="expected-value">
                  Expected: <em>{item.expected}</em>
                </div>
              {/if}
            </div>
            
            <div class="translation-description">
              {item.description}
            </div>
            
            <div class="status-badge" class:success={isOverride} class:warning={!isOverride}>
              {isOverride ? '✅ Resolved' : '⚠️ Missing'}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/each}

  <div class="demo-footer">
    <h4>🎯 Implementation Benefits</h4>
    <ul class="benefits-list">
      <li><strong>Hierarchical Override System:</strong> App messages automatically override library defaults</li>
      <li><strong>Build-time Merging:</strong> Single optimized bundle, no runtime merging overhead</li>
      <li><strong>Type Safety:</strong> Full TypeScript support for all message keys</li>
      <li><strong>Tree Shaking:</strong> Only used translations included in final bundle</li>
      <li><strong>Multi-language Support:</strong> Overrides work across all supported languages</li>
      <li><strong>Development Workflow:</strong> Library updates don't break app customizations</li>
    </ul>
    
    <div class="technical-note">
      <strong>Technical Implementation:</strong> 
      <code>pathPattern: ["../../messages/{languageTag}.json", "./messages/{languageTag}.json"]</code>
    </div>
  </div>
</div>

<style>
  .translation-demo {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .demo-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 2rem;
    border-radius: 12px;
    margin-bottom: 2rem;
  }

  .demo-header h3 {
    margin: 0 0 1rem 0;
    font-size: 1.5rem;
  }

  .demo-description {
    margin: 1rem 0;
    opacity: 0.9;
  }

  .source-list {
    margin: 1rem 0;
    padding-left: 1.5rem;
  }

  .source-list li {
    margin: 0.5rem 0;
  }

  .merge-info {
    margin-top: 1rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    border-left: 4px solid #ffd700;
  }

  .translation-section {
    margin-bottom: 3rem;
  }

  .section-title {
    font-size: 1.25rem;
    margin: 0 0 1.5rem 0;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid #e2e8f0;
    color: #2d3748;
  }

  .translation-grid {
    display: grid;
    gap: 1rem;
  }

  .translation-item {
    display: grid;
    grid-template-columns: 200px 1fr 300px 100px;
    gap: 1rem;
    align-items: start;
    padding: 1rem;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #f8fafc;
  }

  .translation-item.override {
    border-color: #10b981;
    background: #f0fdf4;
  }

  .translation-item.missing {
    border-color: #f59e0b;
    background: #fffbeb;
  }

  .translation-key code {
    background: #1f2937;
    color: #f9fafb;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.875rem;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  }

  .actual-value {
    font-weight: 600;
    padding: 0.5rem;
    border-radius: 4px;
    margin-bottom: 0.5rem;
  }

  .actual-value.success {
    background: #dcfce7;
    color: #166534;
  }

  .actual-value.error {
    background: #fef2f2;
    color: #dc2626;
  }

  .expected-value {
    font-size: 0.875rem;
    color: #6b7280;
    font-style: italic;
  }

  .translation-description {
    font-size: 0.875rem;
    color: #6b7280;
    line-height: 1.4;
  }

  .status-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
    text-align: center;
    white-space: nowrap;
  }

  .status-badge.success {
    background: #dcfce7;
    color: #166534;
  }

  .status-badge.warning {
    background: #fef3c7;
    color: #92400e;
  }

  .demo-footer {
    background: #f8fafc;
    padding: 2rem;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
  }

  .demo-footer h4 {
    margin: 0 0 1rem 0;
    color: #2d3748;
  }

  .benefits-list {
    margin: 1rem 0;
    padding-left: 1.5rem;
  }

  .benefits-list li {
    margin: 0.75rem 0;
    line-height: 1.5;
  }

  .technical-note {
    margin-top: 1.5rem;
    padding: 1rem;
    background: #1f2937;
    color: #f9fafb;
    border-radius: 8px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.875rem;
  }

  .technical-note code {
    color: #fbbf24;
  }

  @media (max-width: 768px) {
    .translation-item {
      grid-template-columns: 1fr;
      gap: 0.75rem;
    }
    
    .translation-demo {
      padding: 1rem;
    }
  }
</style>
