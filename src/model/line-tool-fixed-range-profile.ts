import type {
	IChartApiBase,
	IHorzScaleBehavior,
	ISeriesApi,
	SeriesType,
	Time,
	Coordinate,
} from 'lightweight-charts';
import {
	BaseLineTool,
	PriceAxisLabelStackingManager,
	getToolCullingState,
	OffScreenState,
	deepCopy,
	type LineToolsCorePlugin,
} from 'lightweight-charts-line-tools-core';
import type { LineToolPoint, HitTestResult, IPaneRenderer } from 'lightweight-charts-line-tools-core';
import type { LineToolFixedRangeProfileOptions, DeepPartialFixedRangeProfileOptions } from '../types/options';
import {
	FIXED_RANGE_PROFILE_TOOL_TYPE,
	type ProfileComputedSnapshot,
	type ProfileTimeRange,
} from '../types/template';
import { createDefaultFixedRangeProfileOptions, mergeFixedRangeProfileOptions } from '../utils/merge-options';
import { FixedRangeProfilePaneView, resolvePriceBounds, timeToScreenX } from '../views/fixed-range-profile-pane-view';
import { normalizeTimeRange } from '../pipeline/binning';
import { resolveProfile } from '../pipeline/resolve-profile';
import { getProfilePipeline } from '../pipeline/registry';
import { getProfileBarSource } from '../pipeline/bar-source';
import { computeValueArea } from '../pipeline/value-area';
import { buildProfileSnapshotCacheKey } from '../pipeline/snapshot-cache-key';

export interface RangeGeometry {
	readonly xLeft: number;
	readonly xRight: number;
	readonly priceLow: number;
	readonly priceHigh: number;
	readonly timeRange: ProfileTimeRange;
}

export class LineToolFixedRangeProfile<HorzScaleItem = Time> extends BaseLineTool<HorzScaleItem> {
	private _lastComputeKey: string | null = null;

	public constructor(
		coreApi: LineToolsCorePlugin<HorzScaleItem>,
		chart: IChartApiBase<HorzScaleItem>,
		series: ISeriesApi<SeriesType, HorzScaleItem>,
		horzScaleBehavior: IHorzScaleBehavior<HorzScaleItem>,
		options: Partial<LineToolFixedRangeProfileOptions> | LineToolFixedRangeProfileOptions,
		points: LineToolPoint[] = [],
		priceAxisLabelStackingManager: PriceAxisLabelStackingManager<HorzScaleItem>,
	) {
		const finalOptions = createDefaultFixedRangeProfileOptions(
			options as DeepPartialFixedRangeProfileOptions,
		);
		super(
			coreApi,
			chart,
			series,
			horzScaleBehavior,
			finalOptions as never,
			points,
			FIXED_RANGE_PROFILE_TOOL_TYPE as never,
			2,
			priceAxisLabelStackingManager,
		);

		this._setPaneViews([
			new FixedRangeProfilePaneView(this, chart, series),
		]);
	}

	public override supportsClickClickCreation(): boolean {
		return true;
	}

	public override supportsClickDragCreation(): boolean {
		return true;
	}

	public override applyOptions(options: DeepPartialFixedRangeProfileOptions): void {
		const merged = mergeFixedRangeProfileOptions(
			this.options() as LineToolFixedRangeProfileOptions,
			options,
		);
		this._options = merged as never;
		this._lastComputeKey = null;
		this.updateAllViews('options');
		this._triggerChartUpdate();
	}

	public options(): LineToolFixedRangeProfileOptions {
		return this._options as unknown as LineToolFixedRangeProfileOptions;
	}

	protected override updateCullingState(): void {
		const points = this.points();
		if (points.length === 0) {
			this._setIsCulled(false);
			return;
		}
		const result = getToolCullingState(points, this, { left: false, right: false });
		this._setIsCulled(result !== OffScreenState.Visible);
	}

	public _internalHitTest(x: Coordinate, y: Coordinate): HitTestResult<unknown> | null {
		if (!this.options().visible) {
			return null;
		}

		for (const pv of this._paneViews) {
			const renderer = pv.renderer() as IPaneRenderer | null;
			if (renderer && 'hitTest' in renderer && typeof renderer.hitTest === 'function') {
				const hit = renderer.hitTest(x, y);
				if (hit) {
					return hit;
				}
			}
		}

		return null;
	}

	public getResolvedTimeRange(): ProfileTimeRange | null {
		const pts = this._points;
		if (pts.length < 1) {
			return null;
		}

		let from = pts[0].timestamp;
		let to = pts.length >= 2 ? pts[1].timestamp : from;

		if (this.options().fixedRangeProfile.template.range.extendRight) {
			const latest = this.coreApi().getLatestBar();
			if (latest?.time != null) {
				const t =
					typeof latest.time === 'number'
						? latest.time
						: (this._horzScaleBehavior.key(latest.time as HorzScaleItem) as number);
				to = Math.max(to, t);
			}
		}

		return normalizeTimeRange(from, to);
	}

