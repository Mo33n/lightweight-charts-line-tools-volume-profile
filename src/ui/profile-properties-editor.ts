import type { LineToolFixedRangeProfileOptions } from '../types/options';
import type { ProfilePipelineDefinition } from '../types/pipeline';
import {
	DEFAULT_DELTA_PROFILE_TEMPLATE,
	DEFAULT_VOLUME_PROFILE_TEMPLATE,
	mergeProfileTemplate,
} from '../templates/defaults';
import { mergeFixedRangeProfileOptions } from '../utils/merge-options';
import { clampValueAreaFraction } from '../pipeline/value-area';
import { FIXED_RANGE_PROFILE_TOOL_TYPE } from '../types/template';
import type { ProfileComputedSnapshot, ProfileMetricDefinition, ProfileTemplate } from '../types/template';
import {
	cloneEditorState,
	getPropertyPath,
	METRIC_ROLE_OPTIONS,
	PROFILE_PROPERTY_SECTIONS,
	setPropertyPath,
	type ProfilePropertyField,
} from './profile-properties-schema';
import { PROFILE_PROPERTIES_EDITOR_STYLES } from './profile-properties-editor-styles';

/** Export payload for opening/applying profile tool options. */
export interface FixedRangeProfileToolExport {
	readonly id: string;
	readonly toolType: typeof FIXED_RANGE_PROFILE_TOOL_TYPE;
	readonly points?: ReadonlyArray<{ readonly timestamp: number; readonly price: number }>;
	readonly options: LineToolFixedRangeProfileOptions;
}

/** Minimal line-tools API surface required by the editor. */
export interface ProfilePropertiesLineToolsApi {
	applyLineToolOptions(toolData: FixedRangeProfileToolExport): boolean;
	/** Optional — refreshes computed snapshot stats after live preview. */
	getLineToolByID?(id: string): string;
}

export interface ProfilePropertiesEditorOptions {
	/** Debounce live preview updates (ms). Default 150. */
	readonly livePreviewDebounceMs?: number;
	/** Pipeline list for the data-source dropdown. Default: empty (caller should supply). */
	readonly getPipelines?: () => readonly ProfilePipelineDefinition[];
	/** Called after Apply or successful live preview. */
	readonly onApply?: (toolId: string, options: LineToolFixedRangeProfileOptions) => void;
	/** Called when the dialog closes (Apply, Cancel, or backdrop). */
	readonly onClose?: () => void;
}

type ToolExport = FixedRangeProfileToolExport;

/**
 * Modal properties editor for FixedRangeProfile line tools.
 * Double-click integration: use {@link attachProfilePropertiesEditor}.
 */
export class ProfilePropertiesEditor {
	private readonly _lineTools: ProfilePropertiesLineToolsApi;
	private readonly _options: Required<Pick<ProfilePropertiesEditorOptions, 'livePreviewDebounceMs'>> &
		ProfilePropertiesEditorOptions;

	private _root: HTMLElement | null = null;
	private _toolId: string | null = null;
	private _toolPoints: ToolExport['points'] | undefined;
	private _draft: Record<string, unknown> = {};
	private _baseline: Record<string, unknown> = {};
	private _previewTimer: ReturnType<typeof setTimeout> | null = null;
	private _metricsContainer: HTMLElement | null = null;
	private _statsEl: HTMLElement | null = null;
	private _liveLabel: HTMLElement | null = null;

	public constructor(lineTools: ProfilePropertiesLineToolsApi, options: ProfilePropertiesEditorOptions = {}) {
		this._lineTools = lineTools;
		this._options = {
			livePreviewDebounceMs: options.livePreviewDebounceMs ?? 150,
			...options,
		};
	}

	public isOpen(): boolean {
		return this._root != null && !this._root.hidden;
	}

	public open(toolExport: ToolExport): void {
		if (toolExport.toolType !== FIXED_RANGE_PROFILE_TOOL_TYPE) {
			return;
		}
		this._ensureDom();
		this._toolId = toolExport.id;
		this._toolPoints = toolExport.points;
		this._baseline = cloneEditorState((toolExport.options ?? {}) as Record<string, unknown>);
		this._draft = cloneEditorState(this._baseline);
		this._renderAll();
		this._root!.hidden = false;
		document.body.style.overflow = 'hidden';
	}

