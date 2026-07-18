# PolicyViewer Component

A modal component for displaying policy documents (Privacy Policy, Terms of Service, Acceptable Use Policy, etc.).

## Features

- 🎨 Modal dialog with backdrop blur
- 📄 Supports both iframe (external URLs) and inline HTML content
- ⌨️ Keyboard accessible (ESC to close)
- 📱 Responsive design (fullscreen on mobile)
- ✨ Smooth animations
- 🎯 Customizable title and max width

## Basic Usage

### With External URL (iframe)

```svelte
<script>
  import { PolicyViewer } from '@thepia/flows-auth';

  let showPrivacyPolicy = false;
</script>

<button on:click={() => showPrivacyPolicy = true}>
  View Privacy Policy
</button>

<PolicyViewer
  bind:open={showPrivacyPolicy}
  title="Privacy Policy"
  url="https://thepia.com/privacy"
  on:close={() => showPrivacyPolicy = false}
/>
```

### With Inline HTML Content

```svelte
<script>
  import { PolicyViewer } from '@thepia/flows-auth';

  let showTerms = false;

  const termsContent = `
    <h1>Terms of Service</h1>
    <p>Last updated: October 2024</p>

    <h2>1. Acceptance of Terms</h2>
    <p>By using our service, you agree to these terms...</p>

    <h2>2. User Responsibilities</h2>
    <ul>
      <li>Maintain account security</li>
      <li>Provide accurate information</li>
      <li>Comply with applicable laws</li>
    </ul>
  `;
</script>

<button on:click={() => showTerms = true}>
  View Terms
</button>

<PolicyViewer
  bind:open={showTerms}
  title="Terms of Service"
  content={termsContent}
  on:close={() => showTerms = false}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | `false` | Controls modal visibility |
| `title` | `string` | `'Policy'` | Modal header title |
| `url` | `string \| null` | `null` | External URL to load in iframe |
| `content` | `string \| null` | `null` | HTML content to display inline |
| `maxWidth` | `string` | `'800px'` | Maximum width of modal |
| `showCloseButton` | `boolean` | `true` | Show/hide close button |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `close` | `void` | Fired when modal is closed |

## Advanced Usage

### Custom Styling

The component uses CSS variables for theming:

```css
:root {
  --auth-background: #ffffff;
  --auth-text-primary: #111827;
  --auth-text-secondary: #6b7280;
  --auth-border-color: #e5e7eb;
  --auth-accent-color: #10b981;
  --auth-hover-background: #f3f4f6;
}
```

### Multiple Policies

```svelte
<script>
  import { PolicyViewer } from '@thepia/flows-auth';

  let currentPolicy = null;

  const policies = {
    privacy: {
      title: 'Privacy Policy',
      url: 'https://thepia.com/privacy'
    },
    terms: {
      title: 'Terms of Service',
      url: 'https://thepia.com/terms'
    },
    acceptable: {
      title: 'Acceptable Use Policy',
      url: 'https://thepia.com/acceptable-use'
    }
  };

  function openPolicy(type) {
    currentPolicy = policies[type];
  }

  function closePolicy() {
    currentPolicy = null;
  }
</script>

<div class="policy-links">
  <button on:click={() => openPolicy('privacy')}>Privacy Policy</button>
  <button on:click={() => openPolicy('terms')}>Terms of Service</button>
  <button on:click={() => openPolicy('acceptable')}>Acceptable Use</button>
</div>

{#if currentPolicy}
  <PolicyViewer
    open={true}
    title={currentPolicy.title}
    url={currentPolicy.url}
    on:close={closePolicy}
  />
{/if}
```

### Integration with Auth Store

```svelte
<script>
  import { PolicyViewer } from '@thepia/flows-auth';
  import { getAuthStoreFromContext } from '@thepia/flows-auth';

  const authStore = getAuthStoreFromContext();
  $: config = authStore.getConfig();

  let showPolicy = false;
</script>

{#if config.privacyPolicyUrl}
  <button on:click={() => showPolicy = true}>
    View Privacy Policy
  </button>

  <PolicyViewer
    bind:open={showPolicy}
    title="Privacy Policy"
    url={config.privacyPolicyUrl}
    on:close={() => showPolicy = false}
  />
{/if}
```

## Security Notes

### iframe Sandbox

When using `url` prop, the component loads content in an iframe with these sandbox attributes:

- `allow-same-origin` - Allows same-origin content
- `allow-scripts` - Allows JavaScript execution
- `allow-popups` - Allows popups (for external links)
- `allow-forms` - Allows form submission

### HTML Content

When using `content` prop, HTML is rendered using `{@html}`. Only use trusted content to avoid XSS vulnerabilities.

## Accessibility

- Modal uses native `<dialog>` element
- Proper ARIA labels (`aria-labelledby`, `aria-modal`)
- Keyboard navigation (ESC to close)
- Focus trap within modal
- Screen reader announcements

## Browser Support

- Modern browsers with `<dialog>` support
- Polyfill recommended for older browsers

## Styling

The component includes:
- Smooth slide-in/slide-out animations
- Backdrop blur effect
- Responsive behavior (fullscreen on mobile)
- Custom scrollbar styling
- Markdown-friendly content styles (headings, lists, code blocks, etc.)
