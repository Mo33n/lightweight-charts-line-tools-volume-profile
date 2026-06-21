import type { LineToolsDoubleClickEventHandler } from 'lightweight-charts-line-tools-core';
import type { LineToolFixedRangeProfileOptions } from '../types/options';
import { ProfilePropertiesEditor, type FixedRangeProfileToolExport, type ProfilePropertiesEditorOptions, type ProfilePropertiesLineToolsApi } from './profile-properties-editor';
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
export declare function attachProfilePropertiesEditor(lineTools: LineToolsWithDoubleClick, options?: AttachProfilePropertiesEditorOptions): ProfilePropertiesEditorHandle;
export {};
