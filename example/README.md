# Example app

Interactive demo for the Fixed Range Profile plugin.

## Run locally

From the package root:

```bash
npm install
npm run build
npx serve .
```

Open [http://localhost:3000/example/](http://localhost:3000/example/) (port may vary).

## What to try

1. **Draw profile** — click start and end of a time range on the candlestick chart.
2. Switch **pipeline** between OHLC volume and trades-by-price (synthetic demo data).
3. Change **display mode** (total / split / delta) on the selected tool.
4. Adjust **row count**, bar width, POC/VA, and extend-right.
5. **Draw open-interest profile** — programmatic example using `createMapFieldExtractor`.
6. **Export JSON** — inspect serialized template + snapshot for persistence testing.

## Demo data shape

Each bar includes:

- Standard OHLCV fields
- `tradesByPrice` for the trades-by-price pipeline
- `features.openInterest` map for the custom metric button
