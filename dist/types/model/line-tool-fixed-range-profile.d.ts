import type { IChartApiBase, IHorzScaleBehavior, ISeriesApi, SeriesType, Time, Coordinate } from 'lightweight-charts';
import { BaseLineTool, PriceAxisLabelStackingManager, type LineToolsCorePlugin } from 'lightweight-charts-line-tools-core';
import type { LineToolPoint, HitTestResult } from 'lightweight-charts-line-tools-core';
import type { LineToolFixedRangeProfileOptions, DeepPartialFixedRangeProfileOptions } from '../types/options';
import { type ProfileTimeRange } from '../types/template';
export interface RangeGeometry {
    readonly xLeft: number;
    readonly xRight: number;
    readonly priceLow: number;
    readonly priceHigh: number;
    readonly timeRange: ProfileTimeRange;
}
export declare class LineToolFixedRangeProfile<HorzScaleItem = Time> extends BaseLineTool<HorzScaleItem> {
    private _lastComputeKey;
    constructor(coreApi: LineToolsCorePlugin<HorzScaleItem>, chart: IChartApiBase<HorzScaleItem>, series: ISeriesApi<SeriesType, HorzScaleItem>, horzScaleBehavior: IHorzScaleBehavior<HorzScaleItem>, options: Partial<LineToolFixedRangeProfileOptions> | LineToolFixedRangeProfileOptions, points: LineToolPoint[] | undefined, priceAxisLabelStackingManager: PriceAxisLabelStackingManager<HorzScaleItem>);
    supportsClickClickCreation(): boolean;
    supportsClickDragCreation(): boolean;
    applyOptions(options: DeepPartialFixedRangeProfileOptions): void;
    options(): LineToolFixedRangeProfileOptions;
    protected updateCullingState(): void;
    _internalHitTest(x: Coordinate, y: Coordinate): HitTestResult<unknown> | null;
    getResolvedTimeRange(): ProfileTimeRange | null;
    getRangeGeometry(): RangeGeometry | null;
    recomputeSnapshotIfNeeded(): void;
    /** Prefer registered bar source; otherwise snap range to bar boundaries for getDataInRange. */
    private _resolveBarsInRange;
    private _patchSnapshot;
    updateAllViews(updateType?: 'data' | 'other' | 'options'): void;
    tryFinish(): void;
    setPoint(index: number, point: LineToolPoint): void;
    setPoints(points: LineToolPoint[]): void;
}
