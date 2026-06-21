import type { ProfileTimeRange } from '../types/template';
import type { LineToolFixedRangeProfileSpecificOptions } from '../types/options';
/** Cache key inputs that affect profile computation (not pure styling). */
export declare function buildProfileSnapshotCacheKey(timeRange: ProfileTimeRange, fixedRangeProfile: LineToolFixedRangeProfileSpecificOptions['fixedRangeProfile'], pointsLength: number): string;
