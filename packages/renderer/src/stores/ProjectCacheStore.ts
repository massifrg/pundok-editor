import { defineStore } from 'pinia';
import { ProjectComponent, QueryResult } from '../common';

class ProjectCache {
  constructor(
    readonly indices?: Record<string, QueryResult[]>,
    readonly structure?: ProjectComponent,
  ) {}
}

export const useProjectCache = defineStore('projectCache', {
  state: () => ({
    _cache: new ProjectCache(),
  }),
  getters: {
    indicesCache(state): Record<string, QueryResult[]> | undefined {
      return state._cache.indices;
    },
    structureCache(state): ProjectComponent | undefined {
      return state._cache.structure;
    },
  },
  actions: {
    setIndices(indices?: Record<string, QueryResult[]>) {
      this._cache = new ProjectCache(indices, this._cache.structure);
    },
    setStructure(structure: ProjectComponent) {
      this._cache = new ProjectCache(this._cache.indices, structure);
    },
    setIndex(indexName: string, results: QueryResult[]) {
      const curIndices = this._cache.indices || {};
      this.setIndices({ ...curIndices, [indexName]: results });
    },
  },
});
