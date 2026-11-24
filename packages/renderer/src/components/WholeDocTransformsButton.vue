<template>
  <q-btn-group v-if="transforms.length > 0" class="toolbar-button">
    <q-btn
      dense
      size="sm"
      color="grey-5"
      title="whole-document transformation"
      @click="mainClicked"
    >
      <q-circular-progress
        v-if="remoteWorkInProgress"
        indeterminate
        rounded
        color="red"
      />
      <q-icon v-else name="document_transform" />
    </q-btn>
    <q-btn-dropdown
      ref="menu"
      dense
      size="sm"
      color="grey-5"
      dropdown-icon="menu_down"
      title="make a transformation of the whole document"
    >
      <q-list>
        <q-item
          v-for="(t, index) in transforms"
          :key="index"
          :title="t.description"
          clickable
          v-close-popup
          density="compact"
          dense
          @click="transformWith(t)"
        >
          <q-item-section avatar>
            <q-icon name="play_box_outline" />
          </q-item-section>
          <q-item-section :title="t.description">{{ t.name }}</q-item-section>
          <q-item-section v-if="hasParameters(t)" side>
            <q-btn
              dense
              flat
              round
              icon="play_box_edit_outline"
              :title="$t('transformationParameters.edit')"
              @click.stop="editParameters(t)"
            />
          </q-item-section>
        </q-item>
      </q-list>
    </q-btn-dropdown>
  </q-btn-group>
  <TransformationDialog
    :visible="dialogVisible"
    :active="remoteWorkInProgress"
    :failed="transformationFailed"
    :transformation-name="transformationName"
    :log="transformationLog"
    @close="dialogVisible = false"
    @stop="stopTransformation"
  />
  <q-dialog v-model="parameterDialogVisible" persistent>
    <q-card style="width: 36rem; max-width: 90vw">
      <q-card-section class="text-h6">
        {{
          $t('transformationParameters.title', { name: pendingTransform?.name })
        }}
      </q-card-section>
      <q-card-section>
        <div class="text-body2 q-mb-md">
          {{
            $t(
              editingParameters
                ? 'transformationParameters.availableMessage'
                : 'transformationParameters.requiredMessage',
            )
          }}
        </div>
        <div
          v-for="parameter in pendingParameters"
          :key="`${parameter.scope}-${parameter.filterIndex ?? 'transform'}-${parameter.kind}-${parameter.index}`"
          class="q-mb-md"
        >
          <q-checkbox
            v-if="parameter.type === 'boolean'"
            :model-value="parameter.value === true"
            @update:model-value="parameter.value = $event"
            :label="`${$t(`transformationParameters.${parameter.kind}`)}: ${parameter.parameter.name}`"
            :title="parameter.parameter.description"
          />
          <q-input
            v-else
            :model-value="
              typeof parameter.value === 'string' ? parameter.value : ''
            "
            @update:model-value="
              parameter.value =
                typeof $event === 'string' ? $event : String($event ?? '')
            "
            :label="`${$t(`transformationParameters.${parameter.kind}`)}: ${parameter.parameter.name}`"
            :hint="parameter.parameter.description"
            :persistent-hint="!!parameter.parameter.description"
            :rules="[(value) => parameterValueRule(value, parameter.type)]"
            autofocus
          />
        </div>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          :label="$t('transformationParameters.cancel')"
          @click="cancelParameterDialog"
        />
        <q-btn
          color="primary"
          :label="$t('transformationParameters.proceed')"
          :disable="!canProceedWithParameters"
          @click="proceedWithParameters"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { setupQuasarIcons } from './helpers';
setupQuasarIcons();
</script>

<script lang="ts">
import { mapState } from 'pinia';
import { useActions, useBackend } from '../stores';
import { ACTION_DOCUMENT_TRANSFORM, setActionCommand } from '../actions';
import { getPandocFilterTransforms } from '../common';
import type {
  PandocParameter,
  PandocParameterType,
  PandocFilterTransform,
  TransformDocumentActionProps,
} from '../common';
import { pandocParameterType } from '../common';
import { editorKeyFromState, getEditorConfiguration } from '../schema';
import TransformationDialog from './TransformationDialog.vue';

export default {
  components: { TransformationDialog },
  props: ['editor', 'transformationLog', 'transformationFailed'],
  computed: {
    ...mapState(useActions, ['remoteWorkInProgress']),
    ...mapState(useBackend, ['backend']),
    configuration() {
      return getEditorConfiguration(this.editor);
    },
    transforms() {
      return getPandocFilterTransforms(this.configuration);
    },
    canProceedWithParameters() {
      return this.pendingParameters.every(isPendingParameterValid);
    },
  },
  data() {
    return {
      dialogVisible: false,
      transformationName: undefined as string | undefined,
      hideDialogTimer: undefined as ReturnType<typeof setTimeout> | undefined,
      parameterDialogVisible: false,
      editingParameters: false,
      pendingTransform: undefined as PandocFilterTransform | undefined,
      pendingParameters: [] as PendingParameter[],
    };
  },
  watch: {
    remoteWorkInProgress(active: boolean) {
      if (active || this.transformationFailed || !this.dialogVisible) return;
      this.hideDialogTimer = setTimeout(() => {
        this.dialogVisible = false;
        this.hideDialogTimer = undefined;
      }, 1000);
    },
  },
  beforeUnmount() {
    if (this.hideDialogTimer) clearTimeout(this.hideDialogTimer);
  },
  methods: {
    hasParameters(transform: PandocFilterTransform) {
      return Boolean(
        transform.metadata?.length ||
        transform.variables?.length ||
        transform.filters.some(
          (filter) =>
            typeof filter !== 'string' &&
            (filter.metadata?.length || filter.variables?.length),
        ),
      );
    },
    mainClicked() {
      if (this.remoteWorkInProgress) {
        this.dialogVisible = true;
      } else {
        (this.$refs.menu as { show: () => void } | undefined)?.show();
      }
    },
    transformWith(transform: PandocFilterTransform) {
      const pendingParameters = this.undefinedParameters(transform);
      if (pendingParameters.length > 0) {
        this.pendingTransform = transform;
        this.pendingParameters = pendingParameters;
        this.editingParameters = false;
        this.parameterDialogVisible = true;
        return;
      }
      this.startTransform(transform);
    },
    editParameters(transform: PandocFilterTransform) {
      this.pendingTransform = transform;
      this.pendingParameters = this.parameters(transform, true);
      this.editingParameters = true;
      this.parameterDialogVisible = true;
    },
    startTransform(transform: PandocFilterTransform) {
      if (this.hideDialogTimer) clearTimeout(this.hideDialogTimer);
      this.hideDialogTimer = undefined;
      this.dialogVisible = true;
      this.transformationName = transform.name;
      setActionCommand(this.editor.state, ACTION_DOCUMENT_TRANSFORM, {
        transform,
      } as TransformDocumentActionProps);
    },
    undefinedParameters(transform: PandocFilterTransform): PendingParameter[] {
      return this.parameters(transform, false);
    },
    parameters(
      transform: PandocFilterTransform,
      includeDefined: boolean,
    ): PendingParameter[] {
      const pending: PendingParameter[] = [];
      this.collectUndefinedParameters(
        pending,
        transform.metadata,
        'transform',
        'metadata',
        undefined,
        includeDefined,
      );
      this.collectUndefinedParameters(
        pending,
        transform.variables,
        'transform',
        'variables',
        undefined,
        includeDefined,
      );
      transform.filters.forEach((filter, filterIndex) => {
        if (typeof filter === 'string') return;
        this.collectUndefinedParameters(
          pending,
          filter.metadata,
          'filter',
          'metadata',
          filterIndex,
          includeDefined,
        );
        this.collectUndefinedParameters(
          pending,
          filter.variables,
          'filter',
          'variables',
          filterIndex,
          includeDefined,
        );
      });
      return pending;
    },
    collectUndefinedParameters(
      pending: PendingParameter[],
      parameters: PandocParameter[] | undefined,
      scope: 'transform' | 'filter',
      kind: 'metadata' | 'variables',
      filterIndex?: number,
      includeDefined = false,
    ) {
      parameters?.forEach((parameter, index) => {
        if (includeDefined || parameter.value === undefined) {
          const type = pandocParameterType(parameter);
          pending.push({
            scope,
            filterIndex,
            kind,
            index,
            parameter,
            type,
            value:
              type === 'boolean'
                ? parameter.value === true
                : type === 'json'
                  ? parameter.value === undefined
                    ? ''
                    : JSON.stringify(parameter.value)
                  : parameter.value === undefined
                    ? ''
                    : String(parameter.value),
          });
        }
      });
    },
    parameterValueRule(
      value: string,
      type: PandocParameterType,
    ): boolean | string {
      if (!value.trim())
        return String(this.$t('transformationParameters.required'));
      if (type === 'json' && parseJsonParameter(value) === undefined)
        return String(this.$t('transformationParameters.invalidJson'));
      return true;
    },
    cancelParameterDialog() {
      this.parameterDialogVisible = false;
      this.editingParameters = false;
      this.pendingTransform = undefined;
      this.pendingParameters = [];
    },
    proceedWithParameters() {
      const transform = this.pendingTransform;
      if (!transform || !this.canProceedWithParameters) return;
      const updatedTransform: PandocFilterTransform = {
        ...transform,
        metadata: this.updatedParameters(
          transform.metadata,
          'transform',
          'metadata',
        ),
        variables: this.updatedParameters(
          transform.variables,
          'transform',
          'variables',
        ),
        filters: transform.filters.map((filter, filterIndex) =>
          typeof filter === 'string'
            ? filter
            : {
                ...filter,
                metadata: this.updatedParameters(
                  filter.metadata,
                  'filter',
                  'metadata',
                  filterIndex,
                ),
                variables: this.updatedParameters(
                  filter.variables,
                  'filter',
                  'variables',
                  filterIndex,
                ),
              },
        ),
      };
      this.cancelParameterDialog();
      this.startTransform(updatedTransform);
    },
    updatedParameters(
      parameters: PandocParameter[] | undefined,
      scope: 'transform' | 'filter',
      kind: 'metadata' | 'variables',
      filterIndex?: number,
    ): PandocParameter[] | undefined {
      return parameters?.map((parameter, index) => {
        const pending = this.pendingParameters.find(
          (item) =>
            item.scope === scope &&
            item.filterIndex === filterIndex &&
            item.kind === kind &&
            item.index === index,
        );
        if (!pending) return parameter;
        const value =
          pending.type === 'json'
            ? typeof pending.value === 'string'
              ? parseJsonParameter(pending.value)
              : undefined
            : pending.value;
        return value === undefined
          ? parameter
          : { ...parameter, type: pending.type, value };
      });
    },
    async stopTransformation() {
      const editorKey = editorKeyFromState(this.editor?.state);
      if (!editorKey) return;
      await this.backend?.stopTransformation(editorKey);
    },
  },
};

type PendingParameter = {
  scope: 'transform' | 'filter';
  filterIndex?: number;
  kind: 'metadata' | 'variables';
  index: number;
  parameter: PandocParameter;
  type: PandocParameterType;
  value: string | boolean;
};

function parseJsonParameter(
  value: string,
): Record<string, unknown> | undefined {
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

function isPendingParameterValid(parameter: PendingParameter): boolean {
  if (parameter.type === 'boolean') return true;
  if (typeof parameter.value !== 'string' || !parameter.value.trim())
    return false;
  return (
    parameter.type !== 'json' ||
    parseJsonParameter(parameter.value) !== undefined
  );
}
</script>
