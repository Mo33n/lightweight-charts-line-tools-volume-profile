import type { PriceLevelSample, ProfilePipelineContext, ProfileResolveOptions, ProfileResolveResult } from '../types/pipeline';
import type { ProfileRow } from '../types/template';
/** Runs extractor across all bars, then aggregator, with defensive empty handling. */
export declare function resolveProfile(options: ProfileResolveOptions): ProfileResolveResult;
/**
 * Default binning aggregator — sums metrics into price buckets.
 * Used as fallback and by the built-in `sum-binned` pipeline.
 */
export declare function defaultBinningAggregator(samples: readonly PriceLevelSample[], ctx: ProfilePipelineContext): ProfileRow[];
