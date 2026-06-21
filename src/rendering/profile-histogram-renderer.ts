import type { Coordinate } from 'lightweight-charts';
import type { CanvasRenderingTarget2D, IPaneRenderer, LineToolHitTestData } from 'lightweight-charts-line-tools-core';
import {
	Box,
	HitTestResult,
	HitTestType,
	PaneCursorType,
	Point,
	pointInBox,
} from 'lightweight-charts-line-tools-core';
import type { ProfileComputedSnapshot, ProfileTemplate } from '../types/template';

export interface ProfileHistogramRendererData {
	readonly template: ProfileTemplate;
	readonly snapshot: ProfileComputedSnapshot | null;
	readonly rangeXLeft: number;
	readonly rangeXRight: number;
	readonly priceLow: number;
	readonly priceHigh: number;
	readonly priceToY: (price: number) => number | null;
	readonly chartWidth: number;
}

function setLinePattern(ctx: CanvasRenderingContext2D, style: 'solid' | 'dashed' | 'dotted'): void {
	if (style === 'dashed') {
		ctx.setLineDash([6, 4]);
	} else if (style === 'dotted') {
		ctx.setLineDash([2, 3]);
	} else {
		ctx.setLineDash([]);
	}
}

function metricColor(template: ProfileTemplate, metricId: string, fallback: string): string {
	return template.metrics.find((m) => m.id === metricId)?.color ?? fallback;
}

function metricOpacity(template: ProfileTemplate, metricId: string, fallback = 1): number {
	return template.metrics.find((m) => m.id === metricId)?.opacity ?? fallback;
}

/** Fill color/opacity for total-mode bars — magnitude metric drives appearance. */
function totalBarStyle(
	template: ProfileTemplate,
	binding: ProfileTemplate['metricBinding'],
): { color: string; opacity: number } {
	const magId = binding.magnitudeMetricId;
	return {
		color: metricColor(template, magId, template.histogram.backgroundColor),
		opacity: metricOpacity(template, magId, template.histogram.backgroundOpacity),
	};
}

function resolveNormDenominator(
	template: ProfileTemplate,
	snapshot: ProfileComputedSnapshot,
	rows: ProfileComputedSnapshot['rows'],
): number {
	const binding = template.metricBinding;
	if (
		template.displayMode === 'delta' &&
		binding.positiveMetricId &&
		binding.negativeMetricId
	) {
		let maxDelta = 0;
		for (const row of rows) {
			const delta =
				(row.metrics[binding.positiveMetricId] ?? 0) - (row.metrics[binding.negativeMetricId] ?? 0);
			maxDelta = Math.max(maxDelta, Math.abs(delta));
		}
		return maxDelta > 0 ? maxDelta : 1;
	}
	return snapshot.maxMagnitude > 0 ? snapshot.maxMagnitude : 1;
}

function resolveRowGeometry(
	row: ProfileComputedSnapshot['rows'][number],
	template: ProfileTemplate,
	priceToY: (price: number) => number | null,
): { rowTop: number; rowHeight: number } | null {
	const fixedH = template.histogram.rowHeightPx;
	if (fixedH > 0) {
		const yMid = priceToY(row.price);
		if (yMid == null) return null;
		return { rowTop: yMid - fixedH / 2, rowHeight: fixedH };
	}

	const yTop = priceToY(row.priceHigh);
	const yBottom = priceToY(row.priceLow);
	if (yTop == null || yBottom == null) return null;

	const rowTop = Math.min(yTop, yBottom);
	const rowHeight = Math.max(
		Math.abs(yBottom - yTop) - template.histogram.gapPx,
		template.histogram.minRowHeightPx,
	);
	if (rowHeight <= 0) return null;
	return { rowTop, rowHeight };
}

/**
 * Canvas renderer for horizontal profile histogram + POC/VA lines.
 */
export class ProfileHistogramRenderer<HorzScaleItem> implements IPaneRenderer {
	private _data: ProfileHistogramRendererData | null = null;

	public setData(data: ProfileHistogramRendererData | null): void {
		this._data = data;
	}

