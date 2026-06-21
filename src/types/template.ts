/**
 * Serializable profile template — drives layout, colors, metrics, and level markers.
 * Templates are persisted in tool options and can be swapped at runtime via applyOptions.
 */

/** How histogram rows are bucketed along the price axis. */
export type ProfileRowLayoutMode = 'rowCount' | 'tickSize';

export interface ProfileRowLayout {
	readonly mode: ProfileRowLayoutMode;
	/** rowCount: target number of rows; tickSize: price step per row (must be > 0). */
	readonly value: number;
	readonly maxRows?: number;
}

/** Role of a metric channel within a row (drives default coloring in split/delta modes). */
export type ProfileMetricRole = 'magnitude' | 'positive' | 'negative' | 'neutral';

export interface ProfileMetricDefinition {
	readonly id: string;
	readonly label: string;
	readonly role: ProfileMetricRole;
	readonly color: string;
	readonly opacity?: number;
}

/** Which metric drives bar width and POC/VA calculations. */
export interface ProfileMetricBinding {
	/** Primary metric for histogram width normalization and POC. */
	readonly magnitudeMetricId: string;
	/** Optional positive leg (e.g. buy volume) for split rendering. */
	readonly positiveMetricId?: string;
	/** Optional negative leg (e.g. sell volume) for split rendering. */
	readonly negativeMetricId?: string;
}

export type ProfileDisplayMode = 'total' | 'split' | 'delta';

export interface ProfileHistogramStyle {
	readonly anchor: 'rangeRight' | 'rangeLeft';
	/** Max fraction of range width used at full magnitude (0–1]. */
	readonly maxWidthFraction: number;
	/** After normalizing to [0,1], apply frac^gamma before width mapping. */
	readonly lengthGamma: number;
	readonly rowHeightPx: number;
	readonly minRowHeightPx: number;
	readonly gapPx: number;
	readonly backgroundColor: string;
	readonly backgroundOpacity: number;
	readonly borderColor: string;
	readonly borderWidth: number;
}

export interface ProfileLevelMarkers {
	readonly showPoc: boolean;
	readonly showValueArea: boolean;
	readonly valueAreaFraction: number;
	readonly pocColor: string;
	readonly valueAreaColor: string;
	readonly levelLineWidth: number;
	readonly levelLineStyle: 'solid' | 'dashed' | 'dotted';
}

export interface ProfileRangeChrome {
	readonly showSelectionBox: boolean;
	readonly boxBorderColor: string;
	readonly boxBackgroundColor: string;
	readonly boxBackgroundOpacity: number;
	readonly extendRight: boolean;
}

export interface ProfileEmptyState {
	readonly showPlaceholder: boolean;
	readonly message: string;
	readonly color: string;
}

/**
 * Full template configuration. All visual and structural behaviour is derived from this object.
 */
export interface ProfileTemplate {
	readonly id: string;
	readonly label: string;
	readonly rowLayout: ProfileRowLayout;
	readonly metrics: readonly ProfileMetricDefinition[];
	readonly metricBinding: ProfileMetricBinding;
	readonly displayMode: ProfileDisplayMode;
	readonly histogram: ProfileHistogramStyle;
	readonly levels: ProfileLevelMarkers;
	readonly range: ProfileRangeChrome;
	readonly emptyState: ProfileEmptyState;
}

/** One price bucket after aggregation. */
export interface ProfileRow {
	readonly price: number;
	readonly priceLow: number;
	readonly priceHigh: number;
	readonly metrics: Readonly<Record<string, number>>;
}

/** Computed snapshot attached to tool state (optional cache for export / debug). */
export interface ProfileComputedSnapshot {
	readonly barCount: number;
	readonly rowCount: number;
	readonly maxMagnitude: number;
	readonly pocPrice: number | null;
	readonly valueAreaHigh: number | null;
	readonly valueAreaLow: number | null;
	readonly rows: readonly ProfileRow[];
	readonly computedAt: number;
	readonly warning?: string;
}

/** Normalized time range for profile resolution. */
export interface ProfileTimeRange {
	readonly from: number;
	readonly to: number;
}

/** Price bounds used for row binning and selection box. */
export interface ProfilePriceBounds {
	readonly low: number;
	readonly high: number;
}

export const FIXED_RANGE_PROFILE_TOOL_TYPE = 'FixedRangeProfile' as const;
