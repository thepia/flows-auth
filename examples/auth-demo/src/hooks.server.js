/**
 * SvelteKit hooks for development cache busting
 */

export async function handle({ event, resolve }) {
  const response = await resolve(event);
  
  // Disable caching in development
  if (process.env.NODE_ENV === 'development') {
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('ETag', '');
  }
  
  return response;
}