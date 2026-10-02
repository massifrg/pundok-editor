import { defineStore } from 'pinia';
import { QueryResult } from '../common';

class ProjectCache {
  constructor(readonly indices?: Record<string, QueryResult[]>) {}
}

export const useProjectCache = defineStore('projectCache', {
  state: () => ({
    _cache: new ProjectCache(),
  }),
  getters: {
    indicesCache(state): Record<string, QueryResult[]> | undefined {
      return state._cache.indices;
    },
  },
  actions: {
    setIndices(indices?: Record<string, QueryResult[]>) {
      this._cache = new ProjectCache(indices);
    },
    setIndex(indexName: string, results: QueryResult[]) {
      const curIndices = this._cache.indices || {};
      this.setIndices({ ...curIndices, [indexName]: results });
    },
  },
});
