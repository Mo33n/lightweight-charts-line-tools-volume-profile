(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('lightweight-charts-line-tools-core')) :
    typeof define === 'function' && define.amd ? define(['exports', 'lightweight-charts-line-tools-core'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.LightweightChartsLineToolsVolumeProfile = {}, global.LightweightChartsLineToolsCore));
})(this, (function (exports, lightweightChartsLineToolsCore) { 'use strict';

    /**
     * Serializable profile template — drives layout, colors, metrics, and level markers.
     * Templates are persisted in tool options and can be swapped at runtime via applyOptions.
     */
    const FIXED_RANGE_PROFILE_TOOL_TYPE = 'FixedRangeProfile';

    const DEFAULT_VOLUME_PROFILE_TEMPLATE = {
        id: 'volume-profile-v1',
        label: 'Volume Profile',
        rowLayout: { mode: 'rowCount', value: 24, maxRows: 500 },
        metrics: [
            { id: 'volume', label: 'Volume', role: 'magnitude', color: '#26a69a', opacity: 0.85 },
            { id: 'buy', label: 'Buy', role: 'positive', color: '#26a69a', opacity: 0.9 },
            { id: 'sell', label: 'Sell', role: 'negative', color: '#ef5350', opacity: 0.9 },
        ],
        metricBinding: {
            magnitudeMetricId: 'volume',
            positiveMetricId: 'buy',
            negativeMetricId: 'sell',
        },
        displayMode: 'total',
        histogram: {
            anchor: 'rangeRight',
            maxWidthFraction: 0.45,
            lengthGamma: 1,
            rowHeightPx: 0,
            minRowHeightPx: 2,
            gapPx: 1,
            backgroundColor: '#2962FF',
            backgroundOpacity: 0.35,
            borderColor: '#2962FF',
            borderWidth: 0,
        },
        levels: {
            showPoc: true,
            showValueArea: true,
            valueAreaFraction: 0.7,
            pocColor: '#FF9800',
            valueAreaColor: '#FF9800',
            levelLineWidth: 1,
            levelLineStyle: 'dashed',
        },
        range: {
            showSelectionBox: true,
            boxBorderColor: '#787B86',
            boxBackgroundColor: '#787B86',
            boxBackgroundOpacity: 0.08,
            extendRight: false,
        },
        emptyState: {
            showPlaceholder: true,
            message: 'No profile data',
            color: '#787B86',
        },
    };
    const DEFAULT_DELTA_PROFILE_TEMPLATE = {
        ...DEFAULT_VOLUME_PROFILE_TEMPLATE,
        id: 'delta-profile-v1',
        label: 'Delta Profile',
        displayMode: 'delta',
        metricBinding: {
            magnitudeMetricId: 'volume',
            positiveMetricId: 'buy',
            negativeMetricId: 'sell',
        },
        histogram: {
            ...DEFAULT_VOLUME_PROFILE_TEMPLATE.histogram,
            backgroundColor: '#26a69a',
            borderColor: '#26a69a',
        },
    };
    /** Deep-merge partial template overrides onto a base template. */
    function mergeProfileTemplate(base, partial) {
        return {
            ...base,
            ...partial,
            rowLayout: { ...base.rowLayout, ...partial.rowLayout },
            metrics: partial.metrics ?? base.metrics,
            metricBinding: { ...base.metricBinding, ...partial.metricBinding },
            histogram: { ...base.histogram, ...partial.histogram },
            levels: { ...base.levels, ...partial.levels },
            range: { ...base.range, ...partial.range },
            emptyState: { ...base.emptyState, ...partial.emptyState },
        };
    }

    const COMMON_DEFAULTS = {
        visible: true,
        editable: true,
        showPriceAxisLabels: false,
        showTimeAxisLabels: true,
        priceAxisLabelAlwaysVisible: false,
        timeAxisLabelAlwaysVisible: false,
        magnetThreshold: 10,
    };
    function createDefaultFixedRangeProfileOptions(partial) {
        const template = partial?.fixedRangeProfile?.template
            ? mergeProfileTemplate(DEFAULT_VOLUME_PROFILE_TEMPLATE, partial.fixedRangeProfile.template)
            : DEFAULT_VOLUME_PROFILE_TEMPLATE;
        return {
            ...COMMON_DEFAULTS,
            ...partial,
            fixedRangeProfile: {
                template,
                pipelineId: partial?.fixedRangeProfile?.pipelineId ?? 'ohlc-volume',
                tickSize: partial?.fixedRangeProfile?.tickSize,
                snapshot: partial?.fixedRangeProfile?.snapshot,
            },
        };
    }
    /** Deep-merge user partial options onto current tool options. */
    function mergeFixedRangeProfileOptions(current, partial) {
        const mergedTemplate = partial.fixedRangeProfile?.template
            ? mergeProfileTemplate(current.fixedRangeProfile.template, partial.fixedRangeProfile.template)
            : current.fixedRangeProfile.template;
        return {
            ...current,
            ...partial,
            fixedRangeProfile: {
                ...current.fixedRangeProfile,
                ...partial.fixedRangeProfile,
                template: mergedTemplate,
                pipelineId: partial.fixedRangeProfile?.pipelineId ?? current.fixedRangeProfile.pipelineId,
                tickSize: partial.fixedRangeProfile?.tickSize ?? current.fixedRangeProfile.tickSize,
                snapshot: partial.fixedRangeProfile?.snapshot ?? current.fixedRangeProfile.snapshot,
            },
        };
    }

    function setLinePattern(ctx, style) {
        if (style === 'dashed') {
            ctx.setLineDash([6, 4]);
        }
        else if (style === 'dotted') {
            ctx.setLineDash([2, 3]);
        }
        else {
            ctx.setLineDash([]);
        }
    }
    function metricColor(template, metricId, fallback) {
        return template.metrics.find((m) => m.id === metricId)?.color ?? fallback;
    }
    function metricOpacity(template, metricId, fallback = 1) {
        return template.metrics.find((m) => m.id === metricId)?.opacity ?? fallback;
    }
    /** Fill color/opacity for total-mode bars — magnitude metric drives appearance. */
    function totalBarStyle(template, binding) {
        const magId = binding.magnitudeMetricId;
        return {
            color: metricColor(template, magId, template.histogram.backgroundColor),
            opacity: metricOpacity(template, magId, template.histogram.backgroundOpacity),
        };
    }
    function resolveNormDenominator(template, snapshot, rows) {
        const binding = template.metricBinding;
        if (template.displayMode === 'delta' &&
            binding.positiveMetricId &&
            binding.negativeMetricId) {
            let maxDelta = 0;
            for (const row of rows) {
                const delta = (row.metrics[binding.positiveMetricId] ?? 0) - (row.metrics[binding.negativeMetricId] ?? 0);
                maxDelta = Math.max(maxDelta, Math.abs(delta));
            }
            return maxDelta > 0 ? maxDelta : 1;
        }
        return snapshot.maxMagnitude > 0 ? snapshot.maxMagnitude : 1;
    }
    function resolveRowGeometry(row, template, priceToY) {
        const fixedH = template.histogram.rowHeightPx;
        if (fixedH > 0) {
            const yMid = priceToY(row.price);
            if (yMid == null)
                return null;
            return { rowTop: yMid - fixedH / 2, rowHeight: fixedH };
        }
        const yTop = priceToY(row.priceHigh);
        const yBottom = priceToY(row.priceLow);
        if (yTop == null || yBottom == null)
            return null;
        const rowTop = Math.min(yTop, yBottom);
        const rowHeight = Math.max(Math.abs(yBottom - yTop) - template.histogram.gapPx, template.histogram.minRowHeightPx);
        if (rowHeight <= 0)
            return null;
        return { rowTop, rowHeight };
    }
    /**
     * Canvas renderer for horizontal profile histogram + POC/VA lines.
     */
    class ProfileHistogramRenderer {
        constructor() {
            this._data = null;
        }
        setData(data) {
            this._data = data;
        }
        draw(target) {
            const data = this._data;
            if (!data?.snapshot) {
                return;
            }
            target.useMediaCoordinateSpace((scope) => {
                const ctx = scope.context;
                const snapshot = data.snapshot;
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
                    if (!geom)
                        continue;
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
                    }
                    else if (template.displayMode === 'delta' && binding.positiveMetricId && binding.negativeMetricId) {
                        const delta = (row.metrics[binding.positiveMetricId] ?? 0) - (row.metrics[binding.negativeMetricId] ?? 0);
                        const absNorm = Math.pow(Math.min(Math.abs(delta) / normDenom, 1), gamma);
                        const w = absNorm * maxBarWidth;
                        const positive = delta >= 0;
                        ctx.fillStyle = metricColor(template, positive ? binding.positiveMetricId : binding.negativeMetricId, positive ? '#26a69a' : '#ef5350');
                        ctx.globalAlpha = metricOpacity(template, positive ? binding.positiveMetricId : binding.negativeMetricId);
                        const x = dir > 0 ? anchorX : anchorX - w;
                        ctx.fillRect(x, rowTop, w, rowHeight);
                        ctx.globalAlpha = 1;
                    }
                    else {
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
        hitTest(x, y) {
            const data = this._data;
            if (!data)
                return null;
            const yHigh = data.priceToY(data.priceHigh);
            const yLow = data.priceToY(data.priceLow);
            if (yHigh == null || yLow == null)
                return null;
            const rangeWidth = Math.abs(data.rangeXRight - data.rangeXLeft);
            const histExtend = rangeWidth * data.template.histogram.maxWidthFraction;
            const box = new lightweightChartsLineToolsCore.Box(new lightweightChartsLineToolsCore.Point(Math.min(data.rangeXLeft, data.rangeXRight), Math.min(yHigh, yLow)), new lightweightChartsLineToolsCore.Point((Math.max(data.rangeXLeft, data.rangeXRight) + histExtend), Math.max(yHigh, yLow)));
            if (lightweightChartsLineToolsCore.pointInBox(new lightweightChartsLineToolsCore.Point(x, y), box)) {
                return new lightweightChartsLineToolsCore.HitTestResult(lightweightChartsLineToolsCore.HitTestType.MovePointBackground, {
                    pointIndex: null,
                    suggestedCursor: lightweightChartsLineToolsCore.PaneCursorType.Grabbing,
                });
            }
            return null;
        }
    }

    class RangeBoxRenderer {
        constructor() {
            this._data = null;
        }
        setData(data) {
            this._data = data;
        }
        draw(target) {
            const data = this._data;
            if (!data || !data.visible)
                return;
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
        hitTest(x, y) {
            const data = this._data;
            if (!data || !data.visible)
                return null;
            const box = new lightweightChartsLineToolsCore.Box(new lightweightChartsLineToolsCore.Point(Math.min(data.xLeft, data.xRight), Math.min(data.yTop, data.yBottom)), new lightweightChartsLineToolsCore.Point(Math.max(data.xLeft, data.xRight), Math.max(data.yTop, data.yBottom)));
            if (lightweightChartsLineToolsCore.pointInBox(new lightweightChartsLineToolsCore.Point(x, y), box)) {
                return new lightweightChartsLineToolsCore.HitTestResult(lightweightChartsLineToolsCore.HitTestType.MovePointBackground, {
                    pointIndex: null,
                    suggestedCursor: lightweightChartsLineToolsCore.PaneCursorType.Grabbing,
                });
            }
            return null;
        }
    }

    function normalizeTimeRange(from, to) {
        if (!Number.isFinite(from) || !Number.isFinite(to)) {
            return { from: 0, to: 0 };
        }
        return from <= to ? { from, to } : { from: to, to: from };
    }
    function resolveTickSize(explicit, fallback) {
        if (explicit != null && Number.isFinite(explicit) && explicit > 0) {
            return explicit;
        }
        if (Number.isFinite(fallback) && fallback > 0) {
            return fallback;
        }
        return 0.01;
    }
    function computeRowStep(layout, priceBounds, tickSize) {
        const span = Math.max(priceBounds.high - priceBounds.low, tickSize);
        const maxRows = layout.maxRows ?? 500;
        if (layout.mode === 'tickSize') {
            const step = layout.value > 0 ? layout.value : tickSize;
            return step;
        }
        const targetRows = Math.max(1, Math.min(Math.floor(layout.value), maxRows));
        return span / targetRows;
    }
    function bucketPrice(price, low, step) {
        if (!Number.isFinite(price) || step <= 0) {
            return price;
        }
        const idx = Math.floor((price - low) / step);
        return low + idx * step;
    }
    function sanitizeMetricValue(value) {
        if (!Number.isFinite(value) || value === 0) {
            return 0;
        }
        return value;
    }
    function boundsFromPrices(prices) {
        const finite = prices.filter((p) => Number.isFinite(p));
        if (finite.length === 0) {
            return null;
        }
        return {
            low: Math.min(...finite),
            high: Math.max(...finite),
        };
    }
    /** Infer tick size from OHLC bars when not explicitly provided. */
    function inferTickSizeFromBars(bars) {
        let minPositiveDiff = Infinity;
        for (const bar of bars) {
            if (!bar || typeof bar !== 'object')
                continue;
            const rec = bar;
            for (const key of ['open', 'high', 'low', 'close']) {
                const v = rec[key];
                if (!Number.isFinite(v))
                    continue;
                const str = String(v);
                const dot = str.indexOf('.');
                if (dot >= 0) {
                    const decimals = str.length - dot - 1;
                    const step = Math.pow(10, -decimals);
                    if (step > 0 && step < minPositiveDiff) {
                        minPositiveDiff = step;
                    }
                }
            }
        }
        return Number.isFinite(minPositiveDiff) && minPositiveDiff < Infinity ? minPositiveDiff : 0.01;
    }
    function isOhlcBar(bar) {
        if (!bar || typeof bar !== 'object')
            return false;
        const b = bar;
        return (Number.isFinite(b.open) &&
            Number.isFinite(b.high) &&
            Number.isFinite(b.low) &&
            Number.isFinite(b.close));
    }
    /** Sum samples into price buckets at the given step. */
    function sumSamplesIntoBuckets(samples, bounds, step, metrics) {
        const buckets = new Map();
        for (const sample of samples) {
            const key = bucketPrice(sample.price, bounds.low, step);
            let acc = buckets.get(key);
            if (!acc) {
                acc = {};
                for (const m of metrics) {
                    acc[m.id] = 0;
                }
                buckets.set(key, acc);
            }
            for (const m of metrics) {
                acc[m.id] = (acc[m.id] ?? 0) + sanitizeMetricValue(sample.metrics[m.id] ?? 0);
            }
        }
        return buckets;
    }
    /** Convert bucket map to profile rows. */
    function rowsFromBuckets(buckets, step, metrics) {
        const sortedKeys = [...buckets.keys()].sort((a, b) => a - b);
        return sortedKeys.map((priceLow) => {
            const raw = buckets.get(priceLow);
            const outMetrics = {};
            for (const m of metrics) {
                outMetrics[m.id] = sanitizeMetricValue(raw[m.id] ?? 0);
            }
            return {
                price: priceLow + step / 2,
                priceLow,
                priceHigh: priceLow + step,
                metrics: outMetrics,
            };
        });
    }
    /**
     * When tick-size binning produces more buckets than maxRows, re-bin with a coarser step
     * so high-volume price levels are not silently dropped from the top of the range.
     */
    function binSamplesWithMaxRows(samples, bounds, initialStep, tickSize, layout, metrics) {
        const maxRows = layout.maxRows ?? 500;
        let step = initialStep > 0 ? initialStep : tickSize;
        if (step <= 0) {
            return [];
        }
        let buckets = sumSamplesIntoBuckets(samples, bounds, step, metrics);
        if (buckets.size > maxRows) {
            const span = Math.max(bounds.high - bounds.low, tickSize);
            step = span / maxRows;
            if (step <= 0) {
                return [];
            }
            buckets = sumSamplesIntoBuckets(samples, bounds, step, metrics);
        }
        return rowsFromBuckets(buckets, step, metrics);
    }

    class FixedRangeProfilePaneView extends lightweightChartsLineToolsCore.LineToolPaneView {
        constructor(tool, chart, series) {
            super(tool, chart, series);
            this._histogramRenderer = new ProfileHistogramRenderer();
            this._rangeBoxRenderer = new RangeBoxRenderer();
        }
        _updateImpl(height, width) {
            this._renderer.clear();
            const tool = this._tool;
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
                    this._addAnchors(this._renderer);
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
                    this._renderer.append(this._rangeBoxRenderer);
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
            this._renderer.append(this._histogramRenderer);
            if (this.areAnchorsVisible()) {
                this._addAnchors(this._renderer);
            }
        }
        /**
         * Start/end range handles — without these only the histogram body is hit-testable (move-only).
         */
        _addAnchors(renderer) {
            if (this._points.length < 2) {
                return;
            }
            const geom = this._tool.getRangeGeometry();
            const anchorPoints = [];
            if (geom) {
                const y0 = this._series.priceToCoordinate(this._tool.getPoint(0)?.price ?? geom.priceLow);
                const y1 = this._series.priceToCoordinate(this._tool.getPoint(1)?.price ?? geom.priceHigh);
                const yMid = this._series.priceToCoordinate((geom.priceLow + geom.priceHigh) / 2);
                anchorPoints.push(new lightweightChartsLineToolsCore.AnchorPoint(geom.xLeft, (y0 ?? yMid ?? this._points[0].y), 0, false, lightweightChartsLineToolsCore.PaneCursorType.EwResize), new lightweightChartsLineToolsCore.AnchorPoint(geom.xRight, (y1 ?? yMid ?? this._points[1].y), 1, false, lightweightChartsLineToolsCore.PaneCursorType.EwResize));
            }
            else {
                for (let i = 0; i < Math.min(this._points.length, 2); i++) {
                    const p = this._points[i];
                    anchorPoints.push(new lightweightChartsLineToolsCore.AnchorPoint(p.x, p.y, i, false, lightweightChartsLineToolsCore.PaneCursorType.EwResize));
                }
            }
            const anchorRenderer = this.createLineAnchor({
                points: anchorPoints,
                defaultAnchorHoverCursor: lightweightChartsLineToolsCore.PaneCursorType.EwResize,
                defaultAnchorDragCursor: lightweightChartsLineToolsCore.PaneCursorType.EwResize,
            }, 0);
            renderer.append(anchorRenderer);
        }
    }
    /** Resolve screen X for a unix timestamp using core interpolation helpers. */
    function timeToScreenX(chart, series, timestamp) {
        const logical = lightweightChartsLineToolsCore.interpolateLogicalIndexFromTime(chart, series, timestamp);
        if (logical == null)
            return null;
        return lightweightChartsLineToolsCore.logicalIndexToCoordinate(chart.timeScale(), logical);
    }
    /** Compute price bounds from bars in range plus anchor prices. */
    function resolvePriceBounds(bars, anchorPrices) {
        let low = Infinity;
        let high = -Infinity;
        for (const p of anchorPrices) {
            if (Number.isFinite(p)) {
                low = Math.min(low, p);
                high = Math.max(high, p);
            }
        }
        for (const bar of bars) {
            if (!isOhlcBar(bar))
                continue;
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

    /** Runs extractor across all bars, then aggregator, with defensive empty handling. */
    function resolveProfile(options) {
        const { template, range, bars, pipeline } = options;
        const tickSize = resolveTickSize(options.tickSize, inferTickSizeFromBars(bars));
        const ctx = {
            template,
            range,
            bars,
            tickSize,
        };
        if (bars.length === 0) {
            return { rows: [], barCount: 0, warning: 'No bars in selected time range.' };
        }
        const flatSamples = [];
        for (const bar of bars) {
            const samples = pipeline.extractor(bar, ctx);
            for (const s of samples) {
                if (!Number.isFinite(s.price))
                    continue;
                const metrics = {};
                for (const m of template.metrics) {
                    metrics[m.id] = sanitizeMetricValue(s.metrics[m.id] ?? 0);
                }
                flatSamples.push({ price: s.price, metrics });
            }
        }
        if (flatSamples.length === 0) {
            return {
                rows: [],
                barCount: bars.length,
                warning: 'Bars in range produced no price-level samples. Check extractor or data shape.',
            };
        }
        let rows = pipeline.aggregator(flatSamples, ctx);
        if (rows.length === 0) {
            rows = defaultBinningAggregator(flatSamples, ctx);
        }
        if (rows.length === 0) {
            return {
                rows: [],
                barCount: bars.length,
                warning: 'Aggregation produced zero rows.',
            };
        }
        return { rows, barCount: bars.length };
    }
    /**
     * Default binning aggregator — sums metrics into price buckets.
     * Used as fallback and by the built-in `sum-binned` pipeline.
     */
    function defaultBinningAggregator(samples, ctx) {
        const prices = samples.map((s) => s.price);
        const sampleBounds = boundsFromPrices(prices);
        if (!sampleBounds) {
            return [];
        }
        let bounds = sampleBounds;
        for (const bar of ctx.bars) {
            if (!isOhlcBar(bar))
                continue;
            bounds = {
                low: Math.min(bounds.low, bar.low),
                high: Math.max(bounds.high, bar.high),
            };
        }
        const step = computeRowStep(ctx.template.rowLayout, bounds, ctx.tickSize);
        if (step <= 0) {
            return [];
        }
        return binSamplesWithMaxRows(samples, bounds, step, ctx.tickSize, ctx.template.rowLayout, ctx.template.metrics);
    }

    const pipelines = new Map();
    function registerProfilePipeline(definition) {
        if (pipelines.has(definition.id)) {
            console.warn(`[FixedRangeProfile] Pipeline "${definition.id}" is already registered and will be overwritten.`);
        }
        pipelines.set(definition.id, definition);
    }
    function unregisterProfilePipeline(id) {
        pipelines.delete(id);
    }
    function getProfilePipeline(id) {
        return pipelines.get(id);
    }
    function listProfilePipelines() {
        return [...pipelines.values()];
    }
    function clearProfilePipelines() {
        pipelines.clear();
    }
    /** Registers built-in volume / delta / custom-sum pipelines. Idempotent. */
    function registerBuiltinProfilePipelines(deps) {
        registerProfilePipeline({
            id: 'ohlc-volume',
            label: 'OHLC volume (fallback)',
            extractor: deps.ohlcVolumeExtractor,
            aggregator: deps.sumBinnedAggregator,
        });
        registerProfilePipeline({
            id: 'trades-by-price',
            label: 'Trades by price',
            extractor: deps.tradesByPriceExtractor,
            aggregator: deps.sumBinnedAggregator,
        });
        registerProfilePipeline({
            id: 'sum-binned',
            label: 'Generic sum (requires pre-shaped bar samples)',
            extractor: () => [],
            aggregator: deps.sumBinnedAggregator,
        });
    }

    let barSource = null;
    /**
     * Optional override for bar lookup. Use when series.data() strips custom fields
     * (volume, tradesByPrice, features) or when bars live outside the LWC series.
     */
    function registerProfileBarSource(source) {
        barSource = source;
    }
    function getProfileBarSource() {
        return barSource;
    }
    /** Resolve a bar's numeric time key for Map lookups. */
    function barTimeToKey(bar) {
        if (!bar || typeof bar !== 'object')
            return null;
        const t = bar.time;
        if (typeof t === 'number' && Number.isFinite(t))
            return t;
        return null;
    }

    /** Clamps user-supplied value area fraction to a sane 1–100% range. */
    function clampValueAreaFraction(fraction) {
        if (!Number.isFinite(fraction)) {
            return 0.7;
        }
        return Math.min(1, Math.max(0.01, fraction));
    }
    /**
     * Computes POC and value area from profile rows using the template's magnitude metric.
     */
    function computeValueArea(rows, template) {
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
        let pocPrice = null;
        let pocMag = -Infinity;
        const magnitudes = [];
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
            }
            else if (lowIdx > 0) {
                lowIdx -= 1;
                accumulated += magnitudes[lowIdx].mag;
            }
            else {
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

    /** Cache key inputs that affect profile computation (not pure styling). */
    function buildProfileSnapshotCacheKey(timeRange, fixedRangeProfile, pointsLength) {
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

    class LineToolFixedRangeProfile extends lightweightChartsLineToolsCore.BaseLineTool {
        constructor(coreApi, chart, series, horzScaleBehavior, options, points = [], priceAxisLabelStackingManager) {
            const finalOptions = createDefaultFixedRangeProfileOptions(options);
            super(coreApi, chart, series, horzScaleBehavior, finalOptions, points, FIXED_RANGE_PROFILE_TOOL_TYPE, 2, priceAxisLabelStackingManager);
            this._lastComputeKey = null;
            this._setPaneViews([
                new FixedRangeProfilePaneView(this, chart, series),
            ]);
        }
        supportsClickClickCreation() {
            return true;
        }
        supportsClickDragCreation() {
            return true;
        }
        applyOptions(options) {
            const merged = mergeFixedRangeProfileOptions(this.options(), options);
            this._options = merged;
            this._lastComputeKey = null;
            this.updateAllViews('options');
            this._triggerChartUpdate();
        }
        options() {
            return this._options;
        }
        updateCullingState() {
            const points = this.points();
            if (points.length === 0) {
                this._setIsCulled(false);
                return;
            }
            const result = lightweightChartsLineToolsCore.getToolCullingState(points, this, { left: false, right: false });
            this._setIsCulled(result !== lightweightChartsLineToolsCore.OffScreenState.Visible);
        }
        _internalHitTest(x, y) {
            if (!this.options().visible) {
                return null;
            }
            for (const pv of this._paneViews) {
                const renderer = pv.renderer();
                if (renderer && 'hitTest' in renderer && typeof renderer.hitTest === 'function') {
                    const hit = renderer.hitTest(x, y);
                    if (hit) {
                        return hit;
                    }
                }
            }
            return null;
        }
        getResolvedTimeRange() {
            const pts = this._points;
            if (pts.length < 1) {
                return null;
            }
            let from = pts[0].timestamp;
            let to = pts.length >= 2 ? pts[1].timestamp : from;
            if (this.options().fixedRangeProfile.template.range.extendRight) {
                const latest = this.coreApi().getLatestBar();
                if (latest?.time != null) {
                    const t = typeof latest.time === 'number'
                        ? latest.time
                        : this._horzScaleBehavior.key(latest.time);
                    to = Math.max(to, t);
                }
            }
            return normalizeTimeRange(from, to);
        }
        getRangeGeometry() {
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
        recomputeSnapshotIfNeeded() {
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
                const emptySnapshot = {
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
            const snapshot = {
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
        _resolveBarsInRange(timeRange) {
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
                        : this._horzScaleBehavior.key(fromBar.time);
            }
            if (toBar?.time != null) {
                to =
                    typeof toBar.time === 'number'
                        ? toBar.time
                        : this._horzScaleBehavior.key(toBar.time);
            }
            return this.coreApi().getDataInRange({ from, to });
        }
        _patchSnapshot(snapshot) {
            const current = this.options();
            this._options = {
                ...current,
                fixedRangeProfile: {
                    ...current.fixedRangeProfile,
                    snapshot: lightweightChartsLineToolsCore.deepCopy(snapshot),
                },
            };
        }
        updateAllViews(updateType) {
            if (updateType === 'data' || updateType === 'other' || updateType === 'options') {
                this._lastComputeKey = null;
            }
            super.updateAllViews(updateType);
        }
        tryFinish() {
            super.tryFinish();
            this._lastComputeKey = null;
            this.recomputeSnapshotIfNeeded();
            this.updateAllViews('data');
            this._triggerChartUpdate();
        }
        setPoint(index, point) {
            super.setPoint(index, point);
            this._lastComputeKey = null;
        }
        setPoints(points) {
            super.setPoints(points);
            this._lastComputeKey = null;
        }
    }

    /**
     * Fallback extractor when tick/trades data is unavailable.
     * Distributes bar volume to close price only (single sample per bar).
     */
    function createOhlcVolumeExtractor(options = {}) {
        const useFallback = options.useCloseOpenFallback ?? true;
        return (bar) => {
            if (!isOhlcBar(bar)) {
                return [];
            }
            const volume = Number.isFinite(bar.volume) && bar.volume > 0 ? bar.volume : 0;
            if (volume <= 0) {
                return [];
            }
            const price = bar.close;
            if (useFallback) {
                const isUp = bar.close > bar.open;
                return [
                    {
                        price,
                        metrics: {
                            volume,
                            buy: isUp ? volume : 0,
                            sell: isUp ? 0 : volume,
                        },
                    },
                ];
            }
            return [{ price, metrics: { volume, buy: 0, sell: 0 } }];
        };
    }
    function readPath(obj, path) {
        const parts = path.split('.');
        let cur = obj;
        for (const p of parts) {
            if (cur == null || typeof cur !== 'object')
                return undefined;
            cur = cur[p];
        }
        return cur;
    }
    /**
     * Extracts samples from a bar shaped like `{ tradesByPrice: { [price: string]: number[] } }`.
     * Also accepts `{ trades_by_price: ... }` via field option.
     */
    function createTradesByPriceExtractor(options = {}) {
        const field = options.field ?? 'tradesByPrice';
        const signed = options.signedTrades ?? true;
        const ids = options.metricIds ?? { volume: 'volume', buy: 'buy', sell: 'sell' };
        return (bar) => {
            const raw = readPath(bar, field) ?? readPath(bar, 'trades_by_price');
            if (!raw || typeof raw !== 'object') {
                return [];
            }
            const out = [];
            for (const [priceKey, trades] of Object.entries(raw)) {
                const price = Number(priceKey);
                if (!Number.isFinite(price))
                    continue;
                let buy = 0;
                let sell = 0;
                if (Array.isArray(trades)) {
                    for (const t of trades) {
                        const n = Number(t);
                        if (!Number.isFinite(n))
                            continue;
                        if (signed) {
                            if (n >= 0)
                                buy += n;
                            else
                                sell += Math.abs(n);
                        }
                        else {
                            buy += Math.abs(n);
                        }
                    }
                }
                else if (typeof trades === 'object' && trades !== null) {
                    const rec = trades;
                    buy = Number(rec.buy ?? rec.b ?? 0) || 0;
                    sell = Number(rec.sell ?? rec.s ?? 0) || 0;
                    if (!signed && buy === 0 && sell === 0) {
                        const total = Number(rec.volume ?? rec.total ?? 0) || 0;
                        buy = total;
                    }
                }
                else {
                    const n = Number(trades);
                    if (Number.isFinite(n) && n > 0) {
                        buy = n;
                    }
                }
                const volume = buy + sell;
                if (volume <= 0)
                    continue;
                out.push({
                    price,
                    metrics: {
                        [ids.volume]: volume,
                        [ids.buy]: buy,
                        [ids.sell]: sell,
                    },
                });
            }
            return out;
        };
    }
    function createMapFieldExtractor(options) {
        const parse = options.priceKeyParser ?? ((k) => Number(k));
        return (bar) => {
            const raw = readPath(bar, options.field);
            if (!raw || typeof raw !== 'object') {
                return [];
            }
            const out = [];
            for (const [key, value] of Object.entries(raw)) {
                const price = parse(key);
                const magnitude = Number(value);
                if (!Number.isFinite(price) || !Number.isFinite(magnitude) || magnitude === 0) {
                    continue;
                }
                out.push({
                    price,
                    metrics: { [options.metricId]: magnitude },
                });
            }
            return out;
        };
    }

    /** Sum samples into binned rows (default behaviour). */
    function createSumBinnedAggregator() {
        return (samples, ctx) => defaultBinningAggregator(samples, ctx);
    }
    /** Average samples per bucket instead of sum. */
    function createAverageBinnedAggregator() {
        return (samples, ctx) => {
            const rows = defaultBinningAggregator(samples, ctx);
            if (samples.length === 0 || ctx.bars.length === 0) {
                return rows;
            }
            const divisor = ctx.bars.length;
            return rows.map((row) => {
                const metrics = {};
                for (const [k, v] of Object.entries(row.metrics)) {
                    metrics[k] = v / divisor;
                }
                return { ...row, metrics };
            });
        };
    }
    /** Max value per bucket (useful for peak metrics, not cumulative volume). */
    function createMaxBinnedAggregator() {
        return (samples, ctx) => {
            const prices = samples.map((s) => s.price);
            const bounds = boundsFromPrices(prices);
            if (!bounds)
                return [];
            const step = computeRowStep(ctx.template.rowLayout, bounds, ctx.tickSize);
            if (step <= 0)
                return [];
            const accumulateMax = (stepSize) => {
                const buckets = new Map();
                for (const sample of samples) {
                    const key = bucketPrice(sample.price, bounds.low, stepSize);
                    let acc = buckets.get(key);
                    if (!acc) {
                        acc = {};
                        for (const m of ctx.template.metrics) {
                            acc[m.id] = 0;
                        }
                        buckets.set(key, acc);
                    }
                    for (const m of ctx.template.metrics) {
                        const v = sanitizeMetricValue(sample.metrics[m.id] ?? 0);
                        acc[m.id] = Math.max(acc[m.id] ?? 0, v);
                    }
                }
                return buckets;
            };
            let effectiveStep = step;
            let buckets = accumulateMax(effectiveStep);
            const maxRows = ctx.template.rowLayout.maxRows ?? 500;
            if (buckets.size > maxRows) {
                const span = Math.max(bounds.high - bounds.low, ctx.tickSize);
                effectiveStep = span / maxRows;
                if (effectiveStep <= 0)
                    return [];
                buckets = accumulateMax(effectiveStep);
            }
            return rowsFromBuckets(buckets, effectiveStep, ctx.template.metrics);
        };
    }

    let builtinsRegistered = false;
    /** Idempotent — registers ohlc-volume, trades-by-price, and sum-binned pipelines. */
    function ensureBuiltinProfilePipelines() {
        if (builtinsRegistered) {
            return;
        }
        registerBuiltinProfilePipelines({
            ohlcVolumeExtractor: createOhlcVolumeExtractor({ useCloseOpenFallback: true }),
            tradesByPriceExtractor: createTradesByPriceExtractor(),
            sumBinnedAggregator: createSumBinnedAggregator(),
        });
        builtinsRegistered = true;
    }
    function resetBuiltinProfilePipelinesForTests() {
        builtinsRegistered = false;
    }

    const PROFILE_PROPERTY_SECTIONS = [
        {
            id: 'general',
            title: 'General',
            description: 'Visibility, data source, and template identity.',
            fields: [
                { id: 'visible', label: 'Visible', path: 'visible', type: 'checkbox' },
                { id: 'editable', label: 'Editable on chart', path: 'editable', type: 'checkbox' },
                { id: 'templateLabel', label: 'Template label', path: 'fixedRangeProfile.template.label', type: 'text' },
                { id: 'pipelineId', label: 'Data pipeline', path: 'fixedRangeProfile.pipelineId', type: 'select', options: [] },
                { id: 'tickSize', label: 'Price tick size (binning fallback)', path: 'fixedRangeProfile.tickSize', type: 'number', min: 0, step: 0.0001, hint: 'Leave empty to infer from bars.' },
            ],
        },
        {
            id: 'display',
            title: 'Display mode',
            description: 'How histogram rows are rendered and which metrics drive width.',
            fields: [
                {
                    id: 'displayMode',
                    label: 'Display mode',
                    path: 'fixedRangeProfile.template.displayMode',
                    type: 'select',
                    options: [
                        { value: 'total', label: 'Total' },
                        { value: 'split', label: 'Up / Down split' },
                        { value: 'delta', label: 'Delta' },
                    ],
                },
                {
                    id: 'magnitudeMetricId',
                    label: 'Magnitude metric (width + POC)',
                    path: 'fixedRangeProfile.template.metricBinding.magnitudeMetricId',
                    type: 'metricSelect',
                },
                {
                    id: 'positiveMetricId',
                    label: 'Positive metric (split / delta)',
                    path: 'fixedRangeProfile.template.metricBinding.positiveMetricId',
                    type: 'metricSelect',
                },
                {
                    id: 'negativeMetricId',
                    label: 'Negative metric (split / delta)',
                    path: 'fixedRangeProfile.template.metricBinding.negativeMetricId',
                    type: 'metricSelect',
                },
            ],
        },
        {
            id: 'layout',
            title: 'Row layout',
            description: 'Price-axis binning and histogram anchor.',
            fields: [
                {
                    id: 'rowLayoutMode',
                    label: 'Binning mode',
                    path: 'fixedRangeProfile.template.rowLayout.mode',
                    type: 'select',
                    options: [
                        { value: 'rowCount', label: 'Fixed row count' },
                        { value: 'tickSize', label: 'Fixed tick size' },
                    ],
                },
                {
                    id: 'rowLayoutValue',
                    label: 'Row count',
                    path: 'fixedRangeProfile.template.rowLayout.value',
                    type: 'number',
                    min: 1,
                    max: 500,
                    step: 1,
                    visibleWhen: (t) => t.rowLayout.mode === 'rowCount',
                },
                {
                    id: 'rowLayoutTick',
                    label: 'Tick size per row',
                    path: 'fixedRangeProfile.template.rowLayout.value',
                    type: 'number',
                    min: 0.0001,
                    step: 0.0001,
                    visibleWhen: (t) => t.rowLayout.mode === 'tickSize',
                },
                {
                    id: 'maxRows',
                    label: 'Max rows cap',
                    path: 'fixedRangeProfile.template.rowLayout.maxRows',
                    type: 'number',
                    min: 1,
                    max: 2000,
                    step: 1,
                },
                {
                    id: 'histogramAnchor',
                    label: 'Histogram anchor',
                    path: 'fixedRangeProfile.template.histogram.anchor',
                    type: 'select',
                    options: [
                        { value: 'rangeRight', label: 'Range right edge' },
                        { value: 'rangeLeft', label: 'Range left edge' },
                    ],
                },
            ],
        },
        {
            id: 'histogram',
            title: 'Histogram style',
            description: 'Bar width, spacing, and fill colors.',
            fields: [
                {
                    id: 'maxWidthFraction',
                    label: 'Max bar width fraction',
                    path: 'fixedRangeProfile.template.histogram.maxWidthFraction',
                    type: 'range',
                    min: 0.05,
                    max: 1,
                    step: 0.05,
                },
                {
                    id: 'lengthGamma',
                    label: 'Length gamma',
                    path: 'fixedRangeProfile.template.histogram.lengthGamma',
                    type: 'range',
                    min: 0.25,
                    max: 3,
                    step: 0.05,
                    hint: 'Skews bar lengths after normalization (>1 compresses small values).',
                },
                {
                    id: 'rowHeightPx',
                    label: 'Fixed row height (px, 0 = auto)',
                    path: 'fixedRangeProfile.template.histogram.rowHeightPx',
                    type: 'number',
                    min: 0,
                    max: 64,
                    step: 1,
                },
                {
                    id: 'minRowHeightPx',
                    label: 'Minimum row height (px)',
                    path: 'fixedRangeProfile.template.histogram.minRowHeightPx',
                    type: 'number',
                    min: 1,
                    max: 32,
                    step: 1,
                },
                {
                    id: 'gapPx',
                    label: 'Gap between rows (px)',
                    path: 'fixedRangeProfile.template.histogram.gapPx',
                    type: 'number',
                    min: 0,
                    max: 16,
                    step: 1,
                },
                {
                    id: 'backgroundColor',
                    label: 'Background color',
                    path: 'fixedRangeProfile.template.histogram.backgroundColor',
                    type: 'color',
                },
                {
                    id: 'backgroundOpacity',
                    label: 'Background opacity',
                    path: 'fixedRangeProfile.template.histogram.backgroundOpacity',
                    type: 'range',
                    min: 0,
                    max: 1,
                    step: 0.05,
                },
                {
                    id: 'borderColor',
                    label: 'Border color',
                    path: 'fixedRangeProfile.template.histogram.borderColor',
                    type: 'color',
                },
                {
                    id: 'borderWidth',
                    label: 'Border width (px)',
                    path: 'fixedRangeProfile.template.histogram.borderWidth',
                    type: 'number',
                    min: 0,
                    max: 8,
                    step: 1,
                },
            ],
        },
        {
            id: 'levels',
            title: 'POC & value area',
            description: 'Point of control and value area markers.',
            fields: [
                { id: 'showPoc', label: 'Show POC line', path: 'fixedRangeProfile.template.levels.showPoc', type: 'checkbox' },
                { id: 'showValueArea', label: 'Show value area lines', path: 'fixedRangeProfile.template.levels.showValueArea', type: 'checkbox' },
                {
                    id: 'valueAreaFraction',
                    label: 'Value area %',
                    path: 'fixedRangeProfile.template.levels.valueAreaFraction',
                    type: 'percent',
                    min: 1,
                    max: 100,
                    step: 1,
                },
                { id: 'pocColor', label: 'POC color', path: 'fixedRangeProfile.template.levels.pocColor', type: 'color' },
                { id: 'valueAreaColor', label: 'Value area color', path: 'fixedRangeProfile.template.levels.valueAreaColor', type: 'color' },
                {
                    id: 'levelLineWidth',
                    label: 'Level line width (px)',
                    path: 'fixedRangeProfile.template.levels.levelLineWidth',
                    type: 'number',
                    min: 1,
                    max: 8,
                    step: 1,
                },
                {
                    id: 'levelLineStyle',
                    label: 'Level line style',
                    path: 'fixedRangeProfile.template.levels.levelLineStyle',
                    type: 'select',
                    options: [
                        { value: 'solid', label: 'Solid' },
                        { value: 'dashed', label: 'Dashed' },
                        { value: 'dotted', label: 'Dotted' },
                    ],
                },
            ],
        },
        {
            id: 'range',
            title: 'Range selection box',
            description: 'Time-range chrome around the profile.',
            fields: [
                {
                    id: 'showSelectionBox',
                    label: 'Show selection box',
                    path: 'fixedRangeProfile.template.range.showSelectionBox',
                    type: 'checkbox',
                },
                {
                    id: 'extendRight',
                    label: 'Extend histogram to chart right edge',
                    path: 'fixedRangeProfile.template.range.extendRight',
                    type: 'checkbox',
                },
                {
                    id: 'boxBorderColor',
                    label: 'Box border color',
                    path: 'fixedRangeProfile.template.range.boxBorderColor',
                    type: 'color',
                },
                {
                    id: 'boxBackgroundColor',
                    label: 'Box fill color',
                    path: 'fixedRangeProfile.template.range.boxBackgroundColor',
                    type: 'color',
                },
                {
                    id: 'boxBackgroundOpacity',
                    label: 'Box fill opacity',
                    path: 'fixedRangeProfile.template.range.boxBackgroundOpacity',
                    type: 'range',
                    min: 0,
                    max: 1,
                    step: 0.05,
                },
            ],
        },
        {
            id: 'empty',
            title: 'Empty state',
            description: 'Placeholder when no bars fall in the range.',
            fields: [
                {
                    id: 'showPlaceholder',
                    label: 'Show placeholder message',
                    path: 'fixedRangeProfile.template.emptyState.showPlaceholder',
                    type: 'checkbox',
                },
                {
                    id: 'emptyMessage',
                    label: 'Placeholder message',
                    path: 'fixedRangeProfile.template.emptyState.message',
                    type: 'text',
                },
                {
                    id: 'emptyColor',
                    label: 'Placeholder text color',
                    path: 'fixedRangeProfile.template.emptyState.color',
                    type: 'color',
                },
            ],
        },
        {
            id: 'interaction',
            title: 'Interaction & labels',
            description: 'Axis labels and crosshair magnet behaviour.',
            fields: [
                { id: 'showPriceAxisLabels', label: 'Show price axis labels', path: 'showPriceAxisLabels', type: 'checkbox' },
                { id: 'showTimeAxisLabels', label: 'Show time axis labels', path: 'showTimeAxisLabels', type: 'checkbox' },
                {
                    id: 'priceAxisLabelAlwaysVisible',
                    label: 'Price labels always visible',
                    path: 'priceAxisLabelAlwaysVisible',
                    type: 'checkbox',
                },
                {
                    id: 'timeAxisLabelAlwaysVisible',
                    label: 'Time labels always visible',
                    path: 'timeAxisLabelAlwaysVisible',
                    type: 'checkbox',
                },
                {
                    id: 'magnetThreshold',
                    label: 'OHLC magnet threshold (px)',
                    path: 'magnetThreshold',
                    type: 'number',
                    min: 0,
                    max: 50,
                    step: 1,
                },
            ],
        },
    ];
    const METRIC_ROLE_OPTIONS = [
        { value: 'magnitude', label: 'Magnitude' },
        { value: 'positive', label: 'Positive' },
        { value: 'negative', label: 'Negative' },
        { value: 'neutral', label: 'Neutral' },
    ];
    /** Dot-path read on a plain object tree. */
    function getPropertyPath(root, path) {
        const parts = path.split('.');
        let current = root;
        for (const part of parts) {
            if (current == null || typeof current !== 'object') {
                return undefined;
            }
            current = current[part];
        }
        return current;
    }
    /** Dot-path write; creates intermediate objects as needed. */
    function setPropertyPath(root, path, value) {
        const parts = path.split('.');
        let current = root;
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            const next = current[part];
            if (next == null || typeof next !== 'object') {
                current[part] = {};
            }
            current = current[part];
        }
        current[parts[parts.length - 1]] = value;
    }
    /** Deep clone via JSON — options objects are JSON-serializable. */
    function cloneEditorState(value) {
        return JSON.parse(JSON.stringify(value));
    }

    const PROFILE_PROPERTIES_EDITOR_STYLES = `
.vp-props-root {
	position: fixed;
	inset: 0;
	z-index: 10000;
	display: flex;
	align-items: center;
	justify-content: center;
	font-family: system-ui, -apple-system, sans-serif;
	font-size: 13px;
	color: #d1d4dc;
}
.vp-props-root[hidden] { display: none; }
.vp-props-backdrop {
	position: absolute;
	inset: 0;
	background: rgba(0, 0, 0, 0.55);
}
.vp-props-dialog {
	position: relative;
	display: flex;
	flex-direction: column;
	width: min(720px, calc(100vw - 32px));
	max-height: min(88vh, 900px);
	background: #1e222d;
	border: 1px solid #363a45;
	border-radius: 8px;
	box-shadow: 0 16px 48px rgba(0, 0, 0, 0.45);
	overflow: hidden;
}
.vp-props-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 16px;
	border-bottom: 1px solid #2a2e39;
	background: #131722;
}
.vp-props-header h2 {
	margin: 0;
	font-size: 15px;
	font-weight: 600;
}
.vp-props-header p {
	margin: 2px 0 0;
	font-size: 11px;
	color: #787b86;
}
.vp-props-close {
	border: none;
	background: transparent;
	color: #787b86;
	font-size: 20px;
	line-height: 1;
	cursor: pointer;
	padding: 4px 8px;
	border-radius: 4px;
}
.vp-props-close:hover { color: #d1d4dc; background: #2a2e39; }
.vp-props-body {
	flex: 1;
	overflow-y: auto;
	padding: 12px 16px 16px;
}
.vp-props-section {
	margin-bottom: 12px;
	border: 1px solid #2a2e39;
	border-radius: 6px;
	background: #131722;
}
.vp-props-section summary {
	cursor: pointer;
	padding: 10px 12px;
	font-weight: 600;
	list-style: none;
	display: flex;
	align-items: center;
	justify-content: space-between;
}
.vp-props-section summary::-webkit-details-marker { display: none; }
.vp-props-section summary::after {
	content: '▸';
	color: #787b86;
	font-size: 12px;
}
.vp-props-section[open] summary::after { content: '▾'; }
.vp-props-section-desc {
	padding: 0 12px 8px;
	font-size: 11px;
	color: #787b86;
}
.vp-props-fields {
	padding: 0 12px 12px;
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 10px 16px;
}
.vp-props-field {
	display: flex;
	flex-direction: column;
	gap: 4px;
	min-width: 0;
}
.vp-props-field.full { grid-column: 1 / -1; }
.vp-props-field label {
	font-size: 11px;
	color: #787b86;
}
.vp-props-field input[type="text"],
.vp-props-field input[type="number"],
.vp-props-field select {
	width: 100%;
	padding: 6px 8px;
	background: #1e222d;
	border: 1px solid #363a45;
	color: #d1d4dc;
	border-radius: 4px;
}
.vp-props-field input[type="range"] { width: 100%; }
.vp-props-field input[type="checkbox"] { width: auto; align-self: flex-start; }
.vp-props-color-row {
	display: flex;
	gap: 8px;
	align-items: center;
}
.vp-props-color-row input[type="color"] {
	width: 36px;
	height: 28px;
	padding: 0;
	border: 1px solid #363a45;
	background: transparent;
	cursor: pointer;
}
.vp-props-hint {
	font-size: 10px;
	color: #5d606b;
	line-height: 1.3;
}
.vp-props-range-value {
	font-size: 11px;
	color: #787b86;
}
.vp-props-metrics {
	padding: 0 12px 12px;
	display: flex;
	flex-direction: column;
	gap: 10px;
}
.vp-props-metric-card {
	border: 1px solid #2a2e39;
	border-radius: 6px;
	padding: 10px;
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 8px 12px;
	background: #1e222d;
}
.vp-props-metric-card h4 {
	grid-column: 1 / -1;
	margin: 0;
	font-size: 12px;
	color: #d1d4dc;
}
.vp-props-metric-id {
	font-size: 10px;
	color: #787b86;
	font-weight: normal;
}
.vp-props-stats {
	padding: 0 12px 12px;
	font-family: ui-monospace, monospace;
	font-size: 11px;
	color: #787b86;
	line-height: 1.5;
}
.vp-props-presets {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	padding: 0 12px 12px;
}
.vp-props-presets button {
	padding: 4px 10px;
	font-size: 11px;
	background: #2a2e39;
	border: 1px solid #363a45;
	color: #d1d4dc;
	border-radius: 4px;
	cursor: pointer;
}
.vp-props-presets button:hover { background: #363a45; }
.vp-props-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 16px;
	border-top: 1px solid #2a2e39;
	background: #131722;
}
.vp-props-footer-left,
.vp-props-footer-right {
	display: flex;
	gap: 8px;
}
.vp-props-footer button {
	padding: 8px 14px;
	border-radius: 4px;
	border: 1px solid #363a45;
	background: #1e222d;
	color: #d1d4dc;
	cursor: pointer;
	font-size: 13px;
}
.vp-props-footer button.primary {
	background: #2962ff;
	border-color: #2962ff;
	color: #fff;
}
.vp-props-footer button:hover:not(.primary) { background: #2a2e39; }
.vp-props-live {
	font-size: 11px;
	color: #26a69a;
}
@media (max-width: 560px) {
	.vp-props-fields { grid-template-columns: 1fr; }
}
`.trim();

    /**
     * Modal properties editor for FixedRangeProfile line tools.
     * Double-click integration: use {@link attachProfilePropertiesEditor}.
     */
    class ProfilePropertiesEditor {
        constructor(lineTools, options = {}) {
            this._root = null;
            this._toolId = null;
            this._draft = {};
            this._baseline = {};
            this._previewTimer = null;
            this._metricsContainer = null;
            this._statsEl = null;
            this._liveLabel = null;
            this._onKeyDown = (e) => {
                if (!this.isOpen()) {
                    return;
                }
                if (e.key === 'Escape') {
                    e.preventDefault();
                    this._revertAndClose();
                }
            };
            this._lineTools = lineTools;
            this._options = {
                livePreviewDebounceMs: options.livePreviewDebounceMs ?? 150,
                ...options,
            };
        }
        isOpen() {
            return this._root != null && !this._root.hidden;
        }
        open(toolExport) {
            if (toolExport.toolType !== FIXED_RANGE_PROFILE_TOOL_TYPE) {
                return;
            }
            this._ensureDom();
            this._toolId = toolExport.id;
            this._toolPoints = toolExport.points;
            this._baseline = cloneEditorState((toolExport.options ?? {}));
            this._draft = cloneEditorState(this._baseline);
            this._renderAll();
            this._root.hidden = false;
            document.body.style.overflow = 'hidden';
        }
        close() {
            if (this._previewTimer != null) {
                clearTimeout(this._previewTimer);
                this._previewTimer = null;
            }
            if (this._root != null) {
                this._root.hidden = true;
            }
            document.body.style.overflow = '';
            this._toolId = null;
            this._toolPoints = undefined;
            this._options.onClose?.();
        }
        destroy() {
            document.removeEventListener('keydown', this._onKeyDown);
            this.close();
            this._root?.remove();
            this._root = null;
        }
        _ensureDom() {
            if (this._root != null) {
                return;
            }
            if (!document.getElementById('vp-props-styles')) {
                const style = document.createElement('style');
                style.id = 'vp-props-styles';
                style.textContent = PROFILE_PROPERTIES_EDITOR_STYLES;
                document.head.appendChild(style);
            }
            const root = document.createElement('div');
            root.className = 'vp-props-root';
            root.hidden = true;
            root.innerHTML = `
			<div class="vp-props-backdrop" data-action="cancel"></div>
			<div class="vp-props-dialog" role="dialog" aria-modal="true" aria-labelledby="vp-props-title">
				<header class="vp-props-header">
					<div>
						<h2 id="vp-props-title">Profile properties</h2>
						<p data-ref="subtitle"></p>
					</div>
					<button type="button" class="vp-props-close" data-action="cancel" aria-label="Close">×</button>
				</header>
				<div class="vp-props-body" data-ref="body"></div>
				<footer class="vp-props-footer">
					<div class="vp-props-footer-left">
						<span class="vp-props-live" data-ref="live">Live preview on</span>
					</div>
					<div class="vp-props-footer-right">
						<button type="button" data-action="reset">Reset to defaults</button>
						<button type="button" data-action="cancel">Cancel</button>
						<button type="button" class="primary" data-action="apply">Apply</button>
					</div>
				</footer>
			</div>
		`;
            root.addEventListener('click', (e) => {
                const target = e.target;
                const action = target.closest('[data-action]')?.getAttribute('data-action');
                if (action === 'cancel') {
                    this._revertAndClose();
                }
                else if (action === 'apply') {
                    this._apply(true);
                }
                else if (action === 'reset') {
                    this._resetToDefaults();
                }
            });
            document.addEventListener('keydown', this._onKeyDown);
            document.body.appendChild(root);
            this._root = root;
            this._liveLabel = root.querySelector('[data-ref="live"]');
        }
        _template() {
            const frp = this._draft.fixedRangeProfile;
            return frp?.template ?? DEFAULT_VOLUME_PROFILE_TEMPLATE;
        }
        _snapshot() {
            const frp = this._draft.fixedRangeProfile;
            return frp?.snapshot;
        }
        _renderAll() {
            const body = this._root.querySelector('[data-ref="body"]');
            const subtitle = this._root.querySelector('[data-ref="subtitle"]');
            subtitle.textContent = `${this._template().label} · ${this._toolId ?? ''}`;
            body.innerHTML = '';
            this._renderPresets(body);
            this._renderMetricCards(body);
            for (const section of PROFILE_PROPERTY_SECTIONS) {
                body.appendChild(this._renderSection(section));
            }
            this._renderStats(body);
        }
        _renderPresets(container) {
            const details = document.createElement('details');
            details.className = 'vp-props-section';
            details.open = false;
            details.innerHTML = `
			<summary>Template presets</summary>
			<p class="vp-props-section-desc">Apply a built-in template (keeps current pipeline and tick size).</p>
		`;
            const row = document.createElement('div');
            row.className = 'vp-props-presets';
            for (const preset of [
                { label: 'Volume profile', template: DEFAULT_VOLUME_PROFILE_TEMPLATE },
                { label: 'Delta profile', template: DEFAULT_DELTA_PROFILE_TEMPLATE },
            ]) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.textContent = preset.label;
                btn.addEventListener('click', () => {
                    const frp = (this._draft.fixedRangeProfile ?? {});
                    frp.template = mergeProfileTemplate(preset.template, {
                        id: this._template().id,
                        label: preset.label,
                    });
                    this._draft.fixedRangeProfile = frp;
                    this._renderAll();
                    this._schedulePreview();
                });
                row.appendChild(btn);
            }
            details.appendChild(row);
            container.appendChild(details);
        }
        _renderMetricCards(container) {
            const details = document.createElement('details');
            details.className = 'vp-props-section';
            details.open = true;
            details.innerHTML = `
			<summary>Metric colors</summary>
			<p class="vp-props-section-desc">Per-metric appearance. In Total mode, the magnitude metric color fills bars; in Split/Delta, buy/sell colors apply.</p>
		`;
            this._metricsContainer = document.createElement('div');
            this._metricsContainer.className = 'vp-props-metrics';
            details.appendChild(this._metricsContainer);
            container.appendChild(details);
            this._renderMetricCardsContent();
        }
        _renderMetricCardsContent() {
            if (this._metricsContainer == null) {
                return;
            }
            this._metricsContainer.innerHTML = '';
            const metrics = [...this._template().metrics];
            metrics.forEach((metric, index) => {
                const card = document.createElement('div');
                card.className = 'vp-props-metric-card';
                card.innerHTML = `<h4>${metric.label} <span class="vp-props-metric-id">${metric.id}</span></h4>`;
                card.appendChild(this._metricField('Label', metric.label, (v) => this._updateMetric(index, { label: v })));
                card.appendChild(this._metricSelectField('Role', metric.role, METRIC_ROLE_OPTIONS, (v) => this._updateMetric(index, { role: v })));
                card.appendChild(this._metricColorField('Color', metric.color, (v) => this._updateMetric(index, { color: v })));
                card.appendChild(this._metricRangeField('Opacity', metric.opacity ?? 1, 0, 1, 0.05, (v) => this._updateMetric(index, { opacity: v })));
                this._metricsContainer.appendChild(card);
            });
        }
        _updateMetric(index, partial) {
            const frp = (this._draft.fixedRangeProfile ?? {});
            const metrics = frp.template.metrics.map((m, i) => (i === index ? { ...m, ...partial } : m));
            frp.template = { ...frp.template, metrics };
            this._draft.fixedRangeProfile = frp;
            this._schedulePreview();
        }
        _metricField(label, value, onChange) {
            const wrap = document.createElement('div');
            wrap.className = 'vp-props-field';
            wrap.innerHTML = `<label>${label}</label>`;
            const input = document.createElement('input');
            input.type = 'text';
            input.value = value;
            input.addEventListener('input', () => onChange(input.value));
            wrap.appendChild(input);
            return wrap;
        }
        _metricSelectField(label, value, options, onChange) {
            const wrap = document.createElement('div');
            wrap.className = 'vp-props-field';
            wrap.innerHTML = `<label>${label}</label>`;
            const select = document.createElement('select');
            for (const opt of options) {
                const o = document.createElement('option');
                o.value = opt.value;
                o.textContent = opt.label;
                o.selected = opt.value === value;
                select.appendChild(o);
            }
            select.addEventListener('change', () => onChange(select.value));
            wrap.appendChild(select);
            return wrap;
        }
        _metricColorField(label, value, onChange) {
            const wrap = document.createElement('div');
            wrap.className = 'vp-props-field';
            wrap.innerHTML = `<label>${label}</label>`;
            const row = document.createElement('div');
            row.className = 'vp-props-color-row';
            const color = document.createElement('input');
            color.type = 'color';
            color.value = normalizeHexColor(value);
            const text = document.createElement('input');
            text.type = 'text';
            text.value = value;
            const sync = (hex) => {
                const normalized = normalizeHexColor(hex);
                color.value = normalized;
                text.value = hex.startsWith('#') ? hex : normalized;
                onChange(text.value.startsWith('#') ? text.value : normalized);
            };
            color.addEventListener('input', () => sync(color.value));
            text.addEventListener('change', () => sync(text.value));
            row.appendChild(color);
            row.appendChild(text);
            wrap.appendChild(row);
            return wrap;
        }
        _metricRangeField(label, value, min, max, step, onChange) {
            const wrap = document.createElement('div');
            wrap.className = 'vp-props-field';
            const labelEl = document.createElement('label');
            labelEl.textContent = label;
            const valueEl = document.createElement('span');
            valueEl.className = 'vp-props-range-value';
            valueEl.textContent = String(value);
            labelEl.appendChild(document.createTextNode(' '));
            labelEl.appendChild(valueEl);
            const input = document.createElement('input');
            input.type = 'range';
            input.min = String(min);
            input.max = String(max);
            input.step = String(step);
            input.value = String(value);
            input.addEventListener('input', () => {
                const n = Number(input.value);
                valueEl.textContent = String(n);
                onChange(n);
            });
            wrap.appendChild(labelEl);
            wrap.appendChild(input);
            return wrap;
        }
        _renderSection(section) {
            const details = document.createElement('details');
            details.className = 'vp-props-section';
            details.open = section.id === 'general' || section.id === 'display' || section.id === 'levels';
            details.innerHTML = `<summary>${section.title}</summary>`;
            if (section.description) {
                const desc = document.createElement('p');
                desc.className = 'vp-props-section-desc';
                desc.textContent = section.description;
                details.appendChild(desc);
            }
            const grid = document.createElement('div');
            grid.className = 'vp-props-fields';
            for (const field of section.fields) {
                if (field.visibleWhen && !field.visibleWhen(this._template())) {
                    continue;
                }
                const el = this._renderField(field);
                if (field.type === 'text' && field.path.includes('message')) {
                    el.classList.add('full');
                }
                grid.appendChild(el);
            }
            details.appendChild(grid);
            return details;
        }
        _renderField(field) {
            const wrap = document.createElement('div');
            wrap.className = 'vp-props-field';
            const label = document.createElement('label');
            label.textContent = field.label;
            label.htmlFor = `vp-field-${field.id}`;
            wrap.appendChild(label);
            const raw = getPropertyPath(this._draft, field.path);
            if (field.type === 'checkbox') {
                const input = document.createElement('input');
                input.type = 'checkbox';
                input.id = `vp-field-${field.id}`;
                input.checked = Boolean(raw);
                input.addEventListener('change', () => this._setField(field, input.checked));
                wrap.appendChild(input);
            }
            else if (field.type === 'select') {
                const select = document.createElement('select');
                select.id = `vp-field-${field.id}`;
                const options = field.id === 'pipelineId'
                    ? (this._options.getPipelines?.() ?? []).map((p) => ({ value: p.id, label: p.label }))
                    : (field.options ?? []);
                for (const opt of options) {
                    const o = document.createElement('option');
                    o.value = opt.value;
                    o.textContent = opt.label;
                    o.selected = String(raw ?? '') === opt.value;
                    select.appendChild(o);
                }
                select.addEventListener('change', () => this._setField(field, select.value));
                wrap.appendChild(select);
            }
            else if (field.type === 'metricSelect') {
                const select = document.createElement('select');
                select.id = `vp-field-${field.id}`;
                const blank = document.createElement('option');
                blank.value = '';
                blank.textContent = '(none)';
                select.appendChild(blank);
                for (const m of this._template().metrics) {
                    const o = document.createElement('option');
                    o.value = m.id;
                    o.textContent = `${m.label} (${m.id})`;
                    o.selected = String(raw ?? '') === m.id;
                    select.appendChild(o);
                }
                select.addEventListener('change', () => {
                    const v = select.value || undefined;
                    this._setField(field, v);
                });
                wrap.appendChild(select);
            }
            else if (field.type === 'color') {
                wrap.appendChild(this._colorInput(field, String(raw ?? '#ffffff')));
            }
            else if (field.type === 'percent') {
                const pct = Math.round(Number(raw ?? 0.7) * 100);
                wrap.appendChild(this._rangeInput(field, pct, field.min ?? 1, field.max ?? 100, field.step ?? 1, (v) => v / 100));
            }
            else if (field.type === 'range') {
                wrap.appendChild(this._rangeInput(field, Number(raw ?? 0), field.min ?? 0, field.max ?? 1, field.step ?? 0.01, (v) => v));
            }
            else if (field.type === 'number') {
                const input = document.createElement('input');
                input.type = 'number';
                input.id = `vp-field-${field.id}`;
                if (field.min != null)
                    input.min = String(field.min);
                if (field.max != null)
                    input.max = String(field.max);
                if (field.step != null)
                    input.step = String(field.step);
                input.value = raw == null || raw === '' ? '' : String(raw);
                input.addEventListener('change', () => {
                    const v = input.value === '' ? undefined : Number(input.value);
                    this._setField(field, v);
                });
                wrap.appendChild(input);
            }
            else {
                const input = document.createElement('input');
                input.type = 'text';
                input.id = `vp-field-${field.id}`;
                input.value = String(raw ?? '');
                input.addEventListener('input', () => this._setField(field, input.value));
                wrap.appendChild(input);
            }
            if (field.hint) {
                const hint = document.createElement('span');
                hint.className = 'vp-props-hint';
                hint.textContent = field.hint;
                wrap.appendChild(hint);
            }
            return wrap;
        }
        _colorInput(field, value) {
            const row = document.createElement('div');
            row.className = 'vp-props-color-row';
            const color = document.createElement('input');
            color.type = 'color';
            color.id = `vp-field-${field.id}`;
            color.value = normalizeHexColor(value);
            const text = document.createElement('input');
            text.type = 'text';
            text.value = value;
            const apply = (hex) => {
                const normalized = normalizeHexColor(hex);
                color.value = normalized;
                text.value = hex.startsWith('#') ? hex : normalized;
                this._setField(field, text.value.startsWith('#') ? text.value : normalized);
            };
            color.addEventListener('input', () => apply(color.value));
            text.addEventListener('change', () => apply(text.value));
            row.appendChild(color);
            row.appendChild(text);
            return row;
        }
        _rangeInput(field, value, min, max, step, toStored) {
            const wrap = document.createElement('div');
            const valueEl = document.createElement('span');
            valueEl.className = 'vp-props-range-value';
            valueEl.textContent = String(value);
            const input = document.createElement('input');
            input.type = 'range';
            input.id = `vp-field-${field.id}`;
            input.min = String(min);
            input.max = String(max);
            input.step = String(step);
            input.value = String(value);
            input.addEventListener('input', () => {
                const n = Number(input.value);
                valueEl.textContent = String(n);
                this._setField(field, toStored(n));
            });
            wrap.appendChild(valueEl);
            wrap.appendChild(input);
            return wrap;
        }
        _setField(field, value) {
            if (field.path.endsWith('valueAreaFraction') && typeof value === 'number') {
                value = clampValueAreaFraction(value);
            }
            if (field.path.endsWith('rowLayout.mode')) {
                setPropertyPath(this._draft, field.path, value);
                this._renderAll();
                this._schedulePreview();
                return;
            }
            setPropertyPath(this._draft, field.path, value);
            this._updateStats();
            this._schedulePreview();
        }
        _renderStats(container) {
            const details = document.createElement('details');
            details.className = 'vp-props-section';
            details.open = false;
            details.innerHTML = `<summary>Computed snapshot</summary>`;
            this._statsEl = document.createElement('div');
            this._statsEl.className = 'vp-props-stats';
            details.appendChild(this._statsEl);
            container.appendChild(details);
            this._updateStats();
        }
        _updateStats() {
            if (this._statsEl == null) {
                return;
            }
            const snap = this._snapshot();
            this._statsEl.replaceChildren();
            if (!snap) {
                this._statsEl.textContent = 'No snapshot yet — adjust range or options to recompute.';
                return;
            }
            const lines = [
                `Bars: ${snap.barCount} · Rows: ${snap.rowCount} · Max magnitude: ${snap.maxMagnitude.toFixed(2)}`,
                `POC: ${snap.pocPrice ?? '—'} · VAH: ${snap.valueAreaHigh ?? '—'} · VAL: ${snap.valueAreaLow ?? '—'}`,
            ];
            if (snap.warning) {
                lines.push(`⚠ ${snap.warning}`);
            }
            for (const line of lines) {
                const div = document.createElement('div');
                div.textContent = line;
                this._statsEl.appendChild(div);
            }
        }
        _resetToDefaults() {
            const pipelineId = getPropertyPath(this._draft, 'fixedRangeProfile.pipelineId');
            const tickSize = getPropertyPath(this._draft, 'fixedRangeProfile.tickSize');
            const merged = mergeProfileTemplate(DEFAULT_VOLUME_PROFILE_TEMPLATE, {});
            setPropertyPath(this._draft, 'fixedRangeProfile.template', merged);
            if (pipelineId != null) {
                setPropertyPath(this._draft, 'fixedRangeProfile.pipelineId', pipelineId);
            }
            if (tickSize != null) {
                setPropertyPath(this._draft, 'fixedRangeProfile.tickSize', tickSize);
            }
            this._renderAll();
            this._schedulePreview();
        }
        _schedulePreview() {
            if (this._previewTimer != null) {
                clearTimeout(this._previewTimer);
            }
            this._previewTimer = setTimeout(() => {
                this._previewTimer = null;
                this._apply(false);
            }, this._options.livePreviewDebounceMs);
        }
        _buildOptions() {
            return mergeFixedRangeProfileOptions(this._baseline, this._draft);
        }
        _refreshDraftFromTool() {
            if (this._toolId == null || !this._lineTools.getLineToolByID) {
                return;
            }
            try {
                const json = this._lineTools.getLineToolByID(this._toolId);
                const tools = JSON.parse(json);
                const tool = tools[0];
                if (tool?.options) {
                    const opts = tool.options;
                    this._baseline = cloneEditorState(opts);
                    this._draft = cloneEditorState(opts);
                    this._updateStats();
                }
            }
            catch {
                // ignore parse errors
            }
        }
        _apply(closeAfter) {
            if (this._toolId == null) {
                return;
            }
            const options = this._buildOptions();
            const ok = this._lineTools.applyLineToolOptions({
                id: this._toolId,
                toolType: FIXED_RANGE_PROFILE_TOOL_TYPE,
                options,
                ...(this._toolPoints != null ? { points: this._toolPoints } : {}),
            });
            if (ok) {
                this._refreshDraftFromTool();
                this._options.onApply?.(this._toolId, this._buildOptions());
                if (this._liveLabel) {
                    this._liveLabel.textContent = closeAfter ? 'Applied' : 'Live preview on';
                }
            }
            if (closeAfter) {
                this.close();
            }
        }
        _revertAndClose() {
            if (this._toolId != null) {
                this._lineTools.applyLineToolOptions({
                    id: this._toolId,
                    toolType: FIXED_RANGE_PROFILE_TOOL_TYPE,
                    options: this._baseline,
                    ...(this._toolPoints != null ? { points: this._toolPoints } : {}),
                });
            }
            this.close();
        }
    }
    function normalizeHexColor(input) {
        const v = input.trim();
        if (/^#[0-9a-fA-F]{6}$/.test(v)) {
            return v;
        }
        if (/^[0-9a-fA-F]{6}$/.test(v)) {
            return `#${v}`;
        }
        return '#787b86';
    }

    /**
     * Wires {@link ProfilePropertiesEditor} to line-tools double-click events.
     */
    function attachProfilePropertiesEditor(lineTools, options = {}) {
        const bridge = {
            applyLineToolOptions: (toolData) => lineTools.applyLineToolOptions(toolData),
            getLineToolByID: lineTools.getLineToolByID?.bind(lineTools),
        };
        const editor = new ProfilePropertiesEditor(bridge, {
            getPipelines: options.getPipelines ?? listProfilePipelines,
            livePreviewDebounceMs: options.livePreviewDebounceMs,
            onApply: options.onApply,
            onClose: options.onClose,
        });
        const fixedOnly = options.fixedRangeProfileOnly !== false;
        const handler = (params) => {
            const tool = params.selectedLineTool;
            if (fixedOnly && String(tool.toolType) !== FIXED_RANGE_PROFILE_TOOL_TYPE) {
                return;
            }
            editor.open({
                id: tool.id,
                toolType: FIXED_RANGE_PROFILE_TOOL_TYPE,
                points: tool.points,
                options: tool.options,
            });
        };
        lineTools.subscribeLineToolsDoubleClick(handler);
        return {
            editor,
            destroy() {
                lineTools.unsubscribeLineToolsDoubleClick(handler);
                editor.destroy();
            },
        };
    }

    /**
     * Fixed-range price-level profile line tool for lightweight-charts-line-tools-core.
     *
     * Config/template driven with pluggable bar extractors and aggregators.
     */
    /** Tool type string for registerLineTool / addLineTool. */
    const LINE_TOOL_FIXED_RANGE_PROFILE = 'FixedRangeProfile';

    exports.DEFAULT_DELTA_PROFILE_TEMPLATE = DEFAULT_DELTA_PROFILE_TEMPLATE;
    exports.DEFAULT_VOLUME_PROFILE_TEMPLATE = DEFAULT_VOLUME_PROFILE_TEMPLATE;
    exports.FIXED_RANGE_PROFILE_TOOL_TYPE = FIXED_RANGE_PROFILE_TOOL_TYPE;
    exports.LINE_TOOL_FIXED_RANGE_PROFILE = LINE_TOOL_FIXED_RANGE_PROFILE;
    exports.LineToolFixedRangeProfile = LineToolFixedRangeProfile;
    exports.METRIC_ROLE_OPTIONS = METRIC_ROLE_OPTIONS;
    exports.PROFILE_PROPERTY_SECTIONS = PROFILE_PROPERTY_SECTIONS;
    exports.ProfilePropertiesEditor = ProfilePropertiesEditor;
    exports.attachProfilePropertiesEditor = attachProfilePropertiesEditor;
    exports.barTimeToKey = barTimeToKey;
    exports.bucketPrice = bucketPrice;
    exports.clampValueAreaFraction = clampValueAreaFraction;
    exports.clearProfilePipelines = clearProfilePipelines;
    exports.cloneEditorState = cloneEditorState;
    exports.computeRowStep = computeRowStep;
    exports.computeValueArea = computeValueArea;
    exports.createAverageBinnedAggregator = createAverageBinnedAggregator;
    exports.createDefaultFixedRangeProfileOptions = createDefaultFixedRangeProfileOptions;
    exports.createMapFieldExtractor = createMapFieldExtractor;
    exports.createMaxBinnedAggregator = createMaxBinnedAggregator;
    exports.createOhlcVolumeExtractor = createOhlcVolumeExtractor;
    exports.createSumBinnedAggregator = createSumBinnedAggregator;
    exports.createTradesByPriceExtractor = createTradesByPriceExtractor;
    exports.defaultBinningAggregator = defaultBinningAggregator;
    exports.ensureBuiltinProfilePipelines = ensureBuiltinProfilePipelines;
    exports.getProfileBarSource = getProfileBarSource;
    exports.getProfilePipeline = getProfilePipeline;
    exports.getPropertyPath = getPropertyPath;
    exports.inferTickSizeFromBars = inferTickSizeFromBars;
    exports.isOhlcBar = isOhlcBar;
    exports.listProfilePipelines = listProfilePipelines;
    exports.mergeFixedRangeProfileOptions = mergeFixedRangeProfileOptions;
    exports.mergeProfileTemplate = mergeProfileTemplate;
    exports.normalizeTimeRange = normalizeTimeRange;
    exports.registerBuiltinProfilePipelines = registerBuiltinProfilePipelines;
    exports.registerProfileBarSource = registerProfileBarSource;
    exports.registerProfilePipeline = registerProfilePipeline;
    exports.resetBuiltinProfilePipelinesForTests = resetBuiltinProfilePipelinesForTests;
    exports.resolveProfile = resolveProfile;
    exports.resolveTickSize = resolveTickSize;
    exports.sanitizeMetricValue = sanitizeMetricValue;
    exports.setPropertyPath = setPropertyPath;
    exports.unregisterProfilePipeline = unregisterProfilePipeline;

}));
//# sourceMappingURL=lightweight-charts-line-tools-volume-profile.umd.js.map