	public close(): void {
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

	public destroy(): void {
		document.removeEventListener('keydown', this._onKeyDown);
		this.close();
		this._root?.remove();
		this._root = null;
	}

	private _ensureDom(): void {
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
			const target = e.target as HTMLElement;
			const action = target.closest('[data-action]')?.getAttribute('data-action');
			if (action === 'cancel') {
				this._revertAndClose();
			} else if (action === 'apply') {
				this._apply(true);
			} else if (action === 'reset') {
				this._resetToDefaults();
			}
		});

		document.addEventListener('keydown', this._onKeyDown);
		document.body.appendChild(root);
		this._root = root;
		this._liveLabel = root.querySelector('[data-ref="live"]');
	}

	private _onKeyDown = (e: KeyboardEvent): void => {
		if (!this.isOpen()) {
			return;
		}
		if (e.key === 'Escape') {
			e.preventDefault();
			this._revertAndClose();
		}
	};

	private _template(): ProfileTemplate {
		const frp = this._draft.fixedRangeProfile as { template: ProfileTemplate } | undefined;
		return frp?.template ?? DEFAULT_VOLUME_PROFILE_TEMPLATE;
	}

	private _snapshot(): ProfileComputedSnapshot | undefined {
		const frp = this._draft.fixedRangeProfile as { snapshot?: ProfileComputedSnapshot } | undefined;
		return frp?.snapshot;
	}

	private _renderAll(): void {
		const body = this._root!.querySelector('[data-ref="body"]') as HTMLElement;
		const subtitle = this._root!.querySelector('[data-ref="subtitle"]') as HTMLElement;
		subtitle.textContent = `${this._template().label} · ${this._toolId ?? ''}`;
		body.innerHTML = '';

		this._renderPresets(body);
		this._renderMetricCards(body);

		for (const section of PROFILE_PROPERTY_SECTIONS) {
			body.appendChild(this._renderSection(section));
		}

		this._renderStats(body);
	}

	private _renderPresets(container: HTMLElement): void {
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
				const frp = (this._draft.fixedRangeProfile ?? {}) as Record<string, unknown>;
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

	private _renderMetricCards(container: HTMLElement): void {
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

	private _renderMetricCardsContent(): void {
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
			card.appendChild(
				this._metricSelectField('Role', metric.role, METRIC_ROLE_OPTIONS, (v) =>
					this._updateMetric(index, { role: v as ProfileMetricDefinition['role'] }),
				),
			);
			card.appendChild(
				this._metricColorField('Color', metric.color, (v) => this._updateMetric(index, { color: v })),
			);
			card.appendChild(
				this._metricRangeField(
					'Opacity',
					metric.opacity ?? 1,
					0,
					1,
					0.05,
					(v) => this._updateMetric(index, { opacity: v }),
				),
			);
			this._metricsContainer!.appendChild(card);
		});
	}

	private _updateMetric(index: number, partial: Partial<ProfileMetricDefinition>): void {
		const frp = (this._draft.fixedRangeProfile ?? {}) as { template: ProfileTemplate };
		const metrics = frp.template.metrics.map((m, i) => (i === index ? { ...m, ...partial } : m));
		frp.template = { ...frp.template, metrics };
		this._draft.fixedRangeProfile = frp;
		this._schedulePreview();
	}

	private _metricField(
		label: string,
		value: string,
		onChange: (v: string) => void,
	): HTMLElement {
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

	private _metricSelectField(
		label: string,
		value: string,
		options: readonly { value: string; label: string }[],
		onChange: (v: string) => void,
	): HTMLElement {
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

	private _metricColorField(label: string, value: string, onChange: (v: string) => void): HTMLElement {
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
		const sync = (hex: string) => {
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

	private _metricRangeField(
		label: string,
		value: number,
		min: number,
		max: number,
		step: number,
		onChange: (v: number) => void,
	): HTMLElement {
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

	private _renderSection(section: (typeof PROFILE_PROPERTY_SECTIONS)[number]): HTMLElement {
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

	private _renderField(field: ProfilePropertyField): HTMLElement {
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
		} else if (field.type === 'select') {
			const select = document.createElement('select');
			select.id = `vp-field-${field.id}`;
			const options =
				field.id === 'pipelineId'
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
		} else if (field.type === 'metricSelect') {
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
		} else if (field.type === 'color') {
			wrap.appendChild(this._colorInput(field, String(raw ?? '#ffffff')));
		} else if (field.type === 'percent') {
			const pct = Math.round(Number(raw ?? 0.7) * 100);
			wrap.appendChild(this._rangeInput(field, pct, field.min ?? 1, field.max ?? 100, field.step ?? 1, (v) => v / 100));
		} else if (field.type === 'range') {
			wrap.appendChild(
				this._rangeInput(field, Number(raw ?? 0), field.min ?? 0, field.max ?? 1, field.step ?? 0.01, (v) => v),
			);
		} else if (field.type === 'number') {
			const input = document.createElement('input');
			input.type = 'number';
			input.id = `vp-field-${field.id}`;
			if (field.min != null) input.min = String(field.min);
			if (field.max != null) input.max = String(field.max);
			if (field.step != null) input.step = String(field.step);
			input.value = raw == null || raw === '' ? '' : String(raw);
			input.addEventListener('change', () => {
				const v = input.value === '' ? undefined : Number(input.value);
				this._setField(field, v);
			});
			wrap.appendChild(input);
		} else {
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

	private _colorInput(field: ProfilePropertyField, value: string): HTMLElement {
		const row = document.createElement('div');
		row.className = 'vp-props-color-row';
		const color = document.createElement('input');
		color.type = 'color';
		color.id = `vp-field-${field.id}`;
		color.value = normalizeHexColor(value);
		const text = document.createElement('input');
		text.type = 'text';
		text.value = value;
		const apply = (hex: string) => {
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

	private _rangeInput(
		field: ProfilePropertyField,
		value: number,
		min: number,
		max: number,
		step: number,
		toStored: (display: number) => number,
	): HTMLElement {
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

	private _setField(field: ProfilePropertyField, value: unknown): void {
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

	private _renderStats(container: HTMLElement): void {
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

	private _updateStats(): void {
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

	private _resetToDefaults(): void {
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

	private _schedulePreview(): void {
		if (this._previewTimer != null) {
			clearTimeout(this._previewTimer);
		}
		this._previewTimer = setTimeout(() => {
			this._previewTimer = null;
			this._apply(false);
		}, this._options.livePreviewDebounceMs);
	}

	private _buildOptions(): LineToolFixedRangeProfileOptions {
		return mergeFixedRangeProfileOptions(
			this._baseline as LineToolFixedRangeProfileOptions,
			this._draft as Parameters<typeof mergeFixedRangeProfileOptions>[1],
		);
	}

	private _refreshDraftFromTool(): void {
		if (this._toolId == null || !this._lineTools.getLineToolByID) {
			return;
		}
		try {
			const json = this._lineTools.getLineToolByID(this._toolId);
			const tools = JSON.parse(json) as ToolExport[];
			const tool = tools[0];
			if (tool?.options) {
				const opts = tool.options as Record<string, unknown>;
				this._baseline = cloneEditorState(opts);
				this._draft = cloneEditorState(opts);
				this._updateStats();
			}
		} catch {
			// ignore parse errors
		}
	}

	private _apply(closeAfter: boolean): void {
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

	private _revertAndClose(): void {
		if (this._toolId != null) {
			this._lineTools.applyLineToolOptions({
				id: this._toolId,
				toolType: FIXED_RANGE_PROFILE_TOOL_TYPE,
				options: this._baseline as LineToolFixedRangeProfileOptions,
				...(this._toolPoints != null ? { points: this._toolPoints } : {}),
			});
		}
		this.close();
	}
}

function normalizeHexColor(input: string): string {
	const v = input.trim();
	if (/^#[0-9a-fA-F]{6}$/.test(v)) {
		return v;
	}
	if (/^[0-9a-fA-F]{6}$/.test(v)) {
		return `#${v}`;
	}
	return '#787b86';
}
