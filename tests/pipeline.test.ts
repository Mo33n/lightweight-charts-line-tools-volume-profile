import { describe, expect, it } from 'vitest';
import { normalizeTimeRange, bucketPrice, computeRowStep, sanitizeMetricValue, binSamplesWithMaxRows } from '../src/pipeline/binning';
import { buildProfileSnapshotCacheKey } from '../src/pipeline/snapshot-cache-key';
import { resolveProfile } from '../src/pipeline/resolve-profile';
import { computeValueArea } from '../src/pipeline/value-area';
import { DEFAULT_VOLUME_PROFILE_TEMPLATE, mergeProfileTemplate } from '../src/templates/defaults';
import { createOhlcVolumeExtractor } from '../src/extractors';
import { createSumBinnedAggregator } from '../src/aggregators';

describe('normalizeTimeRange', () => {
	it('swaps inverted ranges', () => {
		expect(normalizeTimeRange(200, 100)).toEqual({ from: 100, to: 200 });
	});

	it('handles non-finite input', () => {
		expect(normalizeTimeRange(NaN, 100)).toEqual({ from: 0, to: 0 });
	});
});

describe('binning', () => {
	it('buckets prices into stable rows', () => {
		expect(bucketPrice(105.3, 100, 5)).toBe(105);
	});

	it('sanitizes non-finite metrics', () => {
		expect(sanitizeMetricValue(NaN)).toBe(0);
		expect(sanitizeMetricValue(42)).toBe(42);
	});

	it('computes row step from rowCount layout', () => {
		const step = computeRowStep(
			{ mode: 'rowCount', value: 10 },
			{ low: 100, high: 110 },
			0.01,
		);
		expect(step).toBeCloseTo(1);
	});
});

describe('resolveProfile', () => {
	const pipeline = {
		id: 'test',
		label: 'test',
		extractor: createOhlcVolumeExtractor(),
		aggregator: createSumBinnedAggregator(),
	};

	it('returns empty with warning when no bars', () => {
		const r = resolveProfile({
			template: DEFAULT_VOLUME_PROFILE_TEMPLATE,
			range: { from: 1, to: 2 },
			bars: [],
			pipeline,
		});
		expect(r.rows).toHaveLength(0);
		expect(r.warning).toBeTruthy();
	});

	it('aggregates OHLC volume across bars', () => {
		const bars = [
			{ time: 1, open: 100, high: 102, low: 99, close: 101, volume: 10 },
			{ time: 2, open: 101, high: 103, low: 100, close: 100, volume: 20 },
		];
		const r = resolveProfile({
			template: DEFAULT_VOLUME_PROFILE_TEMPLATE,
			range: { from: 1, to: 2 },
			bars,
			pipeline,
		});
		expect(r.barCount).toBe(2);
		expect(r.rows.length).toBeGreaterThan(0);
		const totalVol = r.rows.reduce((s, row) => s + (row.metrics.volume ?? 0), 0);
		expect(totalVol).toBe(30);
	});

	it('warns when bars produce no samples (zero volume)', () => {
		const bars = [{ time: 1, open: 100, high: 101, low: 99, close: 100, volume: 0 }];
		const r = resolveProfile({
			template: DEFAULT_VOLUME_PROFILE_TEMPLATE,
			range: { from: 1, to: 1 },
			bars,
			pipeline,
		});
		expect(r.rows).toHaveLength(0);
		expect(r.warning).toMatch(/no price-level samples/i);
	});
});

