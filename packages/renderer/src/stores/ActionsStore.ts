import { defineStore } from 'pinia';
import { ActionForNodeOrMark, ViewAction } from '../actions';

export const useActions = defineStore('actions', {
  state: () => ({
    action: undefined as ActionForNodeOrMark | undefined,
    viewAction: undefined as ViewAction | undefined,
  }),
  getters: {
    lastAction(state) {
      return state.action;
    },
    lastViewAction(state) {
      return state.viewAction;
    },
  },
  actions: {
    setAction(action: ActionForNodeOrMark) {
      this.action = action;
    },
    setViewAction(viewAction: ViewAction) {
      this.viewAction = viewAction;
    },
  },
});
