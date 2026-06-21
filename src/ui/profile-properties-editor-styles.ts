export const PROFILE_PROPERTIES_EDITOR_STYLES = `
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
