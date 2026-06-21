import type { ProfilePriceBounds, ProfileRowLayout, ProfileTimeRange, ProfileRow, ProfileMetricDefinition } from '../types/template';
import type { PriceLevelSample } from '../types/pipeline';

export function normalizeTimeRange(from: number, to: number): ProfileTimeRange {
	if (!Number.isFinite(from) || !Number.isFinite(to)) {
		return { from: 0, to: 0 };
	}
	return from <= to ? { from, to } : { from: to, to: from };
}

export function resolveTickSize(explicit: number | undefined, fallback: number): number {
	if (explicit != null && Number.isFinite(explicit) && explicit > 0) {
		return explicit;
	}
	if (Number.isFinite(fallback) && fallback > 0) {
		return fallback;
	}
	return 0.01;
}

export function computeRowStep(
	layout: ProfileRowLayout,
	priceBounds: ProfilePriceBounds,
	tickSize: number,
): number {
	const span = Math.max(priceBounds.high - priceBounds.low, tickSize);
	const maxRows = layout.maxRows ?? 500;

	if (layout.mode === 'tickSize') {
		const step = layout.value > 0 ? layout.value : tickSize;
		return step;
	}

	const targetRows = Math.max(1, Math.min(Math.floor(layout.value), maxRows));
	return span / targetRows;
}

export function bucketPrice(price: number, low: number, step: number): number {
	if (!Number.isFinite(price) || step <= 0) {
		return price;
	}
	const idx = Math.floor((price - low) / step);
	return low + idx * step;
}

export function sanitizeMetricValue(value: number): number {
	if (!Number.isFinite(value) || value === 0) {
		return 0;
	}
	return value;
}

export function mergePriceBounds(
	a: ProfilePriceBounds | null,
	b: ProfilePriceBounds,
): ProfilePriceBounds {
	if (!a) {
		return { ...b };
	}
	return {
		low: Math.min(a.low, b.low),
		high: Math.max(a.high, b.high),
	};
}

export function boundsFromPrices(prices: readonly number[]): ProfilePriceBounds | null {
	const finite = prices.filter((p) => Number.isFinite(p));
	if (finite.length === 0) {
		return null;
	}
	return {
		low: Math.min(...finite),
		high: Math.max(...finite),
	};
}

/** Infer tick size from OHLC bars when not explicitly provided. */
export function inferTickSizeFromBars(bars: readonly unknown[]): number {
	let minPositiveDiff = Infinity;
	for (const bar of bars) {
		if (!bar || typeof bar !== 'object') continue;
		const rec = bar as Record<string, number>;
		for (const key of ['open', 'high', 'low', 'close'] as const) {
			const v = rec[key];
			if (!Number.isFinite(v)) continue;
			const str = String(v);
			const dot = str.indexOf('.');
			if (dot >= 0) {
				const decimals = str.length - dot - 1;
				const step = Math.pow(10, -decimals);
				if (step > 0 && step < minPositiveDiff) {
					minPositiveDiff = step;
				}
			}
		}
	}
	return Number.isFinite(minPositiveDiff) && minPositiveDiff < Infinity ? minPositiveDiff : 0.01;
}

export function isOhlcBar(bar: unknown): bar is {
	time: unknown;
	open: number;
	high: number;
	low: number;
	close: number;
	volume?: number;
} {
	if (!bar || typeof bar !== 'object') return false;
	const b = bar as Record<string, unknown>;
	return (
		Number.isFinite(b.open as number) &&
		Number.isFinite(b.high as number) &&
		Number.isFinite(b.low as number) &&
		Number.isFinite(b.close as number)
	);
}

/** Sum samples into price buckets at the given step. */
export function sumSamplesIntoBuckets(
	samples: readonly PriceLevelSample[],
	bounds: ProfilePriceBounds,
	step: number,
	metrics: readonly ProfileMetricDefinition[],
): Map<number, Record<string, number>> {
	const buckets = new Map<number, Record<string, number>>();
	for (const sample of samples) {
		const key = bucketPrice(sample.price, bounds.low, step);
		let acc = buckets.get(key);
		if (!acc) {
			acc = {};
			for (const m of metrics) {
				acc[m.id] = 0;
			}
			buckets.set(key, acc);
		}
		for (const m of metrics) {
			acc[m.id] = (acc[m.id] ?? 0) + sanitizeMetricValue(sample.metrics[m.id] ?? 0);
		}
	}
	return buckets;
}

/** Convert bucket map to profile rows. */
export function rowsFromBuckets(
	buckets: Map<number, Record<string, number>>,
	step: number,
	metrics: readonly ProfileMetricDefinition[],
): ProfileRow[] {
	const sortedKeys = [...buckets.keys()].sort((a, b) => a - b);
	return sortedKeys.map((priceLow) => {
		const raw = buckets.get(priceLow)!;
		const outMetrics: Record<string, number> = {};
		for (const m of metrics) {
			outMetrics[m.id] = sanitizeMetricValue(raw[m.id] ?? 0);
		}
		return {
			price: priceLow + step / 2,
			priceLow,
			priceHigh: priceLow + step,
			metrics: outMetrics,
		};
	});
}

/**
 * When tick-size binning produces more buckets than maxRows, re-bin with a coarser step
 * so high-volume price levels are not silently dropped from the top of the range.
 */
export function binSamplesWithMaxRows(
	samples: readonly PriceLevelSample[],
	bounds: ProfilePriceBounds,
	initialStep: number,
	tickSize: number,
	layout: ProfileRowLayout,
	metrics: readonly ProfileMetricDefinition[],
): ProfileRow[] {
	const maxRows = layout.maxRows ?? 500;
	let step = initialStep > 0 ? initialStep : tickSize;
	if (step <= 0) {
		return [];
	}

	let buckets = sumSamplesIntoBuckets(samples, bounds, step, metrics);
	if (buckets.size > maxRows) {
		const span = Math.max(bounds.high - bounds.low, tickSize);
		step = span / maxRows;
		if (step <= 0) {
			return [];
		}
		buckets = sumSamplesIntoBuckets(samples, bounds, step, metrics);
	}

	return rowsFromBuckets(buckets, step, metrics);
}
