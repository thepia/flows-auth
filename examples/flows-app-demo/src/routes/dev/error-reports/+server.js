/**
 * Error reporting endpoint for the flows-app-demo server
 * Logs error reports to console during development
 *
 * Purpose: Provides a development endpoint for flows-auth error reporting
 * Context: This enables debugging of authentication flows and WebAuthn issues
 * Safe to remove: Yes, this is only used during development
 */

import { json } from '@sveltejs/kit';

export async function POST({ request }) {
  try {
    const errorReport = await request.json();

    // Log the error report with timestamp and formatting
    const timestamp = new Date().toISOString();
    const reportType = errorReport.type || 'unknown';

    console.log(`\n🚨 [${timestamp}] Flows Auth Error Report - ${reportType.toUpperCase()}`);
    console.log('═'.repeat(60));

    // Format different types of error reports
    switch (errorReport.type) {
      case 'auth-state-change':
        console.log(`📝 Auth Event: ${errorReport.event}`);
        if (errorReport.email) console.log(`👤 Email: ${errorReport.email}`);
        if (errorReport.authMethod) console.log(`🔐 Method: ${errorReport.authMethod}`);
        if (errorReport.duration) console.log(`⏱️  Duration: ${errorReport.duration}ms`);
        if (errorReport.error) console.log(`❌ Error: ${errorReport.error}`);
        break;

      case 'webauthn-error':
        console.log(`🔐 WebAuthn Error - ${errorReport.operation}`);
        if (errorReport.error) {
          console.log(`❌ Error: ${errorReport.error.message || errorReport.error}`);
          if (errorReport.error.name) console.log(`🏷️  Type: ${errorReport.error.name}`);
          if (errorReport.error.code) console.log(`🔢 Code: ${errorReport.error.code}`);
        }
        break;

      case 'conditional-auth':
        console.log(`🔍 Conditional Auth - ${errorReport.operation || 'unknown'}`);
        if (errorReport.email) console.log(`👤 Email: ${errorReport.email}`);
        if (errorReport.success !== undefined) console.log(`✅ Success: ${errorReport.success}`);
        if (errorReport.error) console.log(`❌ Error: ${errorReport.error}`);
        if (errorReport.duration) console.log(`⏱️  Duration: ${errorReport.duration}ms`);
        break;

      case 'api-error':
        console.log(`🌐 API Error: ${errorReport.method} ${errorReport.url}`);
        console.log(`📊 Status: ${errorReport.status}`);
        console.log(`💬 Message: ${errorReport.message}`);
        break;

      case 'passkey-flow':
        console.log(`🔑 Passkey Flow - ${errorReport.operation || 'unknown'}`);
        if (errorReport.step) console.log(`📍 Step: ${errorReport.step}`);
        if (errorReport.email) console.log(`👤 Email: ${errorReport.email}`);
        if (errorReport.success !== undefined) console.log(`✅ Success: ${errorReport.success}`);
        if (errorReport.error) console.log(`❌ Error: ${errorReport.error}`);
        break;

      default:
        console.log(`📋 Report Data:`, errorReport);
    }

    // Log context if available
    if (errorReport.context && Object.keys(errorReport.context).length > 0) {
      console.log(`🔍 Context:`, errorReport.context);
    }

    // Log technical details
    if (errorReport.userAgent) {
      console.log(`🌐 User Agent: ${errorReport.userAgent}`);
    }
    if (errorReport.url) {
      console.log(`📍 URL: ${errorReport.url}`);
    }

    // Log API server information if available
    if (errorReport.apiBaseUrl) {
      console.log(`🔗 API Server: ${errorReport.apiBaseUrl}`);
    }

    console.log('═'.repeat(60));

    return json({
      success: true,
      message: 'Error report logged successfully',
      timestamp,
      type: reportType,
    });
  } catch (error) {
    console.error('❌ [Error Reporting] Failed to process error report:', error);

    return json(
      {
        success: false,
        message: 'Failed to process error report',
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// GET endpoint for health check
export async function GET() {
  return json({
    status: 'healthy',
    service: 'flows-app-demo-error-reporting',
    timestamp: new Date().toISOString(),
    endpoints: {
      POST: 'Submit error reports',
      GET: 'Health check',
    },
  });
}
