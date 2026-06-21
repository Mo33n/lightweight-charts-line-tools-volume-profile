import type { BarSampleExtractor } from '../types/pipeline';
export interface OhlcVolumeExtractorOptions {
    /** When true and close > open, assign full bar volume to buy; else to sell. */
    readonly useCloseOpenFallback?: boolean;
}
/**
 * Fallback extractor when tick/trades data is unavailable.
 * Distributes bar volume to close price only (single sample per bar).
 */
export declare function createOhlcVolumeExtractor(options?: OhlcVolumeExtractorOptions): BarSampleExtractor;
export interface TradesByPriceExtractorOptions {
    /** Path to trades map on bar object (dot-separated). Default: `tradesByPrice`. */
    readonly field?: string;
    /** When trades are signed (+ buy, - sell), set true. Default: true. */
    readonly signedTrades?: boolean;
    /** Custom metric ids for buy/sell/total when mapping signed trades. */
    readonly metricIds?: {
        volume: string;
        buy: string;
        sell: string;
    };
}
/**
 * Extracts samples from a bar shaped like `{ tradesByPrice: { [price: string]: number[] } }`.
 * Also accepts `{ trades_by_price: ... }` via field option.
 */
export declare function createTradesByPriceExtractor(options?: TradesByPriceExtractorOptions): BarSampleExtractor;
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
export declare function createMapFieldExtractor(options: MapFieldExtractorOptions): BarSampleExtractor;
