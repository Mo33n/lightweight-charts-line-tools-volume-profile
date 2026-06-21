import type { Coordinate } from 'lightweight-charts';
import type { CanvasRenderingTarget2D, IPaneRenderer, LineToolHitTestData } from 'lightweight-charts-line-tools-core';
import { HitTestResult } from 'lightweight-charts-line-tools-core';
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
/**
 * Canvas renderer for horizontal profile histogram + POC/VA lines.
 */
export declare class ProfileHistogramRenderer<HorzScaleItem> implements IPaneRenderer {
    private _data;
    setData(data: ProfileHistogramRendererData | null): void;
    draw(target: CanvasRenderingTarget2D): void;
    hitTest(x: Coordinate, y: Coordinate): HitTestResult<LineToolHitTestData> | null;
}
