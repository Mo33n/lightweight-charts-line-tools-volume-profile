import type { ProfileTemplate } from '../types/template';
/** Supported control kinds for the properties editor. */
export type ProfilePropertyFieldType = 'text' | 'number' | 'range' | 'checkbox' | 'select' | 'color' | 'percent' | 'metricSelect';
export interface ProfilePropertySelectOption {
    readonly value: string;
    readonly label: string;
}
export interface ProfilePropertyField {
    readonly id: string;
    readonly label: string;
    readonly path: string;
    readonly type: ProfilePropertyFieldType;
    readonly hint?: string;
    readonly min?: number;
    readonly max?: number;
    readonly step?: number;
    readonly options?: readonly ProfilePropertySelectOption[];
    /** Hide when predicate returns false (e.g. rowLayout.mode !== tickSize). */
    readonly visibleWhen?: (template: ProfileTemplate) => boolean;
}
export interface ProfilePropertySection {
    readonly id: string;
    readonly title: string;
    readonly description?: string;
    readonly fields: readonly ProfilePropertyField[];
}
export declare const PROFILE_PROPERTY_SECTIONS: readonly ProfilePropertySection[];
export declare const METRIC_ROLE_OPTIONS: readonly ProfilePropertySelectOption[];
/** Dot-path read on a plain object tree. */
export declare function getPropertyPath(root: Record<string, unknown>, path: string): unknown;
/** Dot-path write; creates intermediate objects as needed. */
export declare function setPropertyPath(root: Record<string, unknown>, path: string, value: unknown): void;
/** Deep clone via JSON — options objects are JSON-serializable. */
export declare function cloneEditorState<T>(value: T): T;
