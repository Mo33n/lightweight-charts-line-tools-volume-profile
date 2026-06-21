import type { ProfileTemplate, ProfileTimeRange } from '../types/template';
import type { LineToolFixedRangeProfileSpecificOptions } from '../types/options';

/** Cache key inputs that affect profile computation (not pure styling). */
export function buildProfileSnapshotCacheKey(
	timeRange: ProfileTimeRange,
	fixedRangeProfile: LineToolFixedRangeProfileSpecificOptions['fixedRangeProfile'],
	pointsLength: number,
): string {
	const t = fixedRangeProfile.template;
	const mb = t.metricBinding;
	const metricIds = t.metrics.map((m) => m.id).join(',');
	return [
		timeRange.from,
		timeRange.to,
		fixedRangeProfile.pipelineId,
		fixedRangeProfile.tickSize ?? '',
		t.id,
		t.displayMode,
		t.rowLayout.mode,
		t.rowLayout.value,
		t.rowLayout.maxRows ?? '',
		mb.magnitudeMetricId,
		mb.positiveMetricId ?? '',
		mb.negativeMetricId ?? '',
		metricIds,
		t.levels.valueAreaFraction,
		pointsLength,
	].join('|');
}
