import type { LineToolFixedRangeProfileOptions } from '../types/options';
import type { ProfilePipelineDefinition } from '../types/pipeline';
import { FIXED_RANGE_PROFILE_TOOL_TYPE } from '../types/template';
/** Export payload for opening/applying profile tool options. */
export interface FixedRangeProfileToolExport {
    readonly id: string;
    readonly toolType: typeof FIXED_RANGE_PROFILE_TOOL_TYPE;
    readonly points?: ReadonlyArray<{
        readonly timestamp: number;
        readonly price: number;
    }>;
    readonly options: LineToolFixedRangeProfileOptions;
}
/** Minimal line-tools API surface required by the editor. */
export interface ProfilePropertiesLineToolsApi {
    applyLineToolOptions(toolData: FixedRangeProfileToolExport): boolean;
    /** Optional — refreshes computed snapshot stats after live preview. */
    getLineToolByID?(id: string): string;
}
export interface ProfilePropertiesEditorOptions {
    /** Debounce live preview updates (ms). Default 150. */
    readonly livePreviewDebounceMs?: number;
    /** Pipeline list for the data-source dropdown. Default: empty (caller should supply). */
    readonly getPipelines?: () => readonly ProfilePipelineDefinition[];
    /** Called after Apply or successful live preview. */
    readonly onApply?: (toolId: string, options: LineToolFixedRangeProfileOptions) => void;
    /** Called when the dialog closes (Apply, Cancel, or backdrop). */
    readonly onClose?: () => void;
}
type ToolExport = FixedRangeProfileToolExport;
/**
 * Modal properties editor for FixedRangeProfile line tools.
 * Double-click integration: use {@link attachProfilePropertiesEditor}.
 */
export declare class ProfilePropertiesEditor {
    private readonly _lineTools;
    private readonly _options;
    private _root;
    private _toolId;
    private _toolPoints;
    private _draft;
    private _baseline;
    private _previewTimer;
    private _metricsContainer;
    private _statsEl;
    private _liveLabel;
    constructor(lineTools: ProfilePropertiesLineToolsApi, options?: ProfilePropertiesEditorOptions);
    isOpen(): boolean;
    open(toolExport: ToolExport): void;
    close(): void;
    destroy(): void;
    private _ensureDom;
    private _onKeyDown;
    private _template;
    private _snapshot;
    private _renderAll;
    private _renderPresets;
    private _renderMetricCards;
    private _renderMetricCardsContent;
    private _updateMetric;
    private _metricField;
    private _metricSelectField;
    private _metricColorField;
    private _metricRangeField;
    private _renderSection;
    private _renderField;
    private _colorInput;
    private _rangeInput;
    private _setField;
    private _renderStats;
    private _updateStats;
    private _resetToDefaults;
    private _schedulePreview;
    private _buildOptions;
    private _refreshDraftFromTool;
    private _apply;
    private _revertAndClose;
}
export {};
