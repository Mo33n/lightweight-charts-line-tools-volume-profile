import type { ProfileRow, ProfileTemplate } from '../types/template';
import { sanitizeMetricValue } from './binning';

export interface ValueAreaResult {
	readonly pocPrice: number | null;
	readonly valueAreaHigh: number | null;
	readonly valueAreaLow: number | null;
	readonly maxMagnitude: number;
}

/** Clamps user-supplied value area fraction to a sane 1–100% range. */
export function clampValueAreaFraction(fraction: number): number {
	if (!Number.isFinite(fraction)) {
		return 0.7;
	}
	return Math.min(1, Math.max(0.01, fraction));
}

/**
 * Computes POC and value area from profile rows using the template's magnitude metric.
 */
export function computeValueArea(
	rows: readonly ProfileRow[],
	template: ProfileTemplate,
): ValueAreaResult {
	if (rows.length === 0) {
		return {
			pocPrice: null,
			valueAreaHigh: null,
			valueAreaLow: null,
			maxMagnitude: 0,
		};
	}

	const metricId = template.metricBinding.magnitudeMetricId;
	if (!metricId || !template.metrics.some((m) => m.id === metricId)) {
		return {
			pocPrice: null,
			valueAreaHigh: null,
			valueAreaLow: null,
			maxMagnitude: 0,
		};
	}
	let maxMagnitude = 0;
	let pocPrice: number | null = null;
	let pocMag = -Infinity;

	const magnitudes: Array<{ price: number; mag: number }> = [];
	let total = 0;

	for (const row of rows) {
		const mag = sanitizeMetricValue(row.metrics[metricId] ?? 0);
		magnitudes.push({ price: row.price, mag });
		total += mag;
		if (mag > maxMagnitude) {
			maxMagnitude = mag;
		}
		if (mag > pocMag) {
			pocMag = mag;
			pocPrice = row.price;
		}
	}

	if (total <= 0 || pocPrice == null) {
		return { pocPrice, valueAreaHigh: null, valueAreaLow: null, maxMagnitude };
	}

	const target = total * clampValueAreaFraction(template.levels.valueAreaFraction);
	magnitudes.sort((a, b) => a.price - b.price);

	const pocIndex = magnitudes.findIndex((m) => m.price === pocPrice);
	if (pocIndex < 0) {
		return { pocPrice, valueAreaHigh: null, valueAreaLow: null, maxMagnitude };
	}

	let accumulated = magnitudes[pocIndex].mag;
	let lowIdx = pocIndex;
	let highIdx = pocIndex;

	while (accumulated < target && (lowIdx > 0 || highIdx < magnitudes.length - 1)) {
		const expandLow = lowIdx > 0 ? magnitudes[lowIdx - 1].mag : -1;
		const expandHigh = highIdx < magnitudes.length - 1 ? magnitudes[highIdx + 1].mag : -1;

		if (expandHigh >= expandLow && highIdx < magnitudes.length - 1) {
			highIdx += 1;
			accumulated += magnitudes[highIdx].mag;
		} else if (lowIdx > 0) {
			lowIdx -= 1;
			accumulated += magnitudes[lowIdx].mag;
		} else {
			break;
		}
	}

	return {
		pocPrice,
		valueAreaHigh: magnitudes[highIdx].price,
		valueAreaLow: magnitudes[lowIdx].price,
		maxMagnitude,
	};
}
