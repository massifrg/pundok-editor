<template>
  <q-dialog :model-value="visible" @hide="$emit('close')">
    <q-card class="changes-card">
      <q-card-section class="text-h6">
        {{ $t('gitChangesDialog.title') }}
      </q-card-section>
      <q-card-section v-if="!status.managed">
        {{ $t('gitChangesDialog.notManaged') }}
      </q-card-section>
      <q-card-section v-else class="changes-section">
        <div class="changes-panes">
          <section>
            <div class="pane-header">
              <div class="text-subtitle1">
                {{ $t('gitChangesDialog.unstagedFiles') }}
              </div>
              <div class="pane-actions">
                <q-btn
                  flat
                  dense
                  :icon="allUnstagedSelected ? 'deselect_all' : 'select_all'"
                  :title="
                    $t(
                      allUnstagedSelected
                        ? 'gitChangesDialog.unselectAll'
                        : 'gitChangesDialog.selectAll',
                    )
                  "
                  :disable="!unstagedFiles.length || bulkBusy"
                  @click="toggleUnstagedSelection"
                />
                <q-btn
                  flat
                  dense
                  icon="git_stage"
                  :title="$t('gitChangesDialog.stage')"
                  :disable="!selectedUnstagedPaths.length || bulkBusy"
                  :loading="bulkBusy && bulkAction === 'stage'"
                  @click="stageSelected"
                />
              </div>
            </div>
            <q-list bordered separator class="file-list">
              <q-item
                v-for="file in unstagedFiles"
                :key="`unstaged-${file.path}`"
                :class="unstagedFileClass(file)"
              >
                <q-item-section avatar>
                  <q-checkbox
                    v-model="selectedUnstagedPaths"
                    :val="file.path"
                    :disable="busyPaths.includes(file.path) || bulkBusy"
                  />
                </q-item-section>
                <q-item-section>{{ file.path }}</q-item-section>
                <q-item-section side class="file-actions">
                  <q-btn
                    flat
                    dense
                    icon="git_stage"
                    :title="$t('gitChangesDialog.stage')"
                    :loading="busyPaths.includes(file.path)"
                    @click="stage(file.path)"
                  />
                  <q-btn
                    v-if="isUntracked(file)"
                    flat
                    dense
                    :icon="
                      gitignorePaths.includes(file.path)
                        ? 'gitignore_remove'
                        : 'gitignore_add'
                    "
                    :aria-label="
                      gitignorePaths.includes(file.path)
                        ? $t('gitChangesDialog.removeFromGitignore')
                        : $t('gitChangesDialog.addToGitignore')
                    "
                    :title="
                      gitignorePaths.includes(file.path)
                        ? $t('gitChangesDialog.removeFromGitignore')
                        : $t('gitChangesDialog.addToGitignore')
                    "
                    @click="toggleGitignore(file.path)"
                  >
                    <q-tooltip>
                      {{
                        gitignorePaths.includes(file.path)
                          ? $t('gitChangesDialog.removeFromGitignore')
                          : $t('gitChangesDialog.addToGitignore')
                      }}
                    </q-tooltip>
                  </q-btn>
                </q-item-section>
              </q-item>
              <q-item v-if="!unstagedFiles.length">
                <q-item-section>{{
                  $t('gitChangesDialog.noUnstagedFiles')
                }}</q-item-section>
              </q-item>
            </q-list>
          </section>
          <section>
            <div class="pane-header">
              <div class="text-subtitle1">
                {{ $t('gitChangesDialog.stagedFiles') }}
              </div>
              <div class="pane-actions">
                <q-btn
                  flat
                  dense
                  :icon="allStagedSelected ? 'deselect_all' : 'select_all'"
                  :title="
                    $t(
                      allStagedSelected
                        ? 'gitChangesDialog.unselectAll'
                        : 'gitChangesDialog.selectAll',
                    )
                  "
                  :disable="!stagedFiles.length || bulkBusy"
                  @click="toggleStagedSelection"
                />
                <q-btn
                  flat
                  dense
                  icon="git_unstage"
                  :title="$t('gitChangesDialog.unstage')"
                  :disable="!selectedStagedPaths.length || bulkBusy"
                  :loading="bulkBusy && bulkAction === 'unstage'"
                  @click="unstageSelected"
                />
              </div>
            </div>
            <q-list bordered separator class="file-list">
              <q-item
                v-for="file in stagedFiles"
                :key="`staged-${file.path}`"
                class="text-positive"
              >
                <q-item-section avatar>
                  <q-checkbox
                    v-model="selectedStagedPaths"
                    :val="file.path"
                    :disable="busyPaths.includes(file.path) || bulkBusy"
                  />
                </q-item-section>
                <q-item-section>{{ file.path }}</q-item-section>
                <q-item-section side class="file-actions">
                  <q-btn
                    flat
                    dense
                    icon="git_unstage"
                    :title="$t('gitChangesDialog.unstage')"
                    :loading="busyPaths.includes(file.path)"
                    @click="unstage(file.path)"
                  />
                </q-item-section>
              </q-item>
              <q-item v-if="!stagedFiles.length">
                <q-item-section>{{
                  $t('gitChangesDialog.noStagedFiles')
                }}</q-item-section>
              </q-item>
            </q-list>
          </section>
        </div>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          v-if="status.managed"
          :label="$t('gitChangesDialog.branchesAndUpdates')"
          @click="openUpdates"
        />
        <q-btn
          v-if="!status.managed"
          :label="$t('gitChangesDialog.initialize')"
          color="primary"
          @click="initialize"
        />
        <q-btn
          v-if="status.managed"
          :label="$t('gitChangesDialog.commit')"
          color="primary"
          :disable="!stagedFiles.length"
          @click="commitDialogVisible = true"
        />
        <q-btn
          v-if="gitignorePaths.length"
          :label="$t('gitChangesDialog.updateGitignore')"
          color="primary"
          @click="updateGitignore"
        />
        <q-btn :label="$t('gitChangesDialog.close')" @click="$emit('close')" />
      </q-card-actions>
    </q-card>
  </q-dialog>
  <q-dialog v-model="commitDialogVisible">
    <q-card class="commit-card">
      <q-card-section class="text-h6">
        {{ $t('gitChangesDialog.commit') }}
      </q-card-section>
      <q-card-section>
        <q-input
          v-model="message"
          :label="$t('gitChangesDialog.commitMessage')"
          outlined
          autofocus
          @keyup.enter="commit"
        />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          :label="$t('gitChangesDialog.cancel')"
          @click="commitDialogVisible = false"
        />
        <q-btn
          color="primary"
          :label="$t('gitChangesDialog.commit')"
          :disable="!message.trim()"
          @click="commit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { mapState } from 'pinia';
