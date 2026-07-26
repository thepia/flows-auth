/**
 * Extract client IP from request headers, checking common proxy/CDN headers
 * in order of preference.
 */
export function getClientIP(request: Request): string {
  const headers = [
    'cf-connecting-ip', // Cloudflare
    'x-forwarded-for', // Standard proxy header
    'x-real-ip', // Nginx
    'x-client-ip' // Alternative
  ];

  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      // Take first IP if multiple (comma-separated)
      const ip = value.split(',')[0]?.trim();
      if (ip && ip !== 'unknown') {
        return ip;
      }
    }
  }

  return 'unknown';
}
