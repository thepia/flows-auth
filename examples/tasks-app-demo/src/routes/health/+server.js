/**
 * Health check endpoint for the tasks demo server
 */

import { json } from '@sveltejs/kit';

export async function GET() {
	return json({
		status: 'healthy',
		server: 'tasks-app-demo',
		timestamp: new Date().toISOString(),
		version: '0.0.1'
	});
}