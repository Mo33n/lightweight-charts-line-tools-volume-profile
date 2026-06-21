import type { ProfilePipelineDefinition } from '../types/pipeline';

const pipelines = new Map<string, ProfilePipelineDefinition>();

export function registerProfilePipeline(definition: ProfilePipelineDefinition): void {
	if (pipelines.has(definition.id)) {
		console.warn(
			`[FixedRangeProfile] Pipeline "${definition.id}" is already registered and will be overwritten.`,
		);
	}
	pipelines.set(definition.id, definition);
}

export function unregisterProfilePipeline(id: string): void {
	pipelines.delete(id);
}

export function getProfilePipeline(id: string): ProfilePipelineDefinition | undefined {
	return pipelines.get(id);
}

export function listProfilePipelines(): readonly ProfilePipelineDefinition[] {
	return [...pipelines.values()];
}

export function clearProfilePipelines(): void {
	pipelines.clear();
}

/** Registers built-in volume / delta / custom-sum pipelines. Idempotent. */
export function registerBuiltinProfilePipelines(deps: {
	ohlcVolumeExtractor: ProfilePipelineDefinition['extractor'];
	tradesByPriceExtractor: ProfilePipelineDefinition['extractor'];
	sumBinnedAggregator: ProfilePipelineDefinition['aggregator'];
}): void {
	registerProfilePipeline({
		id: 'ohlc-volume',
		label: 'OHLC volume (fallback)',
		extractor: deps.ohlcVolumeExtractor,
		aggregator: deps.sumBinnedAggregator,
	});
	registerProfilePipeline({
		id: 'trades-by-price',
		label: 'Trades by price',
		extractor: deps.tradesByPriceExtractor,
		aggregator: deps.sumBinnedAggregator,
	});
	registerProfilePipeline({
		id: 'sum-binned',
		label: 'Generic sum (requires pre-shaped bar samples)',
		extractor: () => [],
		aggregator: deps.sumBinnedAggregator,
	});
}