describe('computeValueArea', () => {
	it('finds POC at max volume row', () => {
		const rows = [
			{ price: 99, priceLow: 98, priceHigh: 100, metrics: { volume: 5, buy: 5, sell: 0 } },
			{ price: 101, priceLow: 100, priceHigh: 102, metrics: { volume: 50, buy: 30, sell: 20 } },
			{ price: 103, priceLow: 102, priceHigh: 104, metrics: { volume: 10, buy: 6, sell: 4 } },
		];
		const va = computeValueArea(rows, DEFAULT_VOLUME_PROFILE_TEMPLATE);
		expect(va.pocPrice).toBe(101);
		expect(va.maxMagnitude).toBe(50);
		expect(va.valueAreaLow).not.toBeNull();
		expect(va.valueAreaHigh).not.toBeNull();
	});

	it('narrows value area when fraction decreases', () => {
		const rows = [
			{ price: 98, priceLow: 97, priceHigh: 99, metrics: { volume: 15, buy: 15, sell: 0 } },
			{ price: 99, priceLow: 98, priceHigh: 100, metrics: { volume: 25, buy: 25, sell: 0 } },
			{ price: 100, priceLow: 99, priceHigh: 101, metrics: { volume: 40, buy: 40, sell: 0 } },
			{ price: 101, priceLow: 100, priceHigh: 102, metrics: { volume: 12, buy: 12, sell: 0 } },
			{ price: 102, priceLow: 101, priceHigh: 103, metrics: { volume: 8, buy: 8, sell: 0 } },
		];
		const wide = computeValueArea(
			rows,
			mergeProfileTemplate(DEFAULT_VOLUME_PROFILE_TEMPLATE, {
				levels: { ...DEFAULT_VOLUME_PROFILE_TEMPLATE.levels, valueAreaFraction: 0.9 },
			}),
		);
		const narrow = computeValueArea(
			rows,
			mergeProfileTemplate(DEFAULT_VOLUME_PROFILE_TEMPLATE, {
				levels: { ...DEFAULT_VOLUME_PROFILE_TEMPLATE.levels, valueAreaFraction: 0.4 },
			}),
		);
		const wideSpan = wide.valueAreaHigh! - wide.valueAreaLow!;
		const narrowSpan = narrow.valueAreaHigh! - narrow.valueAreaLow!;
		expect(narrowSpan).toBeLessThan(wideSpan);
	});

	it('returns null POC when magnitude metric id is invalid', () => {
		const rows = [
			{ price: 100, priceLow: 99, priceHigh: 101, metrics: { volume: 10, buy: 10, sell: 0 } },
		];
		const va = computeValueArea(
			rows,
			mergeProfileTemplate(DEFAULT_VOLUME_PROFILE_TEMPLATE, {
				metricBinding: { magnitudeMetricId: 'missing', positiveMetricId: 'buy', negativeMetricId: 'sell' },
			}),
		);
		expect(va.pocPrice).toBeNull();
		expect(va.maxMagnitude).toBe(0);
	});
});

describe('binSamplesWithMaxRows', () => {
	it('coarsens step when bucket count exceeds maxRows', () => {
		const metrics = [{ id: 'v', label: 'V', role: 'magnitude' as const, color: '#fff' }];
		const samples = [];
		for (let p = 100; p < 200; p += 0.1) {
			samples.push({ price: p, metrics: { v: 1 } });
		}
		const bounds = { low: 100, high: 200 };
		const rows = binSamplesWithMaxRows(
			samples,
			bounds,
			0.1,
			0.01,
			{ mode: 'tickSize', value: 0.1, maxRows: 20 },
			metrics,
		);
		expect(rows.length).toBeLessThanOrEqual(20);
		const total = rows.reduce((s, r) => s + r.metrics.v, 0);
		expect(total).toBe(samples.length);
	});
});

describe('buildProfileSnapshotCacheKey', () => {
	it('changes when tick size or metric binding changes', () => {
		const range = { from: 1, to: 2 };
		const base = {
			template: DEFAULT_VOLUME_PROFILE_TEMPLATE,
			pipelineId: 'ohlc-volume',
		};
		const k1 = buildProfileSnapshotCacheKey(range, base, 2);
		const k2 = buildProfileSnapshotCacheKey(range, { ...base, tickSize: 0.5 }, 2);
		const k3 = buildProfileSnapshotCacheKey(
			range,
			{
				...base,
				template: mergeProfileTemplate(DEFAULT_VOLUME_PROFILE_TEMPLATE, {
					metricBinding: { magnitudeMetricId: 'buy', positiveMetricId: 'buy', negativeMetricId: 'sell' },
				}),
			},
			2,
		);
		expect(k2).not.toBe(k1);
		expect(k3).not.toBe(k1);
	});
});
