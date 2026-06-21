import type { LineToolsDoubleClickEventHandler } from 'lightweight-charts-line-tools-core';
import { FIXED_RANGE_PROFILE_TOOL_TYPE } from '../types/template';
import { listProfilePipelines } from '../pipeline/registry';
import type { LineToolFixedRangeProfileOptions } from '../types/options';
import {
	ProfilePropertiesEditor,
	type FixedRangeProfileToolExport,
	type ProfilePropertiesEditorOptions,
	type ProfilePropertiesLineToolsApi,
} from './profile-properties-editor';

export interface AttachProfilePropertiesEditorOptions extends ProfilePropertiesEditorOptions {
	/** If true, only open when double-clicking FixedRangeProfile tools. Default true. */
	readonly fixedRangeProfileOnly?: boolean;
}

export interface ProfilePropertiesEditorHandle {
	readonly editor: ProfilePropertiesEditor;
	/** Remove double-click subscription and destroy the modal. */
	destroy(): void;
}

type LineToolsWithDoubleClick = ProfilePropertiesLineToolsApi & {
	subscribeLineToolsDoubleClick(handler: LineToolsDoubleClickEventHandler): void;
	unsubscribeLineToolsDoubleClick(handler: LineToolsDoubleClickEventHandler): void;
	applyLineToolOptions(toolData: {
		id: string;
		toolType: string;
		options?: LineToolFixedRangeProfileOptions;
		points?: FixedRangeProfileToolExport['points'];
	}): boolean;
};

/**
 * Wires {@link ProfilePropertiesEditor} to line-tools double-click events.
 */
export function attachProfilePropertiesEditor(
	lineTools: LineToolsWithDoubleClick,
	options: AttachProfilePropertiesEditorOptions = {},
): ProfilePropertiesEditorHandle {
	const bridge: ProfilePropertiesLineToolsApi = {
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

	const handler: LineToolsDoubleClickEventHandler = (params) => {
		const tool = params.selectedLineTool;
		if (fixedOnly && String(tool.toolType) !== FIXED_RANGE_PROFILE_TOOL_TYPE) {
			return;
		}
		editor.open({
			id: tool.id,
			toolType: FIXED_RANGE_PROFILE_TOOL_TYPE,
			points: tool.points,
			options: tool.options as unknown as LineToolFixedRangeProfileOptions,
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
