import { nextTick } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { openGitUpdates } from '../src/components/editor/projectManagement';

describe('openGitUpdates', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens the updates dialog after closing the message dialog', async () => {
    vi.useFakeTimers();
    const host = {
      message: { type: 'warning', message: 'No updates' },
      visibleGitUpdates: false,
    };

    openGitUpdates(host);

    expect(host.message).toBeNull();
    expect(host.visibleGitUpdates).toBe(false);

    await nextTick();
    vi.advanceTimersByTime(299);
    expect(host.visibleGitUpdates).toBe(false);

    vi.advanceTimersByTime(1);
    expect(host.visibleGitUpdates).toBe(true);
  });
});
