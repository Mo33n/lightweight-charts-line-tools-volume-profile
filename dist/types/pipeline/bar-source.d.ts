import type { ProfileTimeRange } from '../types/template';
export type ProfileBarSource = (range: ProfileTimeRange) => readonly unknown[];
/**
 * Optional override for bar lookup. Use when series.data() strips custom fields
 * (volume, tradesByPrice, features) or when bars live outside the LWC series.
 */
export declare function registerProfileBarSource(source: ProfileBarSource | null): void;
export declare function getProfileBarSource(): ProfileBarSource | null;
/** Resolve a bar's numeric time key for Map lookups. */
export declare function barTimeToKey(bar: unknown): number | null;
