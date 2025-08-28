import { dev } from '$app/environment';
import type { Handle } from '@sveltejs/kit';

interface LogEntry {
  id: string;
  timestamp: number;
  level: 'log' | 'info' | 'warn' | 'error' | 'debug' | 'state' | 'auth';
  message: string;
  args?: any[];
  stack?: string;
  url?: string;
  line?: number;
  column?: number;
  source: 'console' | 'error' | 'resource' | 'security' | 'auth' | 'state';
}

interface ConsoleUpload {
  sessionId: string;
  logs: LogEntry[];
  timestamp: number;
}

/**
 * Format timestamp for terminal display
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toTimeString().slice(0, 8);
}

/**
 * Get color codes for different log levels
 */
function getColorCode(level: string, source: string): string {
  const levelColors = {
    log: '\x1b[37m', // White
    info: '\x1b[36m', // Cyan
    warn: '\x1b[33m', // Yellow
    error: '\x1b[31m', // Red
    debug: '\x1b[90m', // Gray
    state: '\x1b[35m', // Magenta
    auth: '\x1b[32m', // Green
  };

  const sourceColors = {
    console: '\x1b[37m',
    error: '\x1b[31m',
    resource: '\x1b[91m', // Bright red
    security: '\x1b[93m', // Bright yellow
  };

  return (
    levelColors[level as keyof typeof levelColors] ||
    sourceColors[source as keyof typeof sourceColors] ||
    '\x1b[37m'
  );
}

/**
 * Format log entry for terminal display
 */
function formatLogForTerminal(log: LogEntry): string {
  const reset = '\x1b[0m';
  const bold = '\x1b[1m';
  const dim = '\x1b[2m';

  const color = getColorCode(log.level, log.source);
  const time = formatTime(log.timestamp);
  const level = log.level.toUpperCase().padEnd(5);

  let output = `${dim}[Browser]${reset} ${dim}[${time}]${reset} ${color}${bold}${level}${reset} `;

  // Add source prefix for special sources
  if (log.source === 'auth') {
    output += `🔐 `;
  } else if (log.source === 'state') {
    output += `📊 `;
  } else if (log.source === 'error') {
    output += `🚨 `;
  } else if (log.source === 'resource') {
    output += `📦 `;
  } else if (log.source === 'security') {
    output += `🔒 `;
  }

  output += log.message;

  // Add stack trace for errors
  if (log.stack && log.level === 'error') {
    const stackLines = log.stack.split('\n').slice(1, 4); // First 3 stack frames
    stackLines.forEach((line) => {
      output += `\n${dim}           ${line.trim()}${reset}`;
    });
  }

  // Add location for errors
  if (log.url && log.line) {
    output += `\n${dim}           at ${log.url}:${log.line}`;
    if (log.column) output += `:${log.column}`;
    output += reset;
  }

  // Format args for state/auth logs
  if ((log.source === 'state' || log.source === 'auth') && log.args && log.args.length > 0) {
    try {
      const formattedArgs = log.args
        .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
        .join('\n');

      if (formattedArgs.trim()) {
        output += `\n${dim}${formattedArgs
          .split('\n')
          .map((line) => `           ${line}`)
          .join('\n')}${reset}`;
      }
    } catch (_e) {
      // Ignore formatting errors
    }
  }

  return output;
}

/**
 * Handle console log uploads from browser
 */
async function handleConsoleUpload(request: Request): Promise<Response> {
  try {
    // Check if request has content
    const contentLength = request.headers.get('content-length');
    if (contentLength === '0' || contentLength === null) {
      return new Response('OK', { status: 200 });
    }

    // Get the request body text first to check if it's valid
    const text = await request.text();
    if (!text || text.trim() === '') {
      return new Response('OK', { status: 200 });
    }

    // Parse JSON
    const data: ConsoleUpload = JSON.parse(text);

    if (!data.logs || data.logs.length === 0) {
      return new Response('OK', { status: 200 });
    }

    // Group logs by session for cleaner output
    const _sessionPrefix = `${data.sessionId.slice(-8)}`;

    // Print each log to terminal
    data.logs.forEach((log) => {
      const formattedLog = formatLogForTerminal(log);
      console.log(formattedLog);
    });

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Failed to process console upload:', error);
    return new Response('OK', { status: 200 }); // Return OK to prevent client-side errors
  }
}

export const handle: Handle = async ({ event, resolve }) => {
  // Handle console bridge uploads in development
  if (dev && event.url.pathname === '/__dev_console') {
    if (event.request.method === 'POST') {
      return handleConsoleUpload(event.request);
    }
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Continue with normal request handling
  const response = await resolve(event);
  return response;
};
