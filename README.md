# lightweight-charts-line-tools-volume-profile

Fixed-range **price-level profile** plugin for [`lightweight-charts-line-tools-core`](https://github.com/difurious/lightweight-charts-line-tools-core). TradingView-style two-point range selection with a horizontal histogram — **template/config driven**, with **pluggable extractors and aggregators** for volume, delta, open interest, or any custom bar field.

**Tool type:** `FixedRangeProfile`  
**Package entry:** `dist/lightweight-charts-line-tools-volume-profile.umd.js` (global: `LightweightChartsLineToolsVolumeProfile`) or ESM `dist/lightweight-charts-line-tools-volume-profile.js`

---

## Table of contents

1. [Features](#features)
2. [Install & build](#install--build)
3. [Quick start](#quick-start)
4. [Developer workflow](#developer-workflow)
5. [Architecture](#architecture)
6. [Bar data sourcing](#bar-data-sourcing)
7. [Templates & display modes](#templates--display-modes)
8. [Pipelines](#pipelines)
9. [Tool options & persistence](#tool-options--persistence)
10. [Properties editor](#properties-editor-double-click)
11. [Public API](#public-api)
12. [Corner cases](#corner-cases)
13. [Application integration](#application-integration)
14. [Troubleshooting](#troubleshooting)

---

## Features

| Area | Capability |
| --- | --- |
| **Interaction** | Two-point range (click-click or click-drag); resize via left/right anchors |
| **Rendering** | Horizontal histogram, POC/VA lines, optional selection box, `extendRight` |
| **Data** | Pluggable extractor → aggregator pipeline; built-in OHLC volume & trades-by-price |
| **Display** | `total`, `split` (up/down), `delta` |
| **Config** | Serializable `ProfileTemplate`; runtime updates via `applyLineToolOptions` |
| **UI** | Optional double-click properties modal with live preview |
| **Persistence** | Compatible with core `exportLineTools()` / `importLineTools()` |

---

## Install & build

**Peer dependencies:** `lightweight-charts` ^5.2.0, `lightweight-charts-line-tools-core` ^1.1.0

```bash
npm install lightweight-charts lightweight-charts-line-tools-core lightweight-charts-line-tools-volume-profile
```

**Develop from source** (clone this repository):

```bash
git clone https://github.com/Mo33n/lightweight-charts-line-tools-volume-profile.git
cd lightweight-charts-line-tools-volume-profile
npm install
npm run build
npm test
```

---

## Quick start

```typescript
import { createChart, CandlestickSeries } from 'lightweight-charts';
import { createLineToolsPlugin } from 'lightweight-charts-line-tools-core';
import {
  LineToolFixedRangeProfile,
  LINE_TOOL_FIXED_RANGE_PROFILE,
  ensureBuiltinProfilePipelines,
  DEFAULT_VOLUME_PROFILE_TEMPLATE,
  attachProfilePropertiesEditor,
  listProfilePipelines,
} from 'lightweight-charts-line-tools-volume-profile';

// 1. Chart + series
const chart = createChart(document.getElementById('chart')!);
const series = chart.addSeries(CandlestickSeries, {});

// Keep full bar objects if series.data() strips custom fields (volume, tradesByPrice, features)
const fullBars: Bar[] = [/* ... */];
series.setData(fullBars.map(({ time, open, high, low, close }) => ({ time, open, high, low, close })));

// 2. Pipelines + optional bar source override (see Bar data sourcing)
ensureBuiltinProfilePipelines();
registerProfileBarSource((range) =>
  fullBars.filter((b) => b.time >= range.from && b.time <= range.to),
);

// 3. Register tool
const lineTools = createLineToolsPlugin(chart, series);
lineTools.registerLineTool(LINE_TOOL_FIXED_RANGE_PROFILE as never, LineToolFixedRangeProfile);

// 4. Optional: double-click properties UI
const propsHandle = attachProfilePropertiesEditor(lineTools, {
  getPipelines: () => listProfilePipelines(),
  onApply: (toolId) => persistDrawing(toolId),
});

// 5. Draw (interactive — user picks range on chart)
lineTools.addLineTool(LINE_TOOL_FIXED_RANGE_PROFILE as never, [], {
  fixedRangeProfile: {
    template: DEFAULT_VOLUME_PROFILE_TEMPLATE,
    pipelineId: 'ohlc-volume',
  },
});

// Or programmatic two-point placement:
lineTools.addLineTool(LINE_TOOL_FIXED_RANGE_PROFILE as never, [
  { timestamp: 1704067200, price: 100 },
  { timestamp: 1704153600, price: 110 },
], {
  fixedRangeProfile: { template: DEFAULT_VOLUME_PROFILE_TEMPLATE, pipelineId: 'trades-by-price' },
});
```

**Example app:** `example/index.html` — open after `npm run build` via any static server (`npx serve .` → `/example/`).

---

## Developer workflow

| Task | Command |
| --- | --- |
| Build UMD + ESM + types | `npm run build` |
| Run unit tests | `npm test` |
| Watch tests | `npm run test:watch` |
| Manual QA | Open `example/index.html`; double-click profile for full properties editor |

**Typical change loop:** edit `src/` → `npm run build` → refresh example or consuming app.

---

## Architecture

```
App startup
  ensureBuiltinProfilePipelines()
  registerProfilePipeline(...)        // optional custom pipelines
  registerProfileBarSource(...)       // optional when LWC series drops fields
  lineTools.registerLineTool(FixedRangeProfile, LineToolFixedRangeProfile)

User draws range (2 points)
        │
        ▼
LineToolFixedRangeProfile.recomputeSnapshotIfNeeded()
        │
        ├── getProfileBarSource() ?? coreApi.getDataInRange()
        ├── pipeline.extractor(bar) → PriceLevelSample[]
        ├── pipeline.aggregator(samples) → ProfileRow[]
        └── computeValueArea(rows, template) → POC / VAH / VAL
        │
        ▼
FixedRangeProfilePaneView → ProfileHistogramRenderer + RangeBoxRenderer
```

| Layer | Module | Responsibility |
| --- | --- | --- |
| **Model** | `LineToolFixedRangeProfile` | Anchors, time range, snapshot cache, hit-test delegation |
| **Pipeline** | `resolve-profile`, `binning`, `value-area` | Extract → aggregate → POC/VA |
| **Registry** | `pipeline/registry`, `bootstrap` | Global pipeline definitions |
| **Rendering** | `profile-histogram-renderer`, `range-box-renderer` | Canvas draw |
| **UI** | `ProfilePropertiesEditor`, `attachProfilePropertiesEditor` | Optional settings modal |
| **Template** | `ProfileTemplate` | Serializable config (persisted in tool options) |

Core owns selection, drag, export/import. **This package owns profile math and draw only.**

---

## Bar data sourcing

Lightweight Charts candlestick `series.data()` often returns **OHLC only** — `volume`, `tradesByPrice`, and `features` are dropped. The profile tool resolves bars in this order:

1. **`registerProfileBarSource(fn)`** — app supplies full bar objects for the time range (recommended for footprint / custom fields).
2. **`coreApi.getDataInRange()`** — fallback; uses whatever the series stores.

```typescript
import { registerProfileBarSource } from 'lightweight-charts-line-tools-volume-profile';

registerProfileBarSource((range) =>
  myBarStore.filter((b) => b.time >= range.from && b.time <= range.to),
);

// Clear override:
registerProfileBarSource(null);
```

If the profile shows **“No profile data”** or **“no price-level samples”**, the extractor is not receiving the fields it expects — fix the bar source or bar shape first.

---

## Templates & display modes

Templates are plain JSON-serializable `ProfileTemplate` objects. Use `mergeProfileTemplate(base, partial)` for partial updates.

### Key fields

| Field | Purpose |
| --- | --- |
| `metrics[]` | `{ id, label, role, color, opacity? }` — roles: `magnitude`, `positive`, `negative`, `neutral` |
| `metricBinding` | `magnitudeMetricId`, optional `positiveMetricId` / `negativeMetricId` |
| `displayMode` | `total` \| `split` \| `delta` |
| `rowLayout` | `{ mode: 'rowCount' \| 'tickSize', value, maxRows? }` — default maxRows 500 |
| `histogram` | Anchor, `maxWidthFraction`, `lengthGamma`, row height, gap, legacy fill/border |
| `levels` | POC/VA toggles, `valueAreaFraction` (0.01–1, default **0.7**), line colors/style |
| `range` | Selection box chrome, `extendRight` |
| `emptyState` | Placeholder when no rows |

### What controls bar **colors** (important)

| Display mode | Bar fill driven by |
| --- | --- |
| **`total`** | **Magnitude metric** `color` + `opacity` (e.g. `volume`) |
| **`split`** | Positive / negative metric colors (buy / sell) |
| **`delta`** | Buy or sell color by sign; metric opacity per leg |

`histogram.backgroundColor` is a **fallback** when the magnitude metric has no color. Prefer setting colors on `metrics[]` — the properties editor **Metric colors** section maps here.

### Value area %

```typescript
mergeProfileTemplate(DEFAULT_VOLUME_PROFILE_TEMPLATE, {
  levels: {
    ...DEFAULT_VOLUME_PROFILE_TEMPLATE.levels,
    valueAreaFraction: 0.4, // 40% — use clampValueAreaFraction() for user input
  },
});
```

Changing `valueAreaFraction`, metric binding, pipeline, tick size, or row layout invalidates the snapshot cache and recomputes POC/VA.

### Presets

- `DEFAULT_VOLUME_PROFILE_TEMPLATE` — total volume profile  
- `DEFAULT_DELTA_PROFILE_TEMPLATE` — delta display mode preset  

---

## Pipelines

Register once at app startup (global registry):

```typescript
import {
  registerProfilePipeline,
  createTradesByPriceExtractor,
  createMapFieldExtractor,
  createSumBinnedAggregator,
  createMaxBinnedAggregator,
  mergeProfileTemplate,
  DEFAULT_VOLUME_PROFILE_TEMPLATE,
} from 'lightweight-charts-line-tools-volume-profile';

registerProfilePipeline({
  id: 'footprint',
  label: 'Footprint trades',
  extractor: createTradesByPriceExtractor({ field: 'features.footprint' }),
  aggregator: createSumBinnedAggregator(),
});
```

### Built-in (`ensureBuiltinProfilePipelines()`)

| ID | Extractor | Use when |
| --- | --- | --- |
| `ohlc-volume` | Bar volume → close price; buy/sell from open vs close | No tick-level data |
| `trades-by-price` | `{ tradesByPrice: { [price]: signed[] } }` | Order-flow / footprint bars |

### Custom metric (open interest example)

```typescript
registerProfilePipeline({
  id: 'open-interest',
  label: 'Open interest by price',
  extractor: createMapFieldExtractor({
    field: 'features.openInterest',
    metricId: 'oi',
  }),
  aggregator: createSumBinnedAggregator(),
});

const oiTemplate = mergeProfileTemplate(DEFAULT_VOLUME_PROFILE_TEMPLATE, {
  id: 'oi-v1',
  label: 'Open Interest',
  metrics: [{ id: 'oi', label: 'OI', role: 'magnitude', color: '#ab47bc' }],
  metricBinding: { magnitudeMetricId: 'oi' },
});
```

### Extractors

| Factory | Input shape |
| --- | --- |
| `createOhlcVolumeExtractor()` | `{ open, high, low, close, volume? }` |
| `createTradesByPriceExtractor({ field?, signedTrades? })` | Map of price → signed trade sizes |
| `createMapFieldExtractor({ field, metricId })` | Nested map `{ [priceKey]: number }` |

### Aggregators

| Factory | Behaviour |
| --- | --- |
| `createSumBinnedAggregator()` | Sum into price buckets (default) |
| `createAverageBinnedAggregator()` | Sum then divide by bar count |
| `createMaxBinnedAggregator()` | Max per bucket (peak metrics) |

When bucket count exceeds `rowLayout.maxRows`, aggregators **coarsen the price step** and re-bin (volume is preserved, not truncated).

### Custom pipeline contract

```typescript
type BarSampleExtractor = (bar: unknown, ctx: ProfilePipelineContext) => PriceLevelSample[];
type ProfileAggregator = (samples: PriceLevelSample[], ctx: ProfilePipelineContext) => ProfileRow[];
```

---

## Tool options & persistence

```typescript
interface fixedRangeProfile {
  template: ProfileTemplate;
  pipelineId: string;           // must match registerProfilePipeline id
  tickSize?: number;            // bin step override; inferred from bars if omitted
  snapshot?: ProfileComputedSnapshot; // cached POC/rows; rebuilt on range/data change
}
```

**Runtime update** (omit `points` unless changing anchors — empty `points: []` clears the range):

```typescript
lineTools.applyLineToolOptions({
  id: toolId,
  toolType: 'FixedRangeProfile',
  options: {
    fixedRangeProfile: {
      template: mergeProfileTemplate(currentTemplate, { displayMode: 'split' }),
      pipelineId: 'trades-by-price',
    },
  },
});
```

**Serialize:** `lineTools.exportLineTools()` — template + snapshot + points included.  
**Restore:** `lineTools.importLineTools(json)` — re-register pipelines before import.

Helpers: `createDefaultFixedRangeProfileOptions()`, `mergeFixedRangeProfileOptions()`.

---

## Properties editor (double-click)

Schema-driven modal covering the full template + common line-tool options. Uses core `subscribeLineToolsDoubleClick`.

```typescript
import {
  attachProfilePropertiesEditor,
  ProfilePropertiesEditor,
  PROFILE_PROPERTY_SECTIONS,
  listProfilePipelines,
} from 'lightweight-charts-line-tools-volume-profile';

const handle = attachProfilePropertiesEditor(lineTools, {
  getPipelines: () => listProfilePipelines(),
  livePreviewDebounceMs: 150,   // default
  onApply: (toolId, options) => { /* persist */ },
  onClose: () => { /* optional */ },
});

// Cleanup on chart unmount:
handle.destroy();
```

| Behaviour | Detail |
| --- | --- |
| Open | Double-click any `FixedRangeProfile` |
| Live preview | Debounced `applyLineToolOptions` while editing |
| Cancel / Esc | Reverts to state when modal opened |
| Apply | Commits and closes |
| Reset | Default volume template; keeps pipeline + tickSize |

**Custom UI:** use `PROFILE_PROPERTY_SECTIONS` with `getPropertyPath` / `setPropertyPath`, or instantiate `ProfilePropertiesEditor` directly.

---

## Public API

### Registration & bootstrap

| Export | Purpose |
| --- | --- |
| `LINE_TOOL_FIXED_RANGE_PROFILE` | Tool type string (`'FixedRangeProfile'`) |
| `LineToolFixedRangeProfile` | Tool class for `registerLineTool` |
| `ensureBuiltinProfilePipelines()` | Register `ohlc-volume` + `trades-by-price` |
| `registerProfilePipeline` / `listProfilePipelines` / `getProfilePipeline` | Pipeline registry |
| `registerProfileBarSource` / `getProfileBarSource` | Bar lookup override |

### Templates

| Export | Purpose |
| --- | --- |
| `DEFAULT_VOLUME_PROFILE_TEMPLATE` | Default config |
| `DEFAULT_DELTA_PROFILE_TEMPLATE` | Delta preset |
| `mergeProfileTemplate` | Deep partial merge |

### Pipeline utilities

| Export | Purpose |
| --- | --- |
| `resolveProfile` | Run extractor + aggregator outside the tool (tests, previews) |
| `computeValueArea` / `clampValueAreaFraction` | POC/VA math |
| `createOhlcVolumeExtractor`, `createTradesByPriceExtractor`, `createMapFieldExtractor` | Extractors |
| `createSumBinnedAggregator`, `createAverageBinnedAggregator`, `createMaxBinnedAggregator` | Aggregators |
| `normalizeTimeRange`, `computeRowStep`, `bucketPrice`, `isOhlcBar`, … | Binning helpers |

### UI

| Export | Purpose |
| --- | --- |
| `attachProfilePropertiesEditor` | Wire double-click → modal |
| `ProfilePropertiesEditor` | Standalone modal class |
| `PROFILE_PROPERTY_SECTIONS` | Field schema for custom forms |

### Types

`ProfileTemplate`, `ProfileRow`, `ProfileComputedSnapshot`, `ProfilePipelineDefinition`, `LineToolFixedRangeProfileOptions`, `DeepPartialFixedRangeProfileOptions`, … — see `dist/types/index.d.ts`.

---

## Corner cases

| Case | Behaviour |
| --- | --- |
| Inverted time anchors | Normalized (`from ≤ to`) |
| Zero / missing volume | Sample skipped; warning if range empty |
| Unregistered `pipelineId` | Snapshot with on-canvas warning |
| Flat price range | Bounds padded ±0.1% (min 0.01) |
| `extendRight: true` | End time extends to latest loaded bar |
| Buckets > `maxRows` | Step coarsened and re-binned (not silent truncation) |
| Non-finite metrics | Sanitized to 0 |
| Invalid `magnitudeMetricId` | POC/VA suppressed |
| Delta normalization | Bar width scaled to max \|delta\|, not volume max |
| `rowHeightPx > 0` | Fixed pixel row height; 0 = auto from price buckets |
| LWC series without custom fields | Use `registerProfileBarSource` |

---

## Application integration

This package owns **profile drawing and computation**. Your application owns bar data, persistence, and toolbar UX.

```typescript
ensureBuiltinProfilePipelines();
lineTools.registerLineTool(LINE_TOOL_FIXED_RANGE_PROFILE as never, LineToolFixedRangeProfile);

// Supply full bar objects when the series omits custom fields
registerProfileBarSource((range) =>
  myBars.filter((b) => b.time >= range.from && b.time <= range.to),
);

// Optional properties UI + persistence hook
attachProfilePropertiesEditor(lineTools, {
  getPipelines: () => listProfilePipelines(),
  onApply: (toolId, options) => saveToBackend(toolId, options),
});

// Restore saved drawings after pipelines are registered
lineTools.importLineTools(savedJson);
```

Typical app responsibilities:

- **Bar shape** — OHLCV plus any fields your extractors read (`tradesByPrice`, nested `features`, etc.)
- **Pipeline registration** — call `ensureBuiltinProfilePipelines()` and any custom `registerProfilePipeline()` at startup
- **Persistence** — serialize via `exportLineTools()`; restore via `importLineTools()` after pipelines exist

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| “No profile data” on chart | Pane read stale snapshot, or no bars in range | Ensure `recomputeSnapshotIfNeeded()` runs before read (handled in pane view); check bar source |
| “No price-level samples” | Extractor fields missing on bars | `registerProfileBarSource` with full objects |
| Metric color change has no effect | Display mode `total` needs magnitude metric color | Set **Volume** (magnitude) color, not only histogram background |
| POC/VA stale after option change | Cache key mismatch (fixed in recent versions) | Upgrade; ensure `applyOptions` clears cache |
| Range anchors missing | Only histogram was hit-testable | Anchors at range edges (resize handles) — select tool first |
| `applyLineToolOptions` clears range | Passed `points: []` | Omit `points` when updating options only |
| Pipeline not in dropdown | Not registered before editor open | Call `registerProfilePipeline` at startup; pass `getPipelines: listProfilePipelines` |

---

## Publishing

See [PUBLISHING.md](./PUBLISHING.md) for the maintainer checklist.

```bash
npm run build && npm test
npm pack --dry-run
npm login
npm publish --access public
```

**Peer dependencies:** `lightweight-charts` ^5.2.0, `lightweight-charts-line-tools-core` ^1.1.0

---

## License

MPL-2.0 (aligned with line-tools-core ecosystem)
