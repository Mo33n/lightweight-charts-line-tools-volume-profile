import type { LineToolFixedRangeProfileOptions, DeepPartialFixedRangeProfileOptions } from '../types/options';
export declare function createDefaultFixedRangeProfileOptions(partial?: DeepPartialFixedRangeProfileOptions): LineToolFixedRangeProfileOptions;
/** Deep-merge user partial options onto current tool options. */
export declare function mergeFixedRangeProfileOptions(current: LineToolFixedRangeProfileOptions, partial: DeepPartialFixedRangeProfileOptions): LineToolFixedRangeProfileOptions;