	public getRangeGeometry(): RangeGeometry | null {
		const timeRange = this.getResolvedTimeRange();
		if (!timeRange) {
			return null;
		}

		let xLeft = timeToScreenX(this._chart, this._series, timeRange.from);
		let xRight = timeToScreenX(this._chart, this._series, timeRange.to);
		if (xLeft == null || xRight == null) {
			return null;
		}
		if (xRight < xLeft) {
			const tmp = xLeft;
			xLeft = xRight;
			xRight = tmp;
		}

		const bars = this._resolveBarsInRange(timeRange);

		const anchorPrices = this.points().map((p) => p.price);
		const bounds = resolvePriceBounds(bars, anchorPrices);
		if (!bounds) {
			return null;
		}

		return {
			xLeft,
			xRight,
			priceLow: bounds.low,
			priceHigh: bounds.high,
			timeRange,
		};
	}

	public recomputeSnapshotIfNeeded(): void {
		if (this._points.length < 2 && !this.isCreating()) {
			return;
		}

		const timeRange = this.getResolvedTimeRange();
		if (!timeRange) {
			return;
		}

		const opts = this.options().fixedRangeProfile;
		const key = buildProfileSnapshotCacheKey(timeRange, opts, this._points.length);
		if (key === this._lastComputeKey && opts.snapshot) {
			return;
		}

		const pipeline = getProfilePipeline(opts.pipelineId);
		if (!pipeline) {
			const emptySnapshot: ProfileComputedSnapshot = {
				barCount: 0,
				rowCount: 0,
				maxMagnitude: 0,
				pocPrice: null,
				valueAreaHigh: null,
				valueAreaLow: null,
				rows: [],
				computedAt: Date.now(),
				warning: `Pipeline "${opts.pipelineId}" is not registered. Call registerProfilePipeline() or registerBuiltinProfilePipelines().`,
			};
			this._patchSnapshot(emptySnapshot);
			this._lastComputeKey = key;
			return;
		}

		const bars = this._resolveBarsInRange(timeRange);

		const result = resolveProfile({
			template: opts.template,
			range: timeRange,
			bars,
			tickSize: opts.tickSize,
			pipeline,
		});

		const va = computeValueArea(result.rows, opts.template);

		const snapshot: ProfileComputedSnapshot = {
			barCount: result.barCount,
			rowCount: result.rows.length,
			maxMagnitude: va.maxMagnitude,
			pocPrice: va.pocPrice,
			valueAreaHigh: va.valueAreaHigh,
			valueAreaLow: va.valueAreaLow,
			rows: result.rows,
			computedAt: Date.now(),
			warning: result.warning,
		};

		this._patchSnapshot(snapshot);
		this._lastComputeKey = key;
		this._triggerChartUpdate();
	}

	/** Prefer registered bar source; otherwise snap range to bar boundaries for getDataInRange. */
	private _resolveBarsInRange(timeRange: ProfileTimeRange): readonly unknown[] {
		const custom = getProfileBarSource();
		if (custom) {
			return custom(timeRange);
		}

		let from = timeRange.from;
		let to = timeRange.to;

		const fromBar = this.coreApi().getClosestBar(from, 'floor');
		const toBar = this.coreApi().getClosestBar(to, 'ceil');
		if (fromBar?.time != null) {
			from =
				typeof fromBar.time === 'number'
					? fromBar.time
					: (this._horzScaleBehavior.key(fromBar.time as HorzScaleItem) as number);
		}
		if (toBar?.time != null) {
			to =
				typeof toBar.time === 'number'
					? toBar.time
					: (this._horzScaleBehavior.key(toBar.time as HorzScaleItem) as number);
		}

		return this.coreApi().getDataInRange({ from, to });
	}

	private _patchSnapshot(snapshot: ProfileComputedSnapshot): void {
		const current = this.options();
		this._options = {
			...current,
			fixedRangeProfile: {
				...current.fixedRangeProfile,
				snapshot: deepCopy(snapshot),
			},
		} as never;
	}

	public override updateAllViews(updateType?: 'data' | 'other' | 'options'): void {
		if (updateType === 'data' || updateType === 'other' || updateType === 'options') {
			this._lastComputeKey = null;
		}
		super.updateAllViews(updateType);
	}

	public override tryFinish(): void {
		super.tryFinish();
		this._lastComputeKey = null;
		this.recomputeSnapshotIfNeeded();
		this.updateAllViews('data');
		this._triggerChartUpdate();
	}

	public override setPoint(index: number, point: LineToolPoint): void {
		super.setPoint(index, point);
		this._lastComputeKey = null;
	}

	public override setPoints(points: LineToolPoint[]): void {
		super.setPoints(points);
		this._lastComputeKey = null;
	}
}
