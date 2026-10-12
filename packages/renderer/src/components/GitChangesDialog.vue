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
            <div class="text-subtitle1 q-mb-sm">
              {{ $t('gitChangesDialog.unstagedFiles') }}
            </div>
            <q-list bordered separator class="file-list">
              <q-item
                v-for="file in unstagedFiles"
                :key="`unstaged-${file.path}`"
                :class="unstagedFileClass(file)"
              >
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
                    v-if="file.indexStatus === '?'"
                    flat
                    dense
                    :icon="
                      gitignorePaths.includes(file.path)
                        ? 'gitignore_remove'
                        : 'gitignore_add'
                    "
                    :title="
                      gitignorePaths.includes(file.path)
                        ? $t('gitChangesDialog.removeFromGitignore')
                        : $t('gitChangesDialog.addToGitignore')
                    "
                    @click="toggleGitignore(file.path)"
                  />
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
            <div class="text-subtitle1 q-mb-sm">
              {{ $t('gitChangesDialog.stagedFiles') }}
            </div>
            <q-list bordered separator class="file-list">
              <q-item
                v-for="file in stagedFiles"
                :key="`staged-${file.path}`"
                class="text-positive"
              >
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
  emits: ['close'],
  data() {
    return {
      status: { managed: false, files: [] } as GitProjectStatus,
      busyPaths: [] as string[],
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
  },
  watch: {
    visible(value: boolean) {
      if (value) {
        this.gitignorePaths = [];
        void this.refresh();
      }
    },
  },
  methods: {
    unstagedFileClass(file: GitStatusEntry): string {
      if (this.gitignorePaths.includes(file.path))
        return 'text-secondary text-strike';
      return file.indexStatus === '?' ? 'text-primary' : 'text-negative';
    },
    async refresh() {
      if (this.backend)
        this.status = await this.backend.gitProjectStatus(this.projectPath);
    },
    async initialize() {
      await this.backend?.initGitProject(this.projectPath);
      await this.refresh();
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
