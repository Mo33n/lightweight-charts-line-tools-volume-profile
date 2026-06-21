import type { IChartApiBase, ISeriesApi, SeriesType } from 'lightweight-charts';
import {
	AnchorPoint,
	CompositeRenderer,
	LineToolPaneView,
	PaneCursorType,
	logicalIndexToCoordinate,
	interpolateLogicalIndexFromTime,
} from 'lightweight-charts-line-tools-core';
import type { LineToolFixedRangeProfile } from '../model/line-tool-fixed-range-profile';
import { ProfileHistogramRenderer } from '../rendering/profile-histogram-renderer';
import { RangeBoxRenderer } from '../rendering/range-box-renderer';
import { isOhlcBar } from '../pipeline/binning';

export class FixedRangeProfilePaneView<HorzScaleItem> extends LineToolPaneView<HorzScaleItem> {
	private readonly _histogramRenderer: ProfileHistogramRenderer<HorzScaleItem>;
	private readonly _rangeBoxRenderer: RangeBoxRenderer<HorzScaleItem>;

	public constructor(
		tool: LineToolFixedRangeProfile<HorzScaleItem>,
		chart: IChartApiBase<HorzScaleItem>,
		series: ISeriesApi<SeriesType, HorzScaleItem>,
	) {
		super(tool, chart, series);
		this._histogramRenderer = new ProfileHistogramRenderer();
		this._rangeBoxRenderer = new RangeBoxRenderer();
	}

	protected override _updateImpl(height: number, width: number): void {
		(this._renderer as CompositeRenderer<HorzScaleItem>).clear();

		const tool = this._tool as LineToolFixedRangeProfile<HorzScaleItem>;

		if (!tool.options().visible || tool.isCulled()) {
			return;
		}

		// Recompute first, then read options so snapshot is fresh (not stale pre-recompute ref).
		tool.recomputeSnapshotIfNeeded();
		const options = tool.options();
		const template = options.fixedRangeProfile.template;
		const snapshot = options.fixedRangeProfile.snapshot ?? null;

		if (!this._updatePoints()) {
			return;
		}
		const geom = tool.getRangeGeometry();

		if (!geom) {
			if (this.areAnchorsVisible()) {
				this._addAnchors(this._renderer as CompositeRenderer<HorzScaleItem>);
			}
			return;
		}

		const { xLeft, xRight, priceLow, priceHigh } = geom;

		if (template.range.showSelectionBox) {
			const yTop = this._series.priceToCoordinate(priceHigh);
			const yBottom = this._series.priceToCoordinate(priceLow);
			if (yTop != null && yBottom != null) {
				this._rangeBoxRenderer.setData({
					visible: true,
					xLeft,
					xRight,
					yTop,
					yBottom,
					borderColor: template.range.boxBorderColor,
					backgroundColor: template.range.boxBackgroundColor,
					backgroundOpacity: template.range.boxBackgroundOpacity,
				});
				(this._renderer as CompositeRenderer<HorzScaleItem>).append(this._rangeBoxRenderer);
			}
		}

		this._histogramRenderer.setData({
			template,
			snapshot,
			rangeXLeft: xLeft,
			rangeXRight: xRight,
			priceLow,
			priceHigh,
			priceToY: (p) => this._series.priceToCoordinate(p),
			chartWidth: width,
		});
		(this._renderer as CompositeRenderer<HorzScaleItem>).append(this._histogramRenderer);

		if (this.areAnchorsVisible()) {
			this._addAnchors(this._renderer as CompositeRenderer<HorzScaleItem>);
		}
	}

	/**
	 * Start/end range handles — without these only the histogram body is hit-testable (move-only).
	 */
	protected override _addAnchors(renderer: CompositeRenderer<HorzScaleItem>): void {
		if (this._points.length < 2) {
			return;
		}

		const geom = (this._tool as LineToolFixedRangeProfile<HorzScaleItem>).getRangeGeometry();
		const anchorPoints: AnchorPoint[] = [];

		if (geom) {
			const y0 = this._series.priceToCoordinate(this._tool.getPoint(0)?.price ?? geom.priceLow);
			const y1 = this._series.priceToCoordinate(this._tool.getPoint(1)?.price ?? geom.priceHigh);
			const yMid = this._series.priceToCoordinate((geom.priceLow + geom.priceHigh) / 2);

			anchorPoints.push(
				new AnchorPoint(geom.xLeft, (y0 ?? yMid ?? this._points[0].y) as number, 0, false, PaneCursorType.EwResize),
				new AnchorPoint(geom.xRight, (y1 ?? yMid ?? this._points[1].y) as number, 1, false, PaneCursorType.EwResize),
			);
		} else {
			for (let i = 0; i < Math.min(this._points.length, 2); i++) {
				const p = this._points[i];
				anchorPoints.push(new AnchorPoint(p.x, p.y, i, false, PaneCursorType.EwResize));
			}
		}

		const anchorRenderer = this.createLineAnchor(
			{
				points: anchorPoints,
				defaultAnchorHoverCursor: PaneCursorType.EwResize,
				defaultAnchorDragCursor: PaneCursorType.EwResize,
			},
			0,
		);
		renderer.append(anchorRenderer);
	}
}

/** Resolve screen X for a unix timestamp using core interpolation helpers. */
export function timeToScreenX<HorzScaleItem>(
	chart: IChartApiBase<HorzScaleItem>,
	series: ISeriesApi<SeriesType, HorzScaleItem>,
	timestamp: number,
): number | null {
	const logical = interpolateLogicalIndexFromTime(chart, series, timestamp as never);
	if (logical == null) return null;
	return logicalIndexToCoordinate(chart.timeScale(), logical);
}

/** Compute price bounds from bars in range plus anchor prices. */
export function resolvePriceBounds(
	bars: readonly unknown[],
	anchorPrices: readonly number[],
): { low: number; high: number } | null {
	let low = Infinity;
	let high = -Infinity;

	for (const p of anchorPrices) {
		if (Number.isFinite(p)) {
			low = Math.min(low, p);
			high = Math.max(high, p);
		}
	}

	for (const bar of bars) {
		if (!isOhlcBar(bar)) continue;
		low = Math.min(low, bar.low);
		high = Math.max(high, bar.high);
	}

	if (!Number.isFinite(low) || !Number.isFinite(high)) {
		return null;
	}

	if (low === high) {
		const pad = Math.max(Math.abs(low) * 0.001, 0.01);
		return { low: low - pad, high: high + pad };
	}

	return { low, high };
}
