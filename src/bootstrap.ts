import { createOhlcVolumeExtractor, createTradesByPriceExtractor } from './extractors';
import { createSumBinnedAggregator } from './aggregators';
import { registerBuiltinProfilePipelines } from './pipeline/registry';

let builtinsRegistered = false;

/** Idempotent — registers ohlc-volume, trades-by-price, and sum-binned pipelines. */
export function ensureBuiltinProfilePipelines(): void {
	if (builtinsRegistered) {
		return;
	}
	registerBuiltinProfilePipelines({
		ohlcVolumeExtractor: createOhlcVolumeExtractor({ useCloseOpenFallback: true }),
		tradesByPriceExtractor: createTradesByPriceExtractor(),
		sumBinnedAggregator: createSumBinnedAggregator(),
	});
	builtinsRegistered = true;
}

export function resetBuiltinProfilePipelinesForTests(): void {
	builtinsRegistered = false;
}
