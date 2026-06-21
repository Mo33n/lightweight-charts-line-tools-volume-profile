import type { ProfileTemplate } from '../types/template';

export const DEFAULT_VOLUME_PROFILE_TEMPLATE: ProfileTemplate = {
	id: 'volume-profile-v1',
	label: 'Volume Profile',
	rowLayout: { mode: 'rowCount', value: 24, maxRows: 500 },
	metrics: [
		{ id: 'volume', label: 'Volume', role: 'magnitude', color: '#26a69a', opacity: 0.85 },
		{ id: 'buy', label: 'Buy', role: 'positive', color: '#26a69a', opacity: 0.9 },
		{ id: 'sell', label: 'Sell', role: 'negative', color: '#ef5350', opacity: 0.9 },
	],
	metricBinding: {
		magnitudeMetricId: 'volume',
		positiveMetricId: 'buy',
		negativeMetricId: 'sell',
	},
	displayMode: 'total',
	histogram: {
		anchor: 'rangeRight',
		maxWidthFraction: 0.45,
		lengthGamma: 1,
		rowHeightPx: 0,
		minRowHeightPx: 2,
		gapPx: 1,
		backgroundColor: '#2962FF',
		backgroundOpacity: 0.35,
		borderColor: '#2962FF',
		borderWidth: 0,
	},
	levels: {
		showPoc: true,
		showValueArea: true,
		valueAreaFraction: 0.7,
		pocColor: '#FF9800',
		valueAreaColor: '#FF9800',
		levelLineWidth: 1,
		levelLineStyle: 'dashed',
	},
	range: {
		showSelectionBox: true,
		boxBorderColor: '#787B86',
		boxBackgroundColor: '#787B86',
		boxBackgroundOpacity: 0.08,
		extendRight: false,
	},
	emptyState: {
		showPlaceholder: true,
		message: 'No profile data',
		color: '#787B86',
	},
};

export const DEFAULT_DELTA_PROFILE_TEMPLATE: ProfileTemplate = {
	...DEFAULT_VOLUME_PROFILE_TEMPLATE,
	id: 'delta-profile-v1',
	label: 'Delta Profile',
	displayMode: 'delta',
	metricBinding: {
		magnitudeMetricId: 'volume',
		positiveMetricId: 'buy',
		negativeMetricId: 'sell',
	},
	histogram: {
		...DEFAULT_VOLUME_PROFILE_TEMPLATE.histogram,
		backgroundColor: '#26a69a',
		borderColor: '#26a69a',
	},
};

/** Deep-merge partial template overrides onto a base template. */
export function mergeProfileTemplate(
	base: ProfileTemplate,
	partial: Partial<ProfileTemplate> & {
		rowLayout?: Partial<ProfileTemplate['rowLayout']>;
		metricBinding?: Partial<ProfileTemplate['metricBinding']>;
		histogram?: Partial<ProfileTemplate['histogram']>;
		levels?: Partial<ProfileTemplate['levels']>;
		range?: Partial<ProfileTemplate['range']>;
		emptyState?: Partial<ProfileTemplate['emptyState']>;
	},
): ProfileTemplate {
	return {
		...base,
		...partial,
		rowLayout: { ...base.rowLayout, ...partial.rowLayout },
		metrics: partial.metrics ?? base.metrics,
		metricBinding: { ...base.metricBinding, ...partial.metricBinding },
		histogram: { ...base.histogram, ...partial.histogram },
		levels: { ...base.levels, ...partial.levels },
		range: { ...base.range, ...partial.range },
		emptyState: { ...base.emptyState, ...partial.emptyState },
	};
}
