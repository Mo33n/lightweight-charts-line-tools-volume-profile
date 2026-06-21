import { describe, expect, it } from 'vitest';
import { getPropertyPath, setPropertyPath } from '../src/ui/profile-properties-schema';

describe('profile property path utils', () => {
	it('reads nested paths', () => {
		const root = {
			fixedRangeProfile: {
				template: { levels: { valueAreaFraction: 0.7 } },
			},
		};
		expect(getPropertyPath(root, 'fixedRangeProfile.template.levels.valueAreaFraction')).toBe(0.7);
	});

	it('writes nested paths', () => {
		const root: Record<string, unknown> = { visible: true };
		setPropertyPath(root, 'fixedRangeProfile.template.displayMode', 'delta');
		expect(getPropertyPath(root, 'fixedRangeProfile.template.displayMode')).toBe('delta');
	});
});
