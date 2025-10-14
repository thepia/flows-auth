/**
 * Date Helper Utilities
 *
 * Provides optimized helpers for working with ISO date strings,
 * offering the best of both worlds: human-readable storage and
 * efficient comparisons.
 */

/**
 * Check if an ISO date string is older than a specified duration
 *
 * @param isoDate - ISO 8601 date string (e.g., "2024-10-15T14:22:00Z")
 * @param milliseconds - Duration in milliseconds
 * @returns true if the date is older than the specified duration
 *
 * @example
 * const thirtyDaysAgo = 30 * 24 * 60 * 60 * 1000;
 * if (isOlderThan(user.lastLoginAt, thirtyDaysAgo)) {
 *   console.log('User login expired');
 * }
 */
export function isOlderThan(isoDate: string, milliseconds: number): boolean {
	try {
		const timestamp = new Date(isoDate).getTime();
		if (Number.isNaN(timestamp)) {
			console.warn('Invalid ISO date string:', isoDate);
			return true; // Treat invalid dates as expired
		}
		return timestamp < Date.now() - milliseconds;
	} catch (error) {
		console.error('Error parsing date:', error);
		return true; // Treat errors as expired
	}
}

/**
 * Calculate number of days since an ISO date string
 *
 * @param isoDate - ISO 8601 date string
 * @returns Number of days since the date (can be negative for future dates)
 *
 * @example
 * const days = daysSince(user.createdAt);
 * console.log(`Member for ${Math.floor(days)} days`);
 */
export function daysSince(isoDate: string): number {
	try {
		const timestamp = new Date(isoDate).getTime();
		if (Number.isNaN(timestamp)) {
			console.warn('Invalid ISO date string:', isoDate);
			return Number.POSITIVE_INFINITY; // Treat invalid as very old
		}
		return (Date.now() - timestamp) / (24 * 60 * 60 * 1000);
	} catch (error) {
		console.error('Error parsing date:', error);
		return Number.POSITIVE_INFINITY;
	}
}

/**
 * Calculate duration in milliseconds since an ISO date string
 *
 * @param isoDate - ISO 8601 date string
 * @returns Duration in milliseconds (can be negative for future dates)
 *
 * @example
 * const elapsed = millisecondsSince(session.createdAt);
 * if (elapsed > SESSION_TIMEOUT) {
 *   clearSession();
 * }
 */
export function millisecondsSince(isoDate: string): number {
	try {
		const timestamp = new Date(isoDate).getTime();
		if (Number.isNaN(timestamp)) {
			console.warn('Invalid ISO date string:', isoDate);
			return Number.POSITIVE_INFINITY;
		}
		return Date.now() - timestamp;
	} catch (error) {
		console.error('Error parsing date:', error);
		return Number.POSITIVE_INFINITY;
	}
}

/**
 * Check if an ISO date is within a specified duration from now
 *
 * @param isoDate - ISO 8601 date string
 * @param milliseconds - Duration in milliseconds
 * @returns true if the date is within the duration
 *
 * @example
 * if (isWithin(user.lastLoginAt, 24 * 60 * 60 * 1000)) {
 *   console.log('Logged in within last 24 hours');
 * }
 */
export function isWithin(isoDate: string, milliseconds: number): boolean {
	return !isOlderThan(isoDate, milliseconds);
}

/**
 * Format an ISO date string for display
 *
 * @param isoDate - ISO 8601 date string
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted date string
 *
 * @example
 * formatDate(user.createdAt) // "October 15, 2024"
 */
export function formatDate(isoDate: string, locale = 'en-US'): string {
	try {
		const date = new Date(isoDate);
		if (Number.isNaN(date.getTime())) {
			return 'Invalid date';
		}
		return date.toLocaleDateString(locale, {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	} catch (error) {
		console.error('Error formatting date:', error);
		return 'Invalid date';
	}
}

/**
 * Format an ISO date string with time for display
 *
 * @param isoDate - ISO 8601 date string
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted datetime string
 *
 * @example
 * formatDateTime(user.lastLoginAt) // "October 15, 2024, 2:22 PM"
 */
export function formatDateTime(isoDate: string, locale = 'en-US'): string {
	try {
		const date = new Date(isoDate);
		if (Number.isNaN(date.getTime())) {
			return 'Invalid date';
		}
		return date.toLocaleString(locale, {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	} catch (error) {
		console.error('Error formatting datetime:', error);
		return 'Invalid date';
	}
}

/**
 * Get current timestamp as ISO string
 *
 * @returns ISO 8601 date string representing current time
 *
 * @example
 * const now = nowISO(); // "2024-10-15T14:22:00.123Z"
 */
export function nowISO(): string {
	return new Date().toISOString();
}
