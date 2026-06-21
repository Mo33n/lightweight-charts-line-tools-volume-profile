import type { LineToolOptionsCommon } from 'lightweight-charts-line-tools-core';
import type { ProfileComputedSnapshot, ProfileTemplate } from './template';
/** Tool-specific options (merged with LineToolOptionsCommon by the model). */
export interface LineToolFixedRangeProfileSpecificOptions {
    readonly fixedRangeProfile: {
        /** Serializable template — drives all rendering. */
        readonly template: ProfileTemplate;
        /** References a pipeline registered via registerProfilePipeline(). */
        readonly pipelineId: string;
        /** Optional cached computation (rebuilt when anchors or bars change). */
        readonly snapshot?: ProfileComputedSnapshot;
        /** Price tick step for binning when bar metadata lacks it. */
        readonly tickSize?: number;
    };
}
export type LineToolFixedRangeProfileOptions = LineToolFixedRangeProfileSpecificOptions & LineToolOptionsCommon;
export type DeepPartialFixedRangeProfileOptions = {
    fixedRangeProfile?: {
        template?: Partial<ProfileTemplate> & {
            rowLayout?: Partial<ProfileTemplate['rowLayout']>;
            metrics?: ProfileTemplate['metrics'];
            metricBinding?: Partial<ProfileTemplate['metricBinding']>;
            histogram?: Partial<ProfileTemplate['histogram']>;
            levels?: Partial<ProfileTemplate['levels']>;
            range?: Partial<ProfileTemplate['range']>;
            emptyState?: Partial<ProfileTemplate['emptyState']>;
        };
        pipelineId?: string;
        snapshot?: ProfileComputedSnapshot;
        tickSize?: number;
    };
} & Partial<LineToolOptionsCommon>;
