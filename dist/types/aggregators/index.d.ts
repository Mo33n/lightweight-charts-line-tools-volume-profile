import type { ProfileAggregator } from '../types/pipeline';
/** Sum samples into binned rows (default behaviour). */
export declare function createSumBinnedAggregator(): ProfileAggregator;
/** Average samples per bucket instead of sum. */
export declare function createAverageBinnedAggregator(): ProfileAggregator;
/** Max value per bucket (useful for peak metrics, not cumulative volume). */
export declare function createMaxBinnedAggregator(): ProfileAggregator;
