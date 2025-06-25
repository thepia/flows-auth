# Tasks App Demo - Flows Auth with Service Worker

A complete task management application demonstrating:

- **WebAuthn Authentication** using flows-auth library
- **Service Worker Background Sync** for offline capability  
- **Privacy-First Architecture** with local-only data storage
- **Progressive Web App** features

## Features

### Authentication
- Passwordless sign-in with WebAuthn/passkeys
- Biometric authentication (Face ID, Touch ID, Windows Hello)
- Hardware security key support
- Magic link fallback

### Task Management
- Create, edit, and delete tasks
- Local storage with IndexedDB
- Automatic background sync when online
- Offline capability with conflict resolution

### Error Reporting & Monitoring
- Comprehensive frontend error reporting
- Configurable endpoints for dev/staging/production
- Service worker sync error tracking
- Authentication failure reporting
- Real-time error queue monitoring

### Service Worker Integration
- Background sync for task data
- Offline caching strategy
- Privacy-focused metadata-only uploads
- Real-time sync status monitoring

### PWA Capabilities
- App installation support
- Offline functionality
- Native app-like experience
- Responsive design

## Getting Started

1. **Install dependencies:**
   ```bash
   cd examples/tasks-app-demo
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Open in browser:**
   - Visit `https://dev.thepia.net:5176`
   - HTTPS is required for WebAuthn functionality

## Project Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── AuthComponent.svelte     # Authentication UI
│   │   ├── TasksList.svelte         # Main tasks interface
│   │   ├── TaskItem.svelte          # Individual task component
│   │   ├── AddTaskForm.svelte       # Task creation form
│   │   └── SyncStatus.svelte        # Sync status indicator
│   └── stores/
│       └── tasks.js                 # Task management store
├── routes/
│   ├── +layout.svelte               # App layout with auth
│   └── +page.svelte                 # Main page
└── app.css                          # Global styles

static/
├── sw.js                            # Service worker
└── manifest.json                    # PWA manifest
```

## Key Implementation Details

### Smart Error Reporting with Server Detection
```javascript
// Automatic server detection and fallback
await initializeTasksErrorReporting();
// → Checks if local API (dev.thepia.com:8443) is available
// → Falls back to production API if local unavailable
// → Logs strategy: "Local API" or "Production API (fallback)"

// Force production reporting (override auto-detection)
await initializeTasksErrorReportingProduction();
// → Always uses production API regardless of environment
```

**Server Detection Strategy:**
- **Local Dev Available**: Reports to `https://dev.thepia.com:8443/dev/error-reports`
- **Local Dev Down**: Error reporting disabled  
- **Production**: Error reporting disabled (intentionally not implemented)

**Note**: Frontend error reporting is currently a development-only feature. Production frontend error reporting is intentionally not implemented as it requires careful design for throttling and protection. PostHog is used for server/service monitoring, not frontend errors.

### Dynamic Imports for SSR Compatibility
```javascript
// Avoid SSR issues with WebAuthn APIs
onMount(async () => {
  if (!browser) return;
  
  const { getAuthStore } = await import('@thepia/flows-auth');
  authStore = getAuthStore();
});
```

### Service Worker Registration
```javascript
// Automatic registration in app.html
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

### Local Storage with Sync
```javascript
// Store tasks locally, sync metadata only
await localDB.storeWorkflow({
  uid: task.uid,
  workflowId: 'tasks',
  syncStatus: 'pending',
  data: { /* local task data */ }
});
```

## Development Notes

### WebAuthn Testing
- Requires HTTPS for production WebAuthn features
- Use `npm run dev:https` for full WebAuthn testing
- Localhost works for basic development

### Service Worker Development
- Service worker updates on page refresh in dev mode
- Check browser DevTools > Application > Service Workers
- Clear cache if needed: Application > Storage > Clear storage

### Database Inspection
- IndexedDB data visible in DevTools > Application > IndexedDB
- Tasks stored under 'flows-auth-db' > 'workflows'
- Sync metadata in 'sync_metadata' store

## API Integration

The app expects a sync API at `/sync/*` endpoints:

- `POST /sync/workflows` - Sync workflow metadata
- `POST /sync/workflows/upload` - Upload task metadata
- `GET /sync/workflows/download` - Download updates
- `GET /sync/ping` - Check connectivity

## Privacy Architecture

- **Local-First**: All task data stays in browser
- **Metadata-Only Sync**: Only UIDs, timestamps, and checksums uploaded
- **User Control**: Users can clear all data anytime
- **No Tracking**: No analytics or tracking cookies

## Deployment

1. **Build for production:**
   ```bash
   npm run build
   ```

2. **Deploy static files:**
   - Upload `dist/` contents to web server
   - Ensure HTTPS for WebAuthn functionality
   - Configure service worker caching headers

3. **API Backend:**
   - Implement sync endpoints per API specification
   - Support JWT token authentication
   - Handle metadata-only data structure

## Browser Support

- **Modern browsers** with WebAuthn support
- **Service Worker** support required
- **IndexedDB** for local storage
- **Fetch API** for network requests

## Security Considerations

- HTTPS required for WebAuthn in production
- Service worker scope limited to app origin
- No sensitive data transmitted to server
- Local storage encrypted by browser

## Troubleshooting

### Common Issues

1. **WebAuthn not working**: Ensure HTTPS and supported browser
2. **Service worker not registering**: Check console for errors
3. **Tasks not syncing**: Verify API endpoints and auth tokens
4. **Installation prompt not showing**: Check manifest.json and HTTPS

### Debug Tools

- Browser DevTools > Application tab
- Console for service worker logs
- Network tab for API requests
- IndexedDB inspector for local data