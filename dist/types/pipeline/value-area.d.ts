import type { ProfileRow, ProfileTemplate } from '../types/template';
export interface ValueAreaResult {
    readonly pocPrice: number | null;
    readonly valueAreaHigh: number | null;
    readonly valueAreaLow: number | null;
    readonly maxMagnitude: number;
}
/** Clamps user-supplied value area fraction to a sane 1–100% range. */
export declare function clampValueAreaFraction(fraction: number): number;
/**
 * Computes POC and value area from profile rows using the template's magnitude metric.
 */
export declare function computeValueArea(rows: readonly ProfileRow[], template: ProfileTemplate): ValueAreaResult;
