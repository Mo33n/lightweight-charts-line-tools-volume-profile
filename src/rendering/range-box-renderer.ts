import type { Coordinate } from 'lightweight-charts';
import type { CanvasRenderingTarget2D, IPaneRenderer, LineToolHitTestData } from 'lightweight-charts-line-tools-core';
import {
	Box,
	HitTestResult,
	HitTestType,
	PaneCursorType,
	pointInBox,
	Point,
} from 'lightweight-charts-line-tools-core';

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

export class RangeBoxRenderer<HorzScaleItem> implements IPaneRenderer {
	private _data: RangeBoxRendererData | null = null;

	public setData(data: RangeBoxRendererData | null): void {
		this._data = data;
	}

	public draw(target: CanvasRenderingTarget2D): void {
		const data = this._data;
		if (!data || !data.visible) return;

		target.useMediaCoordinateSpace((scope) => {
			const ctx = scope.context;
			const x = Math.min(data.xLeft, data.xRight);
			const y = Math.min(data.yTop, data.yBottom);
			const w = Math.abs(data.xRight - data.xLeft);
			const h = Math.abs(data.yBottom - data.yTop);

			ctx.save();
			ctx.globalAlpha = data.backgroundOpacity;
			ctx.fillStyle = data.backgroundColor;
			ctx.fillRect(x, y, w, h);
			ctx.globalAlpha = 1;
			ctx.strokeStyle = data.borderColor;
			ctx.lineWidth = 1;
			ctx.strokeRect(x, y, w, h);
			ctx.restore();
		});
	}

	public hitTest(x: Coordinate, y: Coordinate): HitTestResult<LineToolHitTestData> | null {
		const data = this._data;
		if (!data || !data.visible) return null;

		const box = new Box(
			new Point(Math.min(data.xLeft, data.xRight) as Coordinate, Math.min(data.yTop, data.yBottom) as Coordinate),
			new Point(Math.max(data.xLeft, data.xRight) as Coordinate, Math.max(data.yTop, data.yBottom) as Coordinate),
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
