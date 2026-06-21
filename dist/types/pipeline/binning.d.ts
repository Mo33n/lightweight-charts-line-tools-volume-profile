import type { ProfilePriceBounds, ProfileRowLayout, ProfileTimeRange, ProfileRow, ProfileMetricDefinition } from '../types/template';
import type { PriceLevelSample } from '../types/pipeline';
export declare function normalizeTimeRange(from: number, to: number): ProfileTimeRange;
export declare function resolveTickSize(explicit: number | undefined, fallback: number): number;
export declare function computeRowStep(layout: ProfileRowLayout, priceBounds: ProfilePriceBounds, tickSize: number): number;
export declare function bucketPrice(price: number, low: number, step: number): number;
export declare function sanitizeMetricValue(value: number): number;
export declare function mergePriceBounds(a: ProfilePriceBounds | null, b: ProfilePriceBounds): ProfilePriceBounds;
export declare function boundsFromPrices(prices: readonly number[]): ProfilePriceBounds | null;
/** Infer tick size from OHLC bars when not explicitly provided. */
export declare function inferTickSizeFromBars(bars: readonly unknown[]): number;
export declare function isOhlcBar(bar: unknown): bar is {
    time: unknown;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
};
/** Sum samples into price buckets at the given step. */
export declare function sumSamplesIntoBuckets(samples: readonly PriceLevelSample[], bounds: ProfilePriceBounds, step: number, metrics: readonly ProfileMetricDefinition[]): Map<number, Record<string, number>>;
/** Convert bucket map to profile rows. */
export declare function rowsFromBuckets(buckets: Map<number, Record<string, number>>, step: number, metrics: readonly ProfileMetricDefinition[]): ProfileRow[];
/**
 * When tick-size binning produces more buckets than maxRows, re-bin with a coarser step
 * so high-volume price levels are not silently dropped from the top of the range.
 */
export declare function binSamplesWithMaxRows(samples: readonly PriceLevelSample[], bounds: ProfilePriceBounds, initialStep: number, tickSize: number, layout: ProfileRowLayout, metrics: readonly ProfileMetricDefinition[]): ProfileRow[];
