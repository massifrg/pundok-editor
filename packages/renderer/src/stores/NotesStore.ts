import { defineStore } from 'pinia';

export const useNotes = defineStore('notes', {
  state: () => ({
    _tick: 0 as number,
  }),
  getters: {
    tick(state) {
      return state._tick;
    },
  },
  actions: {
    nextTick() {
      this._tick++;
    },
  },
});
