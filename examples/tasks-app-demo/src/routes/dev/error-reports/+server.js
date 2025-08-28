/**
 * Error reporting endpoint for the tasks demo server
 * Logs error reports to console during development
 */

import { json } from '@sveltejs/kit';

export async function POST({ request }) {
  try {
    const errorReport = await request.json();

    // Log the error report with timestamp and formatting
    const timestamp = new Date().toISOString();
    const reportType = errorReport.type || 'unknown';

    console.log(`\n🚨 [${timestamp}] Error Report - ${reportType.toUpperCase()}`);
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

      case 'api-error':
        console.log(`🌐 API Error: ${errorReport.method} ${errorReport.url}`);
        console.log(`📊 Status: ${errorReport.status}`);
        console.log(`💬 Message: ${errorReport.message}`);
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

    console.log('═'.repeat(60));

    return json({
      success: true,
      message: 'Error report logged successfully',
      timestamp,
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
