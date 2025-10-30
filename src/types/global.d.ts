// Global type declarations for window extensions

declare global {
  interface Window {
    __errorReporter?: {
      getErrorSummary(): {
        errors: number;
        authEvents: number;
        sessionId: string;
        lastFlush: number;
      };
      clearQueues(): void;
      reportError(error: {
        type: string;
        message: string;
        severity: string;
        context?: Record<string, any>;
      }): void;
    };
    reportAuthError?: (error: any) => void; // Auth error reporting function
    posthog?: any; // PostHog analytics
    SimpleWebAuthnBrowser?: {
      startRegistration: (options: any) => Promise<any>;
      startAuthentication: (options: any) => Promise<any>;
    };
    initializeWebAuthnAfterLoad?: () => void;
    __policyViewers?: Record<string, () => void>; // Registry of PolicyViewer instances
    showPolicyPopup?: (policyType?: string) => void; // Global function to open policy popups
  }

  // Deno runtime declarations for dual-environment compatibility
  namespace globalThis {
    var Deno:
      | {
          env: {
            get(key: string): string | undefined;
            set(key: string, value: string): void;
            delete(key: string): void;
            has(key: string): boolean;
            toObject(): { [key: string]: string };
          };
          version: {
            deno: string;
            v8: string;
            typescript: string;
          };
          cwd(): string;
        }
      | undefined;
  }

  // For Node.js test environments
  namespace NodeJS {
    interface Global {
      Deno?: typeof globalThis.Deno;
    }
  }
}

export {};

