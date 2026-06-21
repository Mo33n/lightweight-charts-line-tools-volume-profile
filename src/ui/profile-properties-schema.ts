import type { ProfileMetricRole, ProfileTemplate } from '../types/template';

/** Supported control kinds for the properties editor. */
export type ProfilePropertyFieldType =
	| 'text'
	| 'number'
	| 'range'
	| 'checkbox'
	| 'select'
	| 'color'
	| 'percent'
	| 'metricSelect';

export interface ProfilePropertySelectOption {
	readonly value: string;
	readonly label: string;
}

export interface ProfilePropertyField {
	readonly id: string;
	readonly label: string;
	readonly path: string;
	readonly type: ProfilePropertyFieldType;
	readonly hint?: string;
	readonly min?: number;
	readonly max?: number;
	readonly step?: number;
	readonly options?: readonly ProfilePropertySelectOption[];
	/** Hide when predicate returns false (e.g. rowLayout.mode !== tickSize). */
	readonly visibleWhen?: (template: ProfileTemplate) => boolean;
}

export interface ProfilePropertySection {
	readonly id: string;
	readonly title: string;
	readonly description?: string;
	readonly fields: readonly ProfilePropertyField[];
}

export const PROFILE_PROPERTY_SECTIONS: readonly ProfilePropertySection[] = [
	{
		id: 'general',
		title: 'General',
		description: 'Visibility, data source, and template identity.',
		fields: [
			{ id: 'visible', label: 'Visible', path: 'visible', type: 'checkbox' },
			{ id: 'editable', label: 'Editable on chart', path: 'editable', type: 'checkbox' },
			{ id: 'templateLabel', label: 'Template label', path: 'fixedRangeProfile.template.label', type: 'text' },
			{ id: 'pipelineId', label: 'Data pipeline', path: 'fixedRangeProfile.pipelineId', type: 'select', options: [] },
			{ id: 'tickSize', label: 'Price tick size (binning fallback)', path: 'fixedRangeProfile.tickSize', type: 'number', min: 0, step: 0.0001, hint: 'Leave empty to infer from bars.' },
		],
	},
	{
		id: 'display',
		title: 'Display mode',
		description: 'How histogram rows are rendered and which metrics drive width.',
		fields: [
			{
				id: 'displayMode',
				label: 'Display mode',
				path: 'fixedRangeProfile.template.displayMode',
				type: 'select',
				options: [
					{ value: 'total', label: 'Total' },
					{ value: 'split', label: 'Up / Down split' },
					{ value: 'delta', label: 'Delta' },
				],
			},
			{
				id: 'magnitudeMetricId',
				label: 'Magnitude metric (width + POC)',
				path: 'fixedRangeProfile.template.metricBinding.magnitudeMetricId',
				type: 'metricSelect',
			},
			{
				id: 'positiveMetricId',
				label: 'Positive metric (split / delta)',
				path: 'fixedRangeProfile.template.metricBinding.positiveMetricId',
				type: 'metricSelect',
			},
			{
				id: 'negativeMetricId',
				label: 'Negative metric (split / delta)',
				path: 'fixedRangeProfile.template.metricBinding.negativeMetricId',
				type: 'metricSelect',
			},
		],
	},
	{
		id: 'layout',
		title: 'Row layout',
		description: 'Price-axis binning and histogram anchor.',
		fields: [
			{
				id: 'rowLayoutMode',
				label: 'Binning mode',
				path: 'fixedRangeProfile.template.rowLayout.mode',
				type: 'select',
				options: [
					{ value: 'rowCount', label: 'Fixed row count' },
					{ value: 'tickSize', label: 'Fixed tick size' },
				],
			},
			{
				id: 'rowLayoutValue',
				label: 'Row count',
				path: 'fixedRangeProfile.template.rowLayout.value',
				type: 'number',
				min: 1,
				max: 500,
				step: 1,
				visibleWhen: (t) => t.rowLayout.mode === 'rowCount',
			},
			{
				id: 'rowLayoutTick',
				label: 'Tick size per row',
				path: 'fixedRangeProfile.template.rowLayout.value',
				type: 'number',
				min: 0.0001,
				step: 0.0001,
				visibleWhen: (t) => t.rowLayout.mode === 'tickSize',
			},
			{
				id: 'maxRows',
				label: 'Max rows cap',
				path: 'fixedRangeProfile.template.rowLayout.maxRows',
				type: 'number',
				min: 1,
				max: 2000,
				step: 1,
			},
			{
				id: 'histogramAnchor',
				label: 'Histogram anchor',
				path: 'fixedRangeProfile.template.histogram.anchor',
				type: 'select',
				options: [
					{ value: 'rangeRight', label: 'Range right edge' },
					{ value: 'rangeLeft', label: 'Range left edge' },
				],
			},
		],
	},
	{
		id: 'histogram',
		title: 'Histogram style',
		description: 'Bar width, spacing, and fill colors.',
		fields: [
			{
				id: 'maxWidthFraction',
				label: 'Max bar width fraction',
				path: 'fixedRangeProfile.template.histogram.maxWidthFraction',
				type: 'range',
				min: 0.05,
				max: 1,
				step: 0.05,
			},
			{
				id: 'lengthGamma',
				label: 'Length gamma',
				path: 'fixedRangeProfile.template.histogram.lengthGamma',
				type: 'range',
				min: 0.25,
				max: 3,
				step: 0.05,
				hint: 'Skews bar lengths after normalization (>1 compresses small values).',
			},
			{
				id: 'rowHeightPx',
				label: 'Fixed row height (px, 0 = auto)',
				path: 'fixedRangeProfile.template.histogram.rowHeightPx',
				type: 'number',
				min: 0,
				max: 64,
				step: 1,
			},
			{
				id: 'minRowHeightPx',
				label: 'Minimum row height (px)',
				path: 'fixedRangeProfile.template.histogram.minRowHeightPx',
				type: 'number',
				min: 1,
				max: 32,
				step: 1,
			},
			{
				id: 'gapPx',
				label: 'Gap between rows (px)',
				path: 'fixedRangeProfile.template.histogram.gapPx',
				type: 'number',
				min: 0,
				max: 16,
				step: 1,
			},
			{
				id: 'backgroundColor',
				label: 'Background color',
				path: 'fixedRangeProfile.template.histogram.backgroundColor',
				type: 'color',
			},
			{
				id: 'backgroundOpacity',
				label: 'Background opacity',
				path: 'fixedRangeProfile.template.histogram.backgroundOpacity',
				type: 'range',
				min: 0,
				max: 1,
				step: 0.05,
			},
			{
				id: 'borderColor',
				label: 'Border color',
				path: 'fixedRangeProfile.template.histogram.borderColor',
				type: 'color',
			},
			{
				id: 'borderWidth',
				label: 'Border width (px)',
				path: 'fixedRangeProfile.template.histogram.borderWidth',
				type: 'number',
				min: 0,
				max: 8,
				step: 1,
			},
		],
	},
	{
		id: 'levels',
		title: 'POC & value area',
		description: 'Point of control and value area markers.',
		fields: [
			{ id: 'showPoc', label: 'Show POC line', path: 'fixedRangeProfile.template.levels.showPoc', type: 'checkbox' },
			{ id: 'showValueArea', label: 'Show value area lines', path: 'fixedRangeProfile.template.levels.showValueArea', type: 'checkbox' },
			{
				id: 'valueAreaFraction',
				label: 'Value area %',
				path: 'fixedRangeProfile.template.levels.valueAreaFraction',
				type: 'percent',
				min: 1,
				max: 100,
				step: 1,
			},
			{ id: 'pocColor', label: 'POC color', path: 'fixedRangeProfile.template.levels.pocColor', type: 'color' },
			{ id: 'valueAreaColor', label: 'Value area color', path: 'fixedRangeProfile.template.levels.valueAreaColor', type: 'color' },
			{
				id: 'levelLineWidth',
				label: 'Level line width (px)',
				path: 'fixedRangeProfile.template.levels.levelLineWidth',
				type: 'number',
				min: 1,
				max: 8,
				step: 1,
			},
			{
				id: 'levelLineStyle',
				label: 'Level line style',
				path: 'fixedRangeProfile.template.levels.levelLineStyle',
				type: 'select',
				options: [
					{ value: 'solid', label: 'Solid' },
					{ value: 'dashed', label: 'Dashed' },
					{ value: 'dotted', label: 'Dotted' },
				],
			},
		],
	},
	{
		id: 'range',
		title: 'Range selection box',
		description: 'Time-range chrome around the profile.',
		fields: [
			{
				id: 'showSelectionBox',
				label: 'Show selection box',
				path: 'fixedRangeProfile.template.range.showSelectionBox',
				type: 'checkbox',
			},
			{
				id: 'extendRight',
				label: 'Extend histogram to chart right edge',
				path: 'fixedRangeProfile.template.range.extendRight',
				type: 'checkbox',
			},
			{
				id: 'boxBorderColor',
				label: 'Box border color',
				path: 'fixedRangeProfile.template.range.boxBorderColor',
				type: 'color',
			},
			{
				id: 'boxBackgroundColor',
				label: 'Box fill color',
				path: 'fixedRangeProfile.template.range.boxBackgroundColor',
				type: 'color',
			},
			{
				id: 'boxBackgroundOpacity',
				label: 'Box fill opacity',
				path: 'fixedRangeProfile.template.range.boxBackgroundOpacity',
				type: 'range',
				min: 0,
				max: 1,
				step: 0.05,
			},
		],
	},
	{
		id: 'empty',
		title: 'Empty state',
		description: 'Placeholder when no bars fall in the range.',
		fields: [
			{
				id: 'showPlaceholder',
				label: 'Show placeholder message',
				path: 'fixedRangeProfile.template.emptyState.showPlaceholder',
				type: 'checkbox',
			},
			{
				id: 'emptyMessage',
				label: 'Placeholder message',
				path: 'fixedRangeProfile.template.emptyState.message',
				type: 'text',
			},
			{
				id: 'emptyColor',
				label: 'Placeholder text color',
				path: 'fixedRangeProfile.template.emptyState.color',
				type: 'color',
			},
		],
	},
	{
		id: 'interaction',
		title: 'Interaction & labels',
		description: 'Axis labels and crosshair magnet behaviour.',
		fields: [
			{ id: 'showPriceAxisLabels', label: 'Show price axis labels', path: 'showPriceAxisLabels', type: 'checkbox' },
			{ id: 'showTimeAxisLabels', label: 'Show time axis labels', path: 'showTimeAxisLabels', type: 'checkbox' },
			{
				id: 'priceAxisLabelAlwaysVisible',
				label: 'Price labels always visible',
				path: 'priceAxisLabelAlwaysVisible',
				type: 'checkbox',
			},
			{
				id: 'timeAxisLabelAlwaysVisible',
				label: 'Time labels always visible',
				path: 'timeAxisLabelAlwaysVisible',
				type: 'checkbox',
			},
			{
				id: 'magnetThreshold',
				label: 'OHLC magnet threshold (px)',
				path: 'magnetThreshold',
				type: 'number',
				min: 0,
				max: 50,
				step: 1,
			},
		],
	},
];

