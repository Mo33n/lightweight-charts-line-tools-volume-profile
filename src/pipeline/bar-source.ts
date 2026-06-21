import type { ProfileTimeRange } from '../types/template';

export type ProfileBarSource = (range: ProfileTimeRange) => readonly unknown[];

let barSource: ProfileBarSource | null = null;

/**
 * Optional override for bar lookup. Use when series.data() strips custom fields
 * (volume, tradesByPrice, features) or when bars live outside the LWC series.
 */
export function registerProfileBarSource(source: ProfileBarSource | null): void {
	barSource = source;
}

export function getProfileBarSource(): ProfileBarSource | null {
	return barSource;
}

/** Resolve a bar's numeric time key for Map lookups. */
export function barTimeToKey(bar: unknown): number | null {
	if (!bar || typeof bar !== 'object') return null;
	const t = (bar as { time?: unknown }).time;
	if (typeof t === 'number' && Number.isFinite(t)) return t;
	return null;
}
