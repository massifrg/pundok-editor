import { describe, expect, it, vi } from 'vitest';
import { createInheritedItemHelpers } from '../src/components/helpers/inheritedItems';

describe('inherited item helpers', () => {
  it('reads live removed and provenance collections', () => {
    let removed = ['hidden'];
    let provenance = { inherited: 'base' };
    const updateRemoved = vi.fn();
    const helpers = createInheritedItemHelpers({
      removed: () => removed,
      provenance: () => provenance,
      updateRemoved,
    });

    expect(helpers.isRemoved('hidden')).toBe(true);
    expect(helpers.inheritedSource('inherited')).toBe('base');
    expect(helpers.inheritedBackground('inherited')).toBe('#e8f5e9');

    removed = [];
    provenance = { inherited: 'project', second: 'base' };
    expect(helpers.isRemoved('hidden')).toBe(false);
    expect(helpers.inheritedBackground('inherited')).toBe('#e8f5e9');

    helpers.setRemoved('hidden', true);
    expect(updateRemoved).toHaveBeenCalledWith(['hidden']);
    helpers.setRemoved('hidden', false);
    expect(updateRemoved).toHaveBeenLastCalledWith([]);
  });

  it('does not assign a background to local items', () => {
    const helpers = createInheritedItemHelpers({
      removed: () => [],
      provenance: () => ({}),
      updateRemoved: vi.fn(),
    });

    expect(helpers.inheritedBackground('local')).toBeUndefined();
  });
});
