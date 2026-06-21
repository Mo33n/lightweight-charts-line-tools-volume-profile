import type {
	PriceLevelSample,
	ProfilePipelineContext,
	ProfileResolveOptions,
	ProfileResolveResult,
} from '../types/pipeline';
import type { ProfileRow } from '../types/template';
import {
	boundsFromPrices,
	binSamplesWithMaxRows,
	computeRowStep,
	inferTickSizeFromBars,
	isOhlcBar,
	resolveTickSize,
	sanitizeMetricValue,
} from './binning';

/** Runs extractor across all bars, then aggregator, with defensive empty handling. */
export function resolveProfile(options: ProfileResolveOptions): ProfileResolveResult {
	const { template, range, bars, pipeline } = options;
	const tickSize = resolveTickSize(options.tickSize, inferTickSizeFromBars(bars));

	const ctx: ProfilePipelineContext = {
		template,
		range,
		bars,
		tickSize,
	};

	if (bars.length === 0) {
		return { rows: [], barCount: 0, warning: 'No bars in selected time range.' };
	}

	const flatSamples: PriceLevelSample[] = [];
	for (const bar of bars) {
		const samples = pipeline.extractor(bar, ctx);
		for (const s of samples) {
			if (!Number.isFinite(s.price)) continue;
			const metrics: Record<string, number> = {};
			for (const m of template.metrics) {
				metrics[m.id] = sanitizeMetricValue(s.metrics[m.id] ?? 0);
			}
			flatSamples.push({ price: s.price, metrics });
		}
	}

	if (flatSamples.length === 0) {
		return {
			rows: [],
			barCount: bars.length,
			warning: 'Bars in range produced no price-level samples. Check extractor or data shape.',
		};
	}

	let rows = pipeline.aggregator(flatSamples, ctx);

	if (rows.length === 0) {
		rows = defaultBinningAggregator(flatSamples, ctx);
	}

	if (rows.length === 0) {
		return {
			rows: [],
			barCount: bars.length,
			warning: 'Aggregation produced zero rows.',
		};
	}

	return { rows, barCount: bars.length };
}

/**
 * Default binning aggregator — sums metrics into price buckets.
 * Used as fallback and by the built-in `sum-binned` pipeline.
 */
export function defaultBinningAggregator(
	samples: readonly PriceLevelSample[],
	ctx: ProfilePipelineContext,
): ProfileRow[] {
	const prices = samples.map((s) => s.price);
	const sampleBounds = boundsFromPrices(prices);
	if (!sampleBounds) {
		return [];
	}

	let bounds = sampleBounds;
	for (const bar of ctx.bars) {
		if (!isOhlcBar(bar)) continue;
		bounds = {
			low: Math.min(bounds.low, bar.low),
			high: Math.max(bounds.high, bar.high),
		};
	}

	const step = computeRowStep(ctx.template.rowLayout, bounds, ctx.tickSize);
	if (step <= 0) {
		return [];
	}

	return binSamplesWithMaxRows(
		samples,
		bounds,
		step,
		ctx.tickSize,
		ctx.template.rowLayout,
		ctx.template.metrics,
	);
}