export const METRIC_ROLE_OPTIONS: readonly ProfilePropertySelectOption[] = [
	{ value: 'magnitude', label: 'Magnitude' },
	{ value: 'positive', label: 'Positive' },
	{ value: 'negative', label: 'Negative' },
	{ value: 'neutral', label: 'Neutral' },
];

/** Dot-path read on a plain object tree. */
export function getPropertyPath(root: Record<string, unknown>, path: string): unknown {
	const parts = path.split('.');
	let current: unknown = root;
	for (const part of parts) {
		if (current == null || typeof current !== 'object') {
			return undefined;
		}
		current = (current as Record<string, unknown>)[part];
	}
	return current;
}

/** Dot-path write; creates intermediate objects as needed. */
export function setPropertyPath(root: Record<string, unknown>, path: string, value: unknown): void {
	const parts = path.split('.');
	let current: Record<string, unknown> = root;
	for (let i = 0; i < parts.length - 1; i++) {
		const part = parts[i];
		const next = current[part];
		if (next == null || typeof next !== 'object') {
			current[part] = {};
		}
		current = current[part] as Record<string, unknown>;
	}
	current[parts[parts.length - 1]] = value;
}

/** Deep clone via JSON — options objects are JSON-serializable. */
export function cloneEditorState<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}
