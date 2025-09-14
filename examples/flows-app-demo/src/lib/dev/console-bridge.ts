/**
 * Browser-to-Terminal Console Bridge for Flows App Demo
 * Based on nets-offboarding-flows console bridge implementation
 *
 * Captures all console output, errors, and state changes from the browser
 * and sends them to the dev server for display in the terminal.
 */

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

class ConsoleBridge {
  private logs: LogEntry[] = [];
  private originalConsole: Record<string, (...args: any[]) => void> = {};
  private sessionId: string;
  private isInitialized = false;
  private uploadInterval: number | null = null;
  private maxLogs = 1000;
  private uploadUrl = '/__dev_console';

  constructor() {
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize the console bridge
   */
  public init(): void {
    if (this.isInitialized || typeof window === 'undefined') return;

    // Only run in development mode
    if (import.meta.env.PROD) return;

    this.interceptConsole();
    this.setupErrorHandlers();
    this.setupResourceErrorHandling();
    this.setupSecurityViolationHandling();
    this.startLogUpload();
    this.isInitialized = true;

    this.addLog('info', '🛠️ Development mode - console bridge active', [], 'console');
    this.addLog('info', `Session ID: ${this.sessionId}`, [], 'console');
  }

  /**
   * Intercept all console methods
   */
  private interceptConsole(): void {
    const consoleMethods: Array<keyof Console> = ['log', 'info', 'warn', 'error', 'debug'];

    consoleMethods.forEach((method) => {
      this.originalConsole[method] = console[method];

      (console as any)[method] = (...args: any[]) => {
        // Call original console method
        this.originalConsole[method].apply(console, args);

        // Capture for upload
        this.addLog(method as any, this.formatArgs(args), args, 'console');
      };
    });
  }

  /**
   * Setup global error handlers
   */
  private setupErrorHandlers(): void {
    // Unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.addLog('error', `${event.message}`, [], 'error', {
        stack: event.error?.stack,
        url: event.filename,
        line: event.lineno,
        column: event.colno
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.addLog('error', `Unhandled Promise Rejection: ${event.reason}`, [], 'error', {
        stack: event.reason?.stack
      });
    });
  }

  /**
   * Setup resource error handling (failed loads)
   */
  private setupResourceErrorHandling(): void {
    window.addEventListener(
      'error',
      (event) => {
        const target = event.target;
        if (target && target !== window) {
          const tagName = (target as Element).tagName?.toLowerCase();
          const src = (target as any).src || (target as any).href;

          if (src && ['img', 'script', 'link', 'iframe'].includes(tagName)) {
            this.addLog('error', `Failed to load ${tagName}: ${src}`, [], 'resource');
          }
        }
      },
      true
    );
  }

  /**
   * Setup security violation handling
   */
  private setupSecurityViolationHandling(): void {
    document.addEventListener('securitypolicyviolation', (event) => {
      this.addLog(
        'warn',
        `CSP Violation: ${event.violatedDirective} - ${event.sourceFile}:${event.lineNumber}`,
        [],
        'security'
      );
    });
  }

  /**
   * Add a log entry
   */
  private addLog(
    level: LogEntry['level'],
    message: string,
    args: any[] = [],
    source: LogEntry['source'],
    extra: Partial<LogEntry> = {}
  ): void {
    const log: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      level,
      message,
      args: this.serializeArgs(args),
      source,
      ...extra
    };

    this.logs.push(log);

    // Limit log size
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  /**
   * Log authentication events
   */
  public logAuthEvent(eventType: string, data: any): void {
    this.addLog('auth', `Auth Event: ${eventType}`, [data], 'auth');
  }

  /**
   * Log state changes
   */
  public logStateChange(component: string, state: any): void {
    this.addLog('state', `State Change [${component}]`, [state], 'state');
  }

  /**
   * Format console arguments into a readable string
   */
  private formatArgs(args: any[]): string {
    return args
      .map((arg) => {
        if (typeof arg === 'string') return arg;
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return '[Object]';
          }
        }
        return String(arg);
      })
      .join(' ');
  }

  /**
   * Serialize arguments for JSON transport
   */
  private serializeArgs(args: any[]): any[] {
    return args.map((arg) => {
      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.parse(JSON.stringify(arg));
        } catch {
          return '[Circular or Non-Serializable Object]';
        }
      }
      return arg;
    });
  }

  /**
   * Start uploading logs to dev server
   */
  private startLogUpload(): void {
    this.uploadInterval = window.setInterval(() => {
      this.uploadLogs();
    }, 1000); // Upload every second
  }

  /**
   * Upload logs to dev server
   */
  private async uploadLogs(): void {
    if (this.logs.length === 0) return;

    const logsToUpload = [...this.logs];
    this.logs = [];

    try {
      await fetch(this.uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          logs: logsToUpload,
          timestamp: Date.now()
        })
      });
    } catch (error) {
      // Restore logs if upload failed
      this.logs = [...logsToUpload, ...this.logs];

      // Use original console to avoid recursion
      this.originalConsole.warn?.('Failed to upload console logs:', error);
    }
  }

  /**
   * Cleanup when leaving page
   */
  public destroy(): void {
    if (this.uploadInterval) {
      clearInterval(this.uploadInterval);
      this.uploadInterval = null;
    }

    // Final log upload
    if (this.logs.length > 0) {
      this.uploadLogs();
    }

    this.isInitialized = false;
  }
}

// Global instance
export const consoleBridge = new ConsoleBridge();

// Auto-initialize in browser
if (typeof window !== 'undefined') {
  consoleBridge.init();

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    consoleBridge.destroy();
  });
}

// Export helper functions for manual logging
export const logAuthEvent = (eventType: string, data: any) => {
  consoleBridge.logAuthEvent(eventType, data);
};

export const logStateChange = (component: string, state: any) => {
  consoleBridge.logStateChange(component, state);
};
