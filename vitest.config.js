if (!Map.groupBy) {
  Map.groupBy = function (items, keyFor) {
    const result = new Map();
    for (const item of items) {
      const key = keyFor(item);
      const group = result.get(key);
      if (group) group.push(item);
      else result.set(key, [item]);
    }
    return result;
  };
}

/**
 * Config for global end-to-end tests
 * placed in project root tests folder
 * @type {import('vite').UserConfig}
 * @see https://vitest.dev/config/
 */
const config = {
  test: {
    /**
     * By default, vitest search test files in all packages.
     * For e2e tests have sense search only is project root tests folder
     */
    include: ['./tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],

    /**
     * A default timeout of 5000ms is sometimes not enough for playwright.
     */
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
};

export default config;