	public draw(target: CanvasRenderingTarget2D): void {
		const data = this._data;
		if (!data?.snapshot) {
			return;
		}

		target.useMediaCoordinateSpace((scope) => {
			const ctx = scope.context;
			const snapshot = data.snapshot!;
			const { template, rangeXLeft, rangeXRight, priceToY } = data;
			const rangeWidth = Math.abs(rangeXRight - rangeXLeft);
			const anchorX = template.histogram.anchor === 'rangeRight' ? rangeXRight : rangeXLeft;
			const dir = template.histogram.anchor === 'rangeRight' ? -1 : 1;
			const maxBarWidth = rangeWidth * template.histogram.maxWidthFraction;
			const gamma = template.histogram.lengthGamma > 0 ? template.histogram.lengthGamma : 1;
			const binding = template.metricBinding;
			const rows = snapshot.rows;
			const normDenom = resolveNormDenominator(template, snapshot, rows);

			if (rows.length === 0 && template.emptyState.showPlaceholder) {
				const yH = priceToY(data.priceHigh);
				const yL = priceToY(data.priceLow);
				const midY = ((yH ?? 0) + (yL ?? 0)) / 2;
				const msg = snapshot.warning ?? template.emptyState.message;
				ctx.save();
				ctx.fillStyle = template.emptyState.color;
				ctx.font = '12px sans-serif';
				ctx.textAlign = 'center';
				ctx.fillText(msg, (rangeXLeft + rangeXRight) / 2, midY);
				ctx.restore();
				return;
			}

			for (const row of rows) {
				const geom = resolveRowGeometry(row, template, priceToY);
				if (!geom) continue;
				const { rowTop, rowHeight } = geom;

				const mag = row.metrics[binding.magnitudeMetricId] ?? 0;
				const norm = Math.pow(Math.min(Math.max(mag / normDenom, 0), 1), gamma);
				const barWidth = norm * maxBarWidth;

				if (template.displayMode === 'split' && binding.positiveMetricId && binding.negativeMetricId) {
					const buy = row.metrics[binding.positiveMetricId] ?? 0;
					const sell = row.metrics[binding.negativeMetricId] ?? 0;
					const total = buy + sell || 1;
					const buyW = (buy / total) * barWidth;
					const sellW = (sell / total) * barWidth;

					if (buyW > 0) {
						ctx.fillStyle = metricColor(template, binding.positiveMetricId, '#26a69a');
						ctx.globalAlpha = metricOpacity(template, binding.positiveMetricId);
						const x = dir > 0 ? anchorX : anchorX - buyW;
						ctx.fillRect(x, rowTop, buyW, rowHeight);
					}
					if (sellW > 0) {
						ctx.fillStyle = metricColor(template, binding.negativeMetricId, '#ef5350');
						ctx.globalAlpha = metricOpacity(template, binding.negativeMetricId);
						const x = dir > 0 ? anchorX + buyW : anchorX - buyW;
						ctx.fillRect(x, rowTop, sellW, rowHeight);
					}
					ctx.globalAlpha = 1;
				} else if (template.displayMode === 'delta' && binding.positiveMetricId && binding.negativeMetricId) {
					const delta = (row.metrics[binding.positiveMetricId] ?? 0) - (row.metrics[binding.negativeMetricId] ?? 0);
					const absNorm = Math.pow(Math.min(Math.abs(delta) / normDenom, 1), gamma);
					const w = absNorm * maxBarWidth;
					const positive = delta >= 0;
					ctx.fillStyle = metricColor(
						template,
						positive ? binding.positiveMetricId : binding.negativeMetricId,
						positive ? '#26a69a' : '#ef5350',
					);
					ctx.globalAlpha = metricOpacity(
						template,
						positive ? binding.positiveMetricId : binding.negativeMetricId,
					);
					const x = dir > 0 ? anchorX : anchorX - w;
					ctx.fillRect(x, rowTop, w, rowHeight);
					ctx.globalAlpha = 1;
				} else {
					const totalStyle = totalBarStyle(template, binding);
					ctx.fillStyle = totalStyle.color;
					ctx.globalAlpha = totalStyle.opacity;
					const x = dir > 0 ? anchorX : anchorX - barWidth;
					ctx.fillRect(x, rowTop, barWidth, rowHeight);
					ctx.globalAlpha = 1;
					if (template.histogram.borderWidth > 0) {
						ctx.strokeStyle = totalStyle.color;
						ctx.lineWidth = template.histogram.borderWidth;
						ctx.strokeRect(x, rowTop, barWidth, rowHeight);
					}
				}
			}

			if (template.levels.showPoc && snapshot.pocPrice != null) {
				const y = priceToY(snapshot.pocPrice);
				if (y != null) {
					ctx.save();
					ctx.strokeStyle = template.levels.pocColor;
					ctx.lineWidth = template.levels.levelLineWidth;
					setLinePattern(ctx, template.levels.levelLineStyle);
					ctx.beginPath();
					ctx.moveTo(rangeXLeft, y);
					ctx.lineTo(rangeXRight + maxBarWidth, y);
					ctx.stroke();
					ctx.restore();
				}
			}

			if (template.levels.showValueArea && snapshot.valueAreaHigh != null && snapshot.valueAreaLow != null) {
				const yH = priceToY(snapshot.valueAreaHigh);
				const yL = priceToY(snapshot.valueAreaLow);
				if (yH != null && yL != null) {
					ctx.save();
					ctx.strokeStyle = template.levels.valueAreaColor;
					ctx.lineWidth = template.levels.levelLineWidth;
					setLinePattern(ctx, template.levels.levelLineStyle);
					for (const y of [yH, yL]) {
						ctx.beginPath();
						ctx.moveTo(rangeXLeft, y);
						ctx.lineTo(rangeXRight + maxBarWidth, y);
						ctx.stroke();
					}
					ctx.restore();
				}
			}
		});
	}

	public hitTest(x: Coordinate, y: Coordinate): HitTestResult<LineToolHitTestData> | null {
		const data = this._data;
		if (!data) return null;

		const yHigh = data.priceToY(data.priceHigh);
		const yLow = data.priceToY(data.priceLow);
		if (yHigh == null || yLow == null) return null;

		const rangeWidth = Math.abs(data.rangeXRight - data.rangeXLeft);
		const histExtend = rangeWidth * data.template.histogram.maxWidthFraction;

		const box = new Box(
			new Point(Math.min(data.rangeXLeft, data.rangeXRight) as Coordinate, Math.min(yHigh, yLow) as Coordinate),
			new Point(
				(Math.max(data.rangeXLeft, data.rangeXRight) + histExtend) as Coordinate,
				Math.max(yHigh, yLow) as Coordinate,
			),
		);

		if (pointInBox(new Point(x, y), box)) {
			return new HitTestResult(HitTestType.MovePointBackground, {
				pointIndex: null,
				suggestedCursor: PaneCursorType.Grabbing,
			});
		}
		return null;
	}
}
