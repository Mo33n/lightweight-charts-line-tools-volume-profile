import type { ProfileRow, ProfileTemplate, ProfileTimeRange } from './template';

/**
 * A single price-level contribution extracted from one bar.
 * Metrics map is keyed by metric id from the template.
 */
export interface PriceLevelSample {
	readonly price: number;
	readonly metrics: Readonly<Record<string, number>>;
}

/** Context passed to extractors and aggregators. */
export interface ProfilePipelineContext {
	readonly template: ProfileTemplate;
	readonly range: ProfileTimeRange;
	readonly bars: readonly unknown[];
	readonly tickSize: number;
}

/**
 * Extracts price-level samples from a single bar.
 * Return an empty array when the bar has no usable data for this pipeline.
 */
export type BarSampleExtractor = (
	bar: unknown,
	ctx: ProfilePipelineContext,
) => readonly PriceLevelSample[];

/**
 * Aggregates flat samples into binned profile rows.
 * Implementations may sum, average, max, or apply custom logic.
 */
export type ProfileAggregator = (
	samples: readonly PriceLevelSample[],
	ctx: ProfilePipelineContext,
) => readonly ProfileRow[];

/** Named pipeline bundle registered at runtime. */
export interface ProfilePipelineDefinition {
	readonly id: string;
	readonly label: string;
	readonly extractor: BarSampleExtractor;
	readonly aggregator: ProfileAggregator;
}

export interface ProfileResolveResult {
	readonly rows: readonly ProfileRow[];
	readonly barCount: number;
	readonly warning?: string;
}

export interface ProfileResolveOptions {
	readonly template: ProfileTemplate;
	readonly range: ProfileTimeRange;
	readonly bars: readonly unknown[];
	readonly tickSize?: number;
	readonly pipeline: ProfilePipelineDefinition;
}
