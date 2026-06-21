import type { IChartApiBase, ISeriesApi, SeriesType } from 'lightweight-charts';
import { CompositeRenderer, LineToolPaneView } from 'lightweight-charts-line-tools-core';
import type { LineToolFixedRangeProfile } from '../model/line-tool-fixed-range-profile';
export declare class FixedRangeProfilePaneView<HorzScaleItem> extends LineToolPaneView<HorzScaleItem> {
    private readonly _histogramRenderer;
    private readonly _rangeBoxRenderer;
    constructor(tool: LineToolFixedRangeProfile<HorzScaleItem>, chart: IChartApiBase<HorzScaleItem>, series: ISeriesApi<SeriesType, HorzScaleItem>);
    protected _updateImpl(height: number, width: number): void;
    /**
     * Start/end range handles — without these only the histogram body is hit-testable (move-only).
     */
    protected _addAnchors(renderer: CompositeRenderer<HorzScaleItem>): void;
}
/** Resolve screen X for a unix timestamp using core interpolation helpers. */
export declare function timeToScreenX<HorzScaleItem>(chart: IChartApiBase<HorzScaleItem>, series: ISeriesApi<SeriesType, HorzScaleItem>, timestamp: number): number | null;
/** Compute price bounds from bars in range plus anchor prices. */
export declare function resolvePriceBounds(bars: readonly unknown[], anchorPrices: readonly number[]): {
    low: number;
    high: number;
} | null;
