import type { ProfileTemplate } from '../types/template';
export declare const DEFAULT_VOLUME_PROFILE_TEMPLATE: ProfileTemplate;
export declare const DEFAULT_DELTA_PROFILE_TEMPLATE: ProfileTemplate;
/** Deep-merge partial template overrides onto a base template. */
export declare function mergeProfileTemplate(base: ProfileTemplate, partial: Partial<ProfileTemplate> & {
    rowLayout?: Partial<ProfileTemplate['rowLayout']>;
    metricBinding?: Partial<ProfileTemplate['metricBinding']>;
    histogram?: Partial<ProfileTemplate['histogram']>;
    levels?: Partial<ProfileTemplate['levels']>;
    range?: Partial<ProfileTemplate['range']>;
    emptyState?: Partial<ProfileTemplate['emptyState']>;
}): ProfileTemplate;