import { useBackend } from '../stores';
import type { GitProjectStatus, GitStatusEntry } from '../common';

export default {
  props: { visible: Boolean, projectPath: { type: String, required: true } },
  emits: ['close', 'open-updates'],
  data() {
    return {
      status: { managed: false, files: [] } as GitProjectStatus,
      busyPaths: [] as string[],
      selectedUnstagedPaths: [] as string[],
      selectedStagedPaths: [] as string[],
      bulkBusy: false,
      bulkAction: '' as '' | 'stage' | 'unstage',
      gitignorePaths: [] as string[],
      commitDialogVisible: false,
      message: '',
    };
  },
  computed: {
    ...mapState(useBackend, ['backend']),
    stagedFiles(): GitStatusEntry[] {
      return this.status.files.filter(
        (file) => file.indexStatus !== ' ' && file.indexStatus !== '?',
      );
    },
    unstagedFiles(): GitStatusEntry[] {
      return this.status.files.filter(
        (file) => file.indexStatus === '?' || file.worktreeStatus !== ' ',
      );
    },
    allUnstagedSelected(): boolean {
      return (
        this.unstagedFiles.length > 0 &&
        this.unstagedFiles.every((file) =>
          this.selectedUnstagedPaths.includes(file.path),
        )
      );
    },
    allStagedSelected(): boolean {
      return (
        this.stagedFiles.length > 0 &&
        this.stagedFiles.every((file) =>
          this.selectedStagedPaths.includes(file.path),
        )
      );
    },
  },
  watch: {
    visible(value: boolean) {
      if (value) {
        this.gitignorePaths = [];
        this.selectedUnstagedPaths = [];
        this.selectedStagedPaths = [];
        void this.refresh();
      }
    },
  },
  methods: {
    isUntracked(file: GitStatusEntry): boolean {
      return file.indexStatus === '?';
    },
    unstagedFileClass(file: GitStatusEntry): string {
      if (this.gitignorePaths.includes(file.path))
        return 'text-secondary text-strike';
      return file.indexStatus === '?' ? 'text-primary' : 'text-negative';
    },
    async refresh() {
      if (this.backend) {
        this.status = await this.backend.gitProjectStatus(this.projectPath);
        const unstaged = new Set(this.unstagedFiles.map((file) => file.path));
        const staged = new Set(this.stagedFiles.map((file) => file.path));
        this.selectedUnstagedPaths = this.selectedUnstagedPaths.filter((path) =>
          unstaged.has(path),
        );
        this.selectedStagedPaths = this.selectedStagedPaths.filter((path) =>
          staged.has(path),
        );
      }
    },
    async initialize() {
      await this.backend?.initGitProject(this.projectPath);
      await this.refresh();
    },
    openUpdates() {
      this.$emit('close');
      this.$emit('open-updates');
    },
    async stage(path: string) {
      if (!this.backend) return;
      this.busyPaths.push(path);
      try {
        await this.backend.stageGitProject(this.projectPath, [path]);
        await this.refresh();
      } finally {
        this.busyPaths = this.busyPaths.filter((item) => item !== path);
      }
    },
    async unstage(path: string) {
      if (!this.backend) return;
      this.busyPaths.push(path);
      try {
        await this.backend.unstageGitProject(this.projectPath, [path]);
        await this.refresh();
      } finally {
        this.busyPaths = this.busyPaths.filter((item) => item !== path);
      }
    },
    async stageSelected() {
      await this.stagePaths(this.selectedUnstagedPaths, 'stage');
    },
    async unstageSelected() {
      await this.stagePaths(this.selectedStagedPaths, 'unstage');
    },
    toggleUnstagedSelection() {
      this.selectedUnstagedPaths = this.allUnstagedSelected
        ? []
        : this.unstagedFiles.map((file) => file.path);
    },
    toggleStagedSelection() {
      this.selectedStagedPaths = this.allStagedSelected
        ? []
        : this.stagedFiles.map((file) => file.path);
    },
    async stagePaths(paths: string[], action: 'stage' | 'unstage') {
      if (!this.backend || !paths.length) return;
      const selectedPaths = [...paths];
      this.bulkBusy = true;
      this.bulkAction = action;
      this.busyPaths.push(...selectedPaths);
      try {
        if (action === 'stage')
          await this.backend.stageGitProject(this.projectPath, selectedPaths);
        else
          await this.backend.unstageGitProject(this.projectPath, selectedPaths);
        await this.refresh();
      } finally {
        this.busyPaths = this.busyPaths.filter(
          (path) => !selectedPaths.includes(path),
        );
        this.bulkBusy = false;
        this.bulkAction = '';
      }
    },
    toggleGitignore(path: string) {
      if (this.gitignorePaths.includes(path))
        this.gitignorePaths = this.gitignorePaths.filter(
          (item) => item !== path,
        );
      else this.gitignorePaths.push(path);
    },
    async updateGitignore() {
      if (!this.backend || !this.gitignorePaths.length) return;
      await this.backend.updateGitignore(this.projectPath, this.gitignorePaths);
      this.gitignorePaths = [];
      await this.refresh();
    },
    async commit() {
      if (!this.backend || !this.message.trim()) return;
      await this.backend.commitGitProject({
        projectPath: this.projectPath,
        message: this.message,
      });
      this.message = '';
      this.commitDialogVisible = false;
      await this.refresh();
    },
  },
};
</script>

<style scoped>
.changes-card {
  width: 90vw;
  max-width: 1000px;
}

.changes-panes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.pane-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 2.5rem;
  margin-bottom: 0.5rem;
}

.pane-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.file-list {
  min-height: 12rem;
  max-height: 50vh;
  overflow-y: auto;
}

.file-actions {
  flex-direction: row;
  gap: 0.25rem;
}

.commit-card {
  min-width: 30rem;
}

@media (max-width: 700px) {
  .changes-panes {
    grid-template-columns: 1fr;
  }
}
</style>
