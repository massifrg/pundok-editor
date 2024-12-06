import { defineStore } from 'pinia';
import type { Backend } from '../backend/backend';

export const useBackend = defineStore('backend', {
  state: () => ({
    _backend: null as Backend | null,
  }),
  getters: {
    backend(state) {
      return state._backend;
    },
  },
  actions: {
    setBackend(backend: Backend) {
      if (backend) this._backend = backend;
    },
  },
});
