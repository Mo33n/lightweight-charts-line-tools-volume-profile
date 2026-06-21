import type { ProfileAggregator } from '../types/pipeline';
import {
	boundsFromPrices,
	bucketPrice,
	computeRowStep,
	sanitizeMetricValue,
	rowsFromBuckets,
} from '../pipeline/binning';
import { defaultBinningAggregator } from '../pipeline/resolve-profile';

/** Sum samples into binned rows (default behaviour). */
export function createSumBinnedAggregator(): ProfileAggregator {
	return (samples, ctx) => defaultBinningAggregator(samples, ctx);
}

/** Average samples per bucket instead of sum. */
export function createAverageBinnedAggregator(): ProfileAggregator {
	return (samples, ctx) => {
		const rows = defaultBinningAggregator(samples, ctx);
		if (samples.length === 0 || ctx.bars.length === 0) {
			return rows;
		}
		const divisor = ctx.bars.length;
		return rows.map((row) => {
			const metrics: Record<string, number> = {};
			for (const [k, v] of Object.entries(row.metrics)) {
				metrics[k] = v / divisor;
			}
			return { ...row, metrics };
		});
	};
}

/** Max value per bucket (useful for peak metrics, not cumulative volume). */
export function createMaxBinnedAggregator(): ProfileAggregator {
	return (samples, ctx) => {
		const prices = samples.map((s) => s.price);
		const bounds = boundsFromPrices(prices);
		if (!bounds) return [];

		const step = computeRowStep(ctx.template.rowLayout, bounds, ctx.tickSize);
		if (step <= 0) return [];

		const accumulateMax = (stepSize: number): Map<number, Record<string, number>> => {
			const buckets = new Map<number, Record<string, number>>();
			for (const sample of samples) {
				const key = bucketPrice(sample.price, bounds.low, stepSize);
				let acc = buckets.get(key);
				if (!acc) {
					acc = {};
					for (const m of ctx.template.metrics) {
						acc[m.id] = 0;
					}
					buckets.set(key, acc);
				}
				for (const m of ctx.template.metrics) {
					const v = sanitizeMetricValue(sample.metrics[m.id] ?? 0);
					acc[m.id] = Math.max(acc[m.id] ?? 0, v);
				}
			}
			return buckets;
		};

		let effectiveStep = step;
		let buckets = accumulateMax(effectiveStep);
		const maxRows = ctx.template.rowLayout.maxRows ?? 500;
		if (buckets.size > maxRows) {
			const span = Math.max(bounds.high - bounds.low, ctx.tickSize);
			effectiveStep = span / maxRows;
			if (effectiveStep <= 0) return [];
			buckets = accumulateMax(effectiveStep);
		}

		return rowsFromBuckets(buckets, effectiveStep, ctx.template.metrics);
	};
}
