import type { LineToolFixedRangeProfileOptions, DeepPartialFixedRangeProfileOptions } from '../types/options';
import { DEFAULT_VOLUME_PROFILE_TEMPLATE } from '../templates/defaults';
import { mergeProfileTemplate } from '../templates/defaults';

const COMMON_DEFAULTS = {
	visible: true,
	editable: true,
	showPriceAxisLabels: false,
	showTimeAxisLabels: true,
	priceAxisLabelAlwaysVisible: false,
	timeAxisLabelAlwaysVisible: false,
	magnetThreshold: 10,
};

export function createDefaultFixedRangeProfileOptions(
	partial?: DeepPartialFixedRangeProfileOptions,
): LineToolFixedRangeProfileOptions {
	const template = partial?.fixedRangeProfile?.template
		? mergeProfileTemplate(DEFAULT_VOLUME_PROFILE_TEMPLATE, partial.fixedRangeProfile.template)
		: DEFAULT_VOLUME_PROFILE_TEMPLATE;

	return {
		...COMMON_DEFAULTS,
		...partial,
		fixedRangeProfile: {
			template,
			pipelineId: partial?.fixedRangeProfile?.pipelineId ?? 'ohlc-volume',
			tickSize: partial?.fixedRangeProfile?.tickSize,
			snapshot: partial?.fixedRangeProfile?.snapshot,
		},
	} as LineToolFixedRangeProfileOptions;
}

/** Deep-merge user partial options onto current tool options. */
export function mergeFixedRangeProfileOptions(
	current: LineToolFixedRangeProfileOptions,
	partial: DeepPartialFixedRangeProfileOptions,
): LineToolFixedRangeProfileOptions {
	const mergedTemplate = partial.fixedRangeProfile?.template
		? mergeProfileTemplate(current.fixedRangeProfile.template, partial.fixedRangeProfile.template)
		: current.fixedRangeProfile.template;

	return {
		...current,
		...partial,
		fixedRangeProfile: {
			...current.fixedRangeProfile,
			...partial.fixedRangeProfile,
			template: mergedTemplate,
			pipelineId: partial.fixedRangeProfile?.pipelineId ?? current.fixedRangeProfile.pipelineId,
			tickSize: partial.fixedRangeProfile?.tickSize ?? current.fixedRangeProfile.tickSize,
			snapshot: partial.fixedRangeProfile?.snapshot ?? current.fixedRangeProfile.snapshot,
		},
	};
}
