import type { BarSampleExtractor, PriceLevelSample } from '../types/pipeline';
import { isOhlcBar } from '../pipeline/binning';

export interface OhlcVolumeExtractorOptions {
	/** When true and close > open, assign full bar volume to buy; else to sell. */
	readonly useCloseOpenFallback?: boolean;
}

/**
 * Fallback extractor when tick/trades data is unavailable.
 * Distributes bar volume to close price only (single sample per bar).
 */
export function createOhlcVolumeExtractor(
	options: OhlcVolumeExtractorOptions = {},
): BarSampleExtractor {
	const useFallback = options.useCloseOpenFallback ?? true;

	return (bar) => {
		if (!isOhlcBar(bar)) {
			return [];
		}

		const volume = Number.isFinite(bar.volume) && (bar.volume as number) > 0 ? (bar.volume as number) : 0;
		if (volume <= 0) {
			return [];
		}

		const price = bar.close;
		if (useFallback) {
			const isUp = bar.close > bar.open;
			return [
				{
					price,
					metrics: {
						volume,
						buy: isUp ? volume : 0,
						sell: isUp ? 0 : volume,
					},
				},
			];
		}

		return [{ price, metrics: { volume, buy: 0, sell: 0 } }];
	};
}

export interface TradesByPriceExtractorOptions {
	/** Path to trades map on bar object (dot-separated). Default: `tradesByPrice`. */
	readonly field?: string;
	/** When trades are signed (+ buy, - sell), set true. Default: true. */
	readonly signedTrades?: boolean;
	/** Custom metric ids for buy/sell/total when mapping signed trades. */
	readonly metricIds?: { volume: string; buy: string; sell: string };
}

function readPath(obj: unknown, path: string): unknown {
	const parts = path.split('.');
	let cur: unknown = obj;
	for (const p of parts) {
		if (cur == null || typeof cur !== 'object') return undefined;
		cur = (cur as Record<string, unknown>)[p];
	}
	return cur;
}

/**
 * Extracts samples from a bar shaped like `{ tradesByPrice: { [price: string]: number[] } }`.
 * Also accepts `{ trades_by_price: ... }` via field option.
 */
export function createTradesByPriceExtractor(
	options: TradesByPriceExtractorOptions = {},
): BarSampleExtractor {
	const field = options.field ?? 'tradesByPrice';
	const signed = options.signedTrades ?? true;
	const ids = options.metricIds ?? { volume: 'volume', buy: 'buy', sell: 'sell' };

	return (bar) => {
		const raw = readPath(bar, field) ?? readPath(bar, 'trades_by_price');
		if (!raw || typeof raw !== 'object') {
			return [];
		}

		const out: PriceLevelSample[] = [];
		for (const [priceKey, trades] of Object.entries(raw as Record<string, unknown>)) {
			const price = Number(priceKey);
			if (!Number.isFinite(price)) continue;

			let buy = 0;
			let sell = 0;

			if (Array.isArray(trades)) {
				for (const t of trades) {
					const n = Number(t);
					if (!Number.isFinite(n)) continue;
					if (signed) {
						if (n >= 0) buy += n;
						else sell += Math.abs(n);
					} else {
						buy += Math.abs(n);
					}
				}
			} else if (typeof trades === 'object' && trades !== null) {
				const rec = trades as Record<string, number>;
				buy = Number(rec.buy ?? rec.b ?? 0) || 0;
				sell = Number(rec.sell ?? rec.s ?? 0) || 0;
				if (!signed && buy === 0 && sell === 0) {
					const total = Number(rec.volume ?? rec.total ?? 0) || 0;
					buy = total;
				}
			} else {
				const n = Number(trades);
				if (Number.isFinite(n) && n > 0) {
					buy = n;
				}
			}

			const volume = buy + sell;
			if (volume <= 0) continue;

			out.push({
				price,
				metrics: {
					[ids.volume]: volume,
					[ids.buy]: buy,
					[ids.sell]: sell,
				},
			});
		}
		return out;
	};
}

/**
 * Fully generic extractor — reads numeric values at price keys from a nested map.
 *
 * @example
 * createMapFieldExtractor({
 *   field: 'features.customMetric',
 *   priceKeyParser: (k) => parseFloat(k),
 *   metricId: 'openInterest',
 * })
 */
export interface MapFieldExtractorOptions {
	readonly field: string;
	readonly metricId: string;
	readonly priceKeyParser?: (key: string) => number;
}

export function createMapFieldExtractor(options: MapFieldExtractorOptions): BarSampleExtractor {
	const parse = options.priceKeyParser ?? ((k) => Number(k));

	return (bar) => {
		const raw = readPath(bar, options.field);
		if (!raw || typeof raw !== 'object') {
			return [];
		}

		const out: PriceLevelSample[] = [];
		for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
			const price = parse(key);
			const magnitude = Number(value);
			if (!Number.isFinite(price) || !Number.isFinite(magnitude) || magnitude === 0) {
				continue;
			}
			out.push({
				price,
				metrics: { [options.metricId]: magnitude },
			});
		}
		return out;
	};
}
