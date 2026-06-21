# Publishing to npm

Checklist before the first publish (and each release).

## Prerequisites

1. **Publish dependency first** — consumers need `lightweight-charts-line-tools-core` on npm (peer `^1.1.0`) and `lightweight-charts` (^5.2.0).
2. **npm account** with permission to publish `lightweight-charts-line-tools-volume-profile` (unscoped name; first publisher claims it).
3. **Repository metadata** — set `repository`, `homepage`, and `bugs` in `package.json` if you have a public Git URL (optional but recommended).

## Pre-flight

```bash
cd lightweight-charts-line-tools-volume-profile

# Clean install like CI
rm -rf node_modules dist
npm install

# Build + test (also runs via prepack / prepublishOnly)
npm run build
npm test

# Inspect tarball contents (~30 files: dist + README + LICENSE)
npm pack --dry-run

# Optional: create tarball locally and inspect
npm pack
tar -tzf lightweight-charts-line-tools-volume-profile-*.tgz | head
```

Verify the tarball includes:

- `dist/lightweight-charts-line-tools-volume-profile.js` (ESM)
- `dist/lightweight-charts-line-tools-volume-profile.umd.js` (CJS / script tag)
- `dist/lightweight-charts-line-tools-volume-profile.min.js` (minified UMD)
- `dist/types/index.d.ts` and nested `.d.ts` files
- `README.md`, `LICENSE`

It should **not** include `src/`, `tests/`, or `example/` (those stay in git only).

## Publish

```bash
npm login
npm publish --access public
```

For a **dry run** without uploading:

```bash
npm publish --dry-run --access public
```

## Version bumps

Use [semver](https://semver.org/):

| Change | Bump |
| --- | --- |
| Bug fix, docs-only in package | `patch` |
| New pipeline / API, backward compatible | `minor` |
| Breaking template or tool contract | `major` |

```bash
npm version patch   # or minor / major
npm publish --access public
git push && git push --tags   # if using git
```

## After publish

Smoke-test install in a blank app:

```bash
mkdir /tmp/vp-smoke && cd /tmp/vp-smoke
npm init -y
npm install lightweight-charts lightweight-charts-line-tools-core lightweight-charts-line-tools-volume-profile
node -e "import('lightweight-charts-line-tools-volume-profile').then(m => console.log(Object.keys(m).slice(0,8)))"
```

## CDN (optional)

UMD build is suitable for unpkg/jsDelivr:

```html
<script src="https://unpkg.com/lightweight-charts-line-tools-volume-profile@0.1.0/dist/lightweight-charts-line-tools-volume-profile.min.js"></script>
```

Requires `lightweight-charts` and `lightweight-charts-line-tools-core` loaded first (peer globals).

## Troubleshooting

| Issue | Action |
| --- | --- |
| `403 Forbidden` on publish | Name taken — pick scoped `@yourorg/...` or contact owner |
| `You cannot publish over the previously published versions` | Bump version with `npm version` |
| Missing types in consumer | Ensure `exports.types` points to `dist/types/index.d.ts` |
| `prepublishOnly` fails | Fix tests before publish; do not use `--ignore-scripts` |
