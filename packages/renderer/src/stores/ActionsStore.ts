import { defineStore } from 'pinia';
import { ActionForNodeOrMark, ViewAction } from '../actions';

export const useActions = defineStore('actions', {
  state: () => ({
    /** Used to dispacth actions that can be captured by many components. */
    action: undefined as ActionForNodeOrMark | undefined,
    /** Used to update custom views, such as (foot)notes views. */
    viewAction: undefined as ViewAction | undefined,
    /** Used to flag a work in progress on the backend. */
    // TODO: there are many possible remote wip jobs.
    _remoteWorkInProgress: false,
  }),
  getters: {
    lastAction(state) {
      return state.action;
    },
    lastViewAction(state) {
      return state.viewAction;
    },
    remoteWorkInProgress(state) {
      return state._remoteWorkInProgress;
    }
  },
  actions: {
    setAction(action: ActionForNodeOrMark) {
      this.action = action;
    },
    setViewAction(viewAction: ViewAction) {
      this.viewAction = viewAction;
    },
    setRemoteWorkInProgress(rwip: boolean) {
      this._remoteWorkInProgress = rwip;
    }
  },
});
