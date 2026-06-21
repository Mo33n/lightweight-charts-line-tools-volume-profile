import type { Coordinate } from 'lightweight-charts';
import type { CanvasRenderingTarget2D, IPaneRenderer, LineToolHitTestData } from 'lightweight-charts-line-tools-core';
import { HitTestResult } from 'lightweight-charts-line-tools-core';
export interface RangeBoxRendererData {
    readonly visible: boolean;
    readonly xLeft: number;
    readonly xRight: number;
    readonly yTop: number;
    readonly yBottom: number;
    readonly borderColor: string;
    readonly backgroundColor: string;
    readonly backgroundOpacity: number;
}
export declare class RangeBoxRenderer<HorzScaleItem> implements IPaneRenderer {
    private _data;
    setData(data: RangeBoxRendererData | null): void;
    draw(target: CanvasRenderingTarget2D): void;
    hitTest(x: Coordinate, y: Coordinate): HitTestResult<LineToolHitTestData> | null;
}
