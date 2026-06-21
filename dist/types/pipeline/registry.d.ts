import type { ProfilePipelineDefinition } from '../types/pipeline';
export declare function registerProfilePipeline(definition: ProfilePipelineDefinition): void;
export declare function unregisterProfilePipeline(id: string): void;
export declare function getProfilePipeline(id: string): ProfilePipelineDefinition | undefined;
export declare function listProfilePipelines(): readonly ProfilePipelineDefinition[];
export declare function clearProfilePipelines(): void;
/** Registers built-in volume / delta / custom-sum pipelines. Idempotent. */
export declare function registerBuiltinProfilePipelines(deps: {
    ohlcVolumeExtractor: ProfilePipelineDefinition['extractor'];
    tradesByPriceExtractor: ProfilePipelineDefinition['extractor'];
    sumBinnedAggregator: ProfilePipelineDefinition['aggregator'];
}): void;
