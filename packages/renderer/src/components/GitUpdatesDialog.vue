<template>
  <q-dialog :model-value="visible" @hide="$emit('close')">
    <q-card style="min-width: 38rem">
      <q-card-section class="text-h6">
        {{ $t('gitChangesDialog.updatesTitle') }}
      </q-card-section>
      <q-card-section v-if="busy" class="text-center">
        <q-spinner size="2rem" />
        <div class="q-mt-sm">{{ $t('gitChangesDialog.loadingUpdates') }}</div>
      </q-card-section>
      <q-card-section v-else-if="error" class="text-negative">{{
        error
      }}</q-card-section>
      <q-card-section v-else-if="!remote">
        {{ $t('gitChangesDialog.noRemote') }}
      </q-card-section>
      <q-card-section v-else>
        <q-banner v-if="!hasAhead" class="q-mb-md">
          {{
            $t('gitChangesDialog.noUpdates', {
              name: status.branch || '',
            })
          }}
        </q-banner>
        <q-list bordered separator>
          <q-item
            v-for="branch in branches"
            :key="branch.name"
            :class="`text-${branchColor(branch)}`"
          >
            <q-item-section>
              <q-item-label>{{ branch.name }}</q-item-label>
              <q-badge
                v-if="isLocalActive(branch)"
                color="dark"
                class="q-ml-sm"
              >
                {{ $t('gitChangesDialog.localActiveBranch') }}
              </q-badge>
              <q-item-label v-if="branch.ahead > 0" caption>
                {{ $t('gitChangesDialog.aheadBy', { count: branch.ahead }) }}
              </q-item-label>
              <q-item-label v-if="branch.behind > 0" caption>
                {{ $t('gitChangesDialog.behindBy', { count: branch.behind }) }}
              </q-item-label>
              <q-item-label v-if="!branch.ahead && !branch.behind" caption>
                {{ $t('gitChangesDialog.inSync') }}
              </q-item-label>
              <q-item-label v-if="branch.mergeable" class="text-positive">
                {{ $t('gitChangesDialog.mergeable') }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn
                v-if="branch.ahead > 0 && !branch.mergeable"
                :label="$t('gitChangesDialog.checkMergeable')"
                :loading="branch.busy"
                @click="checkMerge(branch)"
              />
              <q-btn
                v-else-if="branch.mergeable"
                color="primary"
                :label="$t('gitChangesDialog.merge')"
                :loading="branch.busy"
                @click="merge(branch)"
              />
              <q-btn
                v-if="isLocalActive(branch) && branch.behind > 0"
                color="dark"
                :label="$t('gitChangesDialog.push')"
                :loading="branch.busy"
                @click="push(branch)"
              />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
      <q-card-actions align="right">
        <q-spinner v-if="busy" class="q-mr-sm" />
        <q-btn
          :label="$t('gitChangesDialog.close')"
          :disable="busy"
          @click="$emit('close')"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
  <q-dialog v-model="conflictDialogVisible" @hide="destroyMergeViews">
    <q-card class="conflict-card">
      <q-card-section class="text-h6">
        {{ $t('gitChangesDialog.conflictsTitle') }}
      </q-card-section>
      <q-card-section class="conflict-section">
        {{ $t('gitChangesDialog.conflictsMessage') }}
        <q-list bordered separator class="conflict-list q-mt-sm">
          <q-item
            v-for="conflict in conflictFiles"
            :key="conflict.path"
            clickable
            :active="selectedConflict?.path === conflict.path"
            active-class="text-primary"
            @click="showConflict(conflict)"
          >
            <q-item-section>{{ conflict.path }}</q-item-section>
          </q-item>
        </q-list>
        <template v-if="selectedConflict">
          <div class="text-subtitle2 q-mt-md q-mb-xs">
            {{ selectedConflict.path }}
          </div>
          <div class="merge-labels">
            <span>{{ $t('gitChangesDialog.localVersion') }}</span>
            <span>{{ $t('gitChangesDialog.remoteVersion') }}</span>
          </div>
          <div
            class="merge-view"
            :ref="
              (element) => setMergeContainer(element, selectedConflict?.path)
            "
          />
        </template>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn-dropdown
          color="primary"
          :label="$t('gitChangesDialog.resolveConflicts')"
        >
          <q-list>
            <q-item clickable v-close-popup @click="closeConflictDialog">
              <q-item-section>{{
                $t('gitChangesDialog.manageConflicts')
              }}</q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="resolveConflicts('ours')">
              <q-item-section>{{
                $t('gitChangesDialog.useLocalCopies')
              }}</q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="resolveConflicts('theirs')">
              <q-item-section>{{
                $t('gitChangesDialog.useRemoteCopies')
              }}</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </q-card-actions>
    </q-card>
  </q-dialog>
  <q-dialog v-model="pushDialogVisible">
    <q-card style="min-width: 30rem">
      <q-card-section class="text-h6">
        {{ $t('gitChangesDialog.credentialsTitle') }}
      </q-card-section>
      <q-card-section>
        <div v-if="pushError" class="text-negative q-mb-sm">
          {{ pushError }}
        </div>
        <q-input
          v-model="pushUser"
          :label="$t('gitChangesDialog.username')"
          outlined
        />
        <q-input
          v-model="pushPassword"
          :label="$t('gitChangesDialog.password')"
          type="password"
          outlined
          class="q-mt-sm"
        />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn :label="$t('gitChangesDialog.cancel')" @click="cancelPush" />
        <q-btn
          color="primary"
          :label="$t('gitChangesDialog.retry')"
          :loading="pushBusy"
          :disable="!pushUser || !pushPassword"
          @click="retryPush"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { mapState } from 'pinia';
import { nextTick } from 'vue';
import { MergeView } from '@codemirror/merge';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import { useBackend } from '../stores';
import type {
  GitMergeConflict,
  GitProjectStatus,
  GitRemoteBranch,
} from '../common';

type BranchState = GitRemoteBranch & {
  mergeable?: boolean;
  busy?: boolean;
};

export default {
  props: { visible: Boolean, projectPath: { type: String, required: true } },
  emits: ['close'],
  data() {
    return {
      status: { managed: false, files: [] } as GitProjectStatus,
      branches: [] as BranchState[],
      busy: false,
      error: '',
      conflictFiles: [] as GitMergeConflict[],
      selectedConflict: undefined as GitMergeConflict | undefined,
      conflictBranch: undefined as BranchState | undefined,
      conflictDialogVisible: false,
      mergeContainers: {} as Record<string, HTMLElement>,
      mergeViews: {} as Record<string, MergeView>,
      mergeScrollCleanup: undefined as (() => void) | undefined,
      pushBranch: undefined as BranchState | undefined,
      pushDialogVisible: false,
      pushBusy: false,
      pushUser: '',
      pushPassword: '',
      pushError: '',
    };
  },
  computed: {
    ...mapState(useBackend, ['backend']),
    remote(): string | undefined {
      return this.status.remote;
    },
    hasAhead(): boolean {
      return this.branches.some((branch) => branch.ahead > 0);
    },
  },
  watch: {
    visible(value: boolean) {
      if (value) void this.refresh();
    },
  },
  methods: {
    branchColor(branch: BranchState): 'positive' | 'dark' | 'primary' {
      if (branch.ahead > 0) return 'positive';
      if (branch.behind > 0) return 'dark';
      return 'primary';
    },
    isLocalActive(branch: BranchState): boolean {
      return branch.name === `${this.status.remote}/${this.status.branch}`;
    },
    async refresh() {
      if (!this.backend) return;
      this.busy = true;
      this.error = '';
      this.branches = [];
      try {
        this.status = await this.backend.gitProjectStatus(this.projectPath);
        if (this.status.managed && this.status.remote) {
          this.branches = await this.backend.gitProjectUpdates(
            this.projectPath,
          );
        }
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error);
      } finally {
        this.busy = false;
      }
    },
    async checkMerge(branch: BranchState) {
      if (!this.backend) return;
      branch.busy = true;
      try {
        const result = await this.backend.checkGitMerge(
          this.projectPath,
          branch.name,
        );
        branch.mergeable = result.mergeable;
        if (!result.mergeable) {
          this.conflictFiles = result.conflicts;
          this.selectedConflict = undefined;
          this.conflictBranch = branch;
          this.conflictDialogVisible = true;
        }
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error);
      } finally {
        branch.busy = false;
      }
    },
    closeConflictDialog() {
      this.conflictDialogVisible = false;
    },
    async showConflict(conflict: GitMergeConflict) {
      this.selectedConflict = conflict;
      await nextTick();
      this.createMergeViews();
    },
    setMergeContainer(element: unknown, path: string | undefined) {
      if (!path) return;
      if (element instanceof HTMLElement) this.mergeContainers[path] = element;
    },
    createMergeViews() {
      const conflict = this.selectedConflict;
      if (!conflict) return;
      const parent = this.mergeContainers[conflict.path];
      this.destroyMergeViews();
      if (!parent) return;
      this.mergeViews[conflict.path] = new MergeView({
        parent,
        orientation: 'a-b',
        highlightChanges: true,
        a: {
          doc: this.formatConflictContent(conflict.path, conflict.local),
          extensions: [
            basicSetup,
            EditorState.readOnly.of(true),
            EditorView.editable.of(false),
          ],
        },
        b: {
          doc: this.formatConflictContent(conflict.path, conflict.remote),
          extensions: [
            basicSetup,
            EditorState.readOnly.of(true),
            EditorView.editable.of(false),
          ],
        },
      });
      const scrollers = [
        ...parent.querySelectorAll<HTMLElement>('.cm-mergeView .cm-scroller'),
      ];
      if (scrollers.length === 2) {
        let syncing = false;
        const synchronize = (source: HTMLElement, target: HTMLElement) => {
          if (syncing) return;
          syncing = true;
          target.scrollTop = source.scrollTop;
          target.scrollLeft = source.scrollLeft;
          requestAnimationFrame(() => {
            syncing = false;
          });
        };
        const listeners = scrollers.map((source, index) => {
          const target = scrollers[index === 0 ? 1 : 0];
          const listener = () => synchronize(source, target);
          source.addEventListener('scroll', listener);
          return { source, listener };
        });
        this.mergeScrollCleanup = () => {
          for (const { source, listener } of listeners)
            source.removeEventListener('scroll', listener);
        };
      }
    },
    formatConflictContent(path: string, content: string): string {
      if (
        !path.toLowerCase().endsWith('.json') ||
        /[\r\n]/.test(content.trim())
      )
        return content;
      try {
        return JSON.stringify(JSON.parse(content), null, 2);
      } catch {
        return content;
      }
    },
    destroyMergeViews() {
      this.mergeScrollCleanup?.();
      this.mergeScrollCleanup = undefined;
      for (const view of Object.values(this.mergeViews)) view.destroy();
      this.mergeViews = {};
      this.mergeContainers = {};
    },
    async resolveConflicts(strategy: 'ours' | 'theirs') {
      if (!this.backend || !this.conflictBranch) return;
      this.conflictBranch.busy = true;
      try {
        await this.backend.mergeGitProject(
          this.projectPath,
          this.conflictBranch.name,
          strategy,
        );
        this.conflictDialogVisible = false;
        await this.refresh();
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error);
        this.conflictBranch.busy = false;
      }
    },
    async merge(branch: BranchState) {
      if (!this.backend) return;
      branch.busy = true;
      try {
        await this.backend.mergeGitProject(this.projectPath, branch.name);
        await this.refresh();
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error);
        branch.busy = false;
      }
    },
    async push(branch: BranchState, user = '', password = '') {
      if (!this.backend) return;
      branch.busy = true;
      this.pushBusy = true;
      try {
        await this.backend.pushGitProject(this.projectPath, user, password);
        this.pushDialogVisible = false;
        this.pushError = '';
        await this.refresh();
      } catch (error) {
        this.pushBranch = branch;
        this.pushError = error instanceof Error ? error.message : String(error);
        this.pushDialogVisible = true;
      } finally {
        branch.busy = false;
        this.pushBusy = false;
      }
    },
    retryPush() {
      if (!this.pushBranch) return;
      void this.push(this.pushBranch, this.pushUser, this.pushPassword);
    },
    cancelPush() {
      this.pushDialogVisible = false;
      this.pushError = '';
      this.pushUser = '';
      this.pushPassword = '';
    },
  },
};
</script>

<style scoped>
.merge-view {
  height: min(40vh, 32rem);
  border: 1px solid var(--q-separator-color);
  overflow: hidden;
}

.merge-view :deep(.cm-editor) {
  height: 100% !important;
}

.merge-view :deep(.cm-scroller) {
  height: 100% !important;
  overflow: auto !important;
}

.merge-view :deep(.cm-mergeView) {
  height: 100% !important;
  overflow: hidden !important;
}

.merge-view :deep(.cm-mergeViewEditors),
.merge-view :deep(.cm-mergeViewEditor) {
  height: 100%;
  min-height: 0;
}

.merge-labels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  color: var(--q-primary);
  font-size: 0.85rem;
  font-weight: 500;
  gap: 1px;
}

.conflict-card {
  width: 90vw;
  max-width: 1200px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.conflict-section {
  min-height: 0;
  overflow: hidden;
}

.conflict-list {
  max-height: 12rem;
  overflow-y: auto;
}
</style>
