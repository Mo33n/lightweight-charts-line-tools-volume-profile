/**
 * Fixed-range price-level profile line tool for lightweight-charts-line-tools-core.
 *
 * Config/template driven with pluggable bar extractors and aggregators.
 */
export { LineToolFixedRangeProfile } from './model/line-tool-fixed-range-profile';
export type { RangeGeometry } from './model/line-tool-fixed-range-profile';
export { ensureBuiltinProfilePipelines, resetBuiltinProfilePipelinesForTests } from './bootstrap';
export { registerProfilePipeline, unregisterProfilePipeline, getProfilePipeline, listProfilePipelines, clearProfilePipelines, registerBuiltinProfilePipelines, } from './pipeline/registry';
export { resolveProfile, defaultBinningAggregator } from './pipeline/resolve-profile';
export { computeValueArea, clampValueAreaFraction } from './pipeline/value-area';
export { registerProfileBarSource, getProfileBarSource, barTimeToKey, } from './pipeline/bar-source';
export { normalizeTimeRange, resolveTickSize, computeRowStep, bucketPrice, sanitizeMetricValue, inferTickSizeFromBars, isOhlcBar, } from './pipeline/binning';
export { createOhlcVolumeExtractor, createTradesByPriceExtractor, createMapFieldExtractor, } from './extractors';
export type { OhlcVolumeExtractorOptions, TradesByPriceExtractorOptions, MapFieldExtractorOptions, } from './extractors';
export { createSumBinnedAggregator, createAverageBinnedAggregator, createMaxBinnedAggregator, } from './aggregators';
export { DEFAULT_VOLUME_PROFILE_TEMPLATE, DEFAULT_DELTA_PROFILE_TEMPLATE, mergeProfileTemplate, } from './templates/defaults';
export { createDefaultFixedRangeProfileOptions, mergeFixedRangeProfileOptions, } from './utils/merge-options';
export { ProfilePropertiesEditor, type ProfilePropertiesEditorOptions, type ProfilePropertiesLineToolsApi, type FixedRangeProfileToolExport, } from './ui/profile-properties-editor';
export { attachProfilePropertiesEditor, type AttachProfilePropertiesEditorOptions, type ProfilePropertiesEditorHandle, } from './ui/attach-profile-properties-editor';
export { PROFILE_PROPERTY_SECTIONS, METRIC_ROLE_OPTIONS, getPropertyPath, setPropertyPath, cloneEditorState, type ProfilePropertySection, type ProfilePropertyField, } from './ui/profile-properties-schema';
export { FIXED_RANGE_PROFILE_TOOL_TYPE, } from './types/template';
export type { ProfileTemplate, ProfileRow, ProfileMetricDefinition, ProfileMetricBinding, ProfileDisplayMode, ProfileComputedSnapshot, ProfileRowLayout, ProfileHistogramStyle, ProfileLevelMarkers, ProfileRangeChrome, ProfileEmptyState, ProfileTimeRange, } from './types/template';
export type { PriceLevelSample, ProfilePipelineContext, BarSampleExtractor, ProfileAggregator, ProfilePipelineDefinition, ProfileResolveResult, ProfileResolveOptions, } from './types/pipeline';
export type { LineToolFixedRangeProfileOptions, LineToolFixedRangeProfileSpecificOptions, DeepPartialFixedRangeProfileOptions, } from './types/options';
/** Tool type string for registerLineTool / addLineTool. */
export declare const LINE_TOOL_FIXED_RANGE_PROFILE: "FixedRangeProfile";
