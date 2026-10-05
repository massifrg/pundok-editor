<template>
  <q-dialog :model-value="visible" full-width full-height @hide="onCancel">
    <q-card class="configuration-editor-dialog">
      <q-card-section>
        <div class="text-h6">{{ $t('configEditor.title') }}</div>
      </q-card-section>

      <q-card-section class="configuration-editor-dialog__body">
        <q-tabs v-model="activeTab" vertical class="configuration-editor-dialog__tabs text-primary" outside-arrows
          mobile-arrows>
          <q-tab v-for="tab in tabs" :key="tab.name" :name="tab.name" :label="$t(tab.label)" />
        </q-tabs>

        <q-separator vertical />

        <q-tab-panels v-model="activeTab" animated class="configuration-editor-dialog__panels">
          <q-tab-panel v-for="tab in tabs" :key="tab.name" :name="tab.name">
            <ProjectConfigurationsEditor v-if="tab.name === 'project-configurations'" v-model="chosenConfigurations" />
            <CustomStylesEditor v-else-if="tab.name === 'customStyles'" v-model="values.customStyles"
              :inherited="inheritedCustomStyles" />
            <CustomClassesEditor v-else-if="tab.name === 'customClasses'" v-model="values.customClasses"
              :inherited="inheritedCustomClasses" />
            <CustomAttributesEditor v-else-if="tab.name === 'customAttributes'" v-model="values.customAttributes"
              :inherited="inheritedCustomAttributes" />
            <CustomMetadataEditor v-else-if="tab.name === 'customMetadata'" v-model="values.customMetadata"
              :inherited="inheritedCustomMetadata" />
            <NoteStylesEditor v-else-if="tab.name === 'noteStyles'" v-model="values.noteStyles"
              :inherited="inheritedNoteStyles" />
            <CustomCssEditor v-else-if="tab.name === 'customCss'" v-model="values.customCss"
              :inherited="inheritedCustomCss" :editor="editor" :project="project"
              :configuration-name="configuration.name" />
            <IndicesEditor v-else-if="tab.name === 'indices'" v-model="values.indices" :inherited="inheritedIndices"
              :editor="editor" />
            <InputConvertersEditor v-else-if="tab.name === 'inputConverters'" v-model="values.inputConverters"
              :inherited="inheritedInputConverters" :editor="editor" />
            <RawElementsEditor v-else-if="tab.name === 'raw-elements'" v-model="values" />
            <OutputConvertersEditor v-else-if="tab.name === 'outputConverters'" v-model="values.outputConverters"
              :inherited="inheritedOutputConverters" :resource-options="project ? { kind: 'filter', project } : undefined
                " :editor="editor" />
            <AutomationsEditor v-else-if="tab.name === 'automations'" v-model="values.automations" :editor="editor"
              :resource-options="project ? { kind: 'filter', project } : undefined
                " />
            <AutoDelimitersEditor v-else-if="tab.name === 'autoDelimiters'" v-model="values.autoDelimiters" />
            <div v-for="field in tab.fields" v-else :key="field.name" class="q-mb-md">
              <q-input               v-if="
                field.kind === 'text' &&
                field.name !== 'documentTemplate' &&
                field.name !== 'workingFormat' &&
                field.name !== 'copyFormat'
              " v-model="values[field.name]"
                :label="$t(field.label)" outlined :type="field.name === 'description' ? 'textarea' : 'text'"
                :hint="$t(field.description)" clearable                 />
                <div
                  v-else-if="
                    field.name === 'workingFormat' || field.name === 'copyFormat'
                  "
                  class="row q-col-gutter-md"
                >
                  <q-select
                    class="col"
                    :model-value="formatSelections[field.name]?.format"
                    :options="formatOptions"
                    emit-value
                    map-options
                    :label="$t(field.label)"
                    outlined
                    dense
                    @update:model-value="
                      updateFormatSelection(field.name, $event)
                    "
                  />
                  <PandocFormatExtensionsEditor
                    class="col"
                    :format="
                      pandocFormatForSelection(
                        formatSelections[field.name]?.format || '',
                      )
                    "
                    :model-value="formatSelections[field.name]?.extensions || []"
                    @update:model-value="updateFormatExtensions(field.name, $event)"
                  />
                </div>
                <q-select v-else-if="field.name === 'documentTemplate'" v-model="values.documentTemplate"
                :options="documentTemplateOptions" option-value="path" option-label="path" :label="$t(field.label)"
                :hint="$t(field.description)" outlined clearable>
                <template #option="scope">
                  <q-item v-bind="scope.itemProps">
                    <q-item-section>
                      <q-item-label>{{ resourceName(scope.opt.path) }}</q-item-label>
                      <q-item-label caption>
                        {{ templateSourceLabel(scope.opt) }}
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                </template>
                <template #append>
                  <q-btn flat round dense icon="document_open" :title="$t('configEditor.documentTemplate.choose')"
                    :loading="loadingDocumentTemplates" @click.stop="chooseDocumentTemplate" />
                </template>
              </q-select>
              <MainFormatsEditor
                v-else-if="field.name === 'mainFormats'"
                v-model="values.mainFormats"
                :options="mainFormatOptions"
              />
              <q-toggle v-else-if="field.kind === 'boolean'" v-model="values[field.name]" :label="$t(field.label)"
                :hint="$t(field.description)" />
              <q-input v-else v-model="jsonValues[field.name]" :label="$t(field.label)" type="textarea" outlined
                autogrow :hint="$t(field.description)" :error="!!jsonErrors[field.name]"
                :error-message="jsonErrors[field.name]" @update:model-value="clearJsonError(field.name)" />
            </div>
            <div v-if="tab.name === 'general'" class="q-mb-md">
              <q-input :model-value="rootDocument" :label="$t('configEditor.general.rootDocument')"
                :hint="$t('configEditor.general.rootDocumentDescription')" outlined readonly>
                <template #append>
                  <q-btn flat round dense icon="document_open" :title="$t('configEditor.general.chooseRootDocument')"
                    :disable="!project" @click="selectRootDocument" />
                </template>
              </q-input>
            </div>
          </q-tab-panel>
        </q-tab-panels>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn :label="$t('configEditor.buttons.cancel')" @click="onCancel" />
        <q-btn :label="$t('configEditor.buttons.save')" color="primary" @click="onSave" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { setupQuasarIcons } from './helpers';

setupQuasarIcons();
</script>

<script lang="ts">
import type { PropType } from 'vue';
import { mapState } from 'pinia';
import type { Editor } from '@tiptap/vue-3';
import { parse as parsePath } from 'path-browserify';
import type {
  CustomAttribute,
  CustomClass,
  CustomMetadata,
  CustomStyleDef,
  InputConverter,
  Index,
  NoteStyle,
  OutputConverter,
  PundokEditorConfigInit,
  PundokEditorProject,
  ResourceFile,
} from '../common';
import { DEFAULT_MAIN_FORMATS, pandocFormatsDefs } from '../common';
import ProjectConfigurationsEditor from './confeditors/ProjectConfigurationsEditor.vue';
import CustomStylesEditor from './confeditors/CustomStylesEditor.vue';
import CustomClassesEditor from './confeditors/CustomClassesEditor.vue';
import CustomAttributesEditor from './confeditors/CustomAttributesEditor.vue';
import CustomMetadataEditor from './confeditors/CustomMetadataEditor.vue';
import NoteStylesEditor from './confeditors/NoteStylesEditor.vue';
import CustomCssEditor from './confeditors/CustomCssEditor.vue';
import IndicesEditor from './confeditors/IndicesEditor.vue';
import InputConvertersEditor from './confeditors/InputConvertersEditor.vue';
import RawElementsEditor from './confeditors/RawElementsEditor.vue';
import OutputConvertersEditor from './confeditors/OutputConvertersEditor.vue';
import AutomationsEditor from './confeditors/AutomationsEditor.vue';
import AutoDelimitersEditor from './confeditors/AutoDelimitersEditor.vue';
import PandocFormatExtensionsEditor from './confeditors/PandocFormatExtensionsEditor.vue';
import MainFormatsEditor from './confeditors/MainFormatsEditor.vue';
import { showOpenDocumentDialog } from './helpers';
import { useBackend } from '../stores';

type EditorConfigField = {
  name: keyof PundokEditorConfigInit;
  label: string;
  description: string;
  kind:
  | 'text'
  | 'boolean'
  | 'json'
  | 'customStyles'
  | 'customClasses'
  | 'customAttributes'
  | 'customMetadata'
  | 'noteStyles'
  | 'customCss'
  | 'indices'
  | 'inputConverters'
  | 'outputConverters'
  | 'automations'
  | 'rawElements'
  | 'autoDelimiters';
};

type EditorConfigTab = {
  name: string;
  label: string;
  fields: EditorConfigField[];
};

type InheritedItems = {
  customStyles: CustomStyleDef[];
  customClasses: CustomClass[];
  customAttributes: CustomAttribute[];
  customMetadata: CustomMetadata[];
  noteStyles: NoteStyle[];
  customCss: string[];
  indices: Index[];
  outputConverters: OutputConverter[];
  inputConverters: InputConverter[];
};

const fields: EditorConfigField[] = [
  {
    name: 'name',
    label: 'configEditor.general.name',
    description: 'configEditor.general.nameDescription',
    kind: 'text',
  },
  {
    name: 'description',
    label: 'configEditor.general.description',
    description: 'configEditor.general.descriptionDescription',
    kind: 'text',
  },
  // { name: 'tiptap', label: 'configEditor.general.tiptap', description: 'configEditor.general.tiptapDescription', kind: 'json' },
  {
    name: 'workingFormat',
    label: 'configEditor.fileFormats.workingFormat',
    description: 'configEditor.fileFormats.workingFormatDescription',
    kind: 'text',
  },
  {
    name: 'copyFormat',
    label: 'configEditor.fileFormats.copyFormat',
    description: 'configEditor.fileFormats.copyFormatDescription',
    kind: 'text',
  },
  {
    name: 'mainFormats',
    label: 'configEditor.fileFormats.mainFormats',
    description: 'configEditor.fileFormats.mainFormatsDescription',
    kind: 'json',
  },
  {
    name: 'documentTemplate',
    label: 'configEditor.documentTemplate.label',
    description: 'configEditor.documentTemplate.description',
    kind: 'text',
  },
  {
    name: 'autoDelimiters',
    label: 'configEditor.autoDelimiters.label',
    description: 'configEditor.autoDelimiters.description',
    kind: 'autoDelimiters',
  },
  {
    name: 'customStyles',
    label: 'configEditor.customStyles.label',
    description: 'configEditor.customStyles.description',
    kind: 'customStyles',
  },
  {
    name: 'customClasses',
    label: 'configEditor.customClasses.label',
    description: 'configEditor.customClasses.description',
    kind: 'customClasses',
  },
  {
    name: 'customAttributes',
    label: 'configEditor.customAttributes.label',
    description: 'configEditor.customAttributes.description',
    kind: 'customAttributes',
  },
  {
    name: 'customMetadata',
    label: 'configEditor.customMetadata.label',
    description: 'configEditor.customMetadata.description',
    kind: 'customMetadata',
  },
  {
    name: 'noteStyles',
    label: 'configEditor.noteStyles.label',
    description: 'configEditor.noteStyles.description',
    kind: 'noteStyles',
  },
  {
    name: 'customCss',
    label: 'configEditor.customCss.label',
    description: 'configEditor.customCss.description',
    kind: 'json',
  },
  {
    name: 'indices',
    label: 'configEditor.indices.label',
    description: 'configEditor.indices.description',
    kind: 'indices',
  },
  {
    name: 'defaultRawFormat',
    label: 'configEditor.rawElements.defaultRawFormat',
    description: 'configEditor.rawElements.defaultRawFormatDescription',
    kind: 'text',
  },
  {
    name: 'rawInlines',
    label: 'configEditor.rawElements.rawInlines',
    description: 'configEditor.rawElements.rawInlinesDescription',
    kind: 'rawElements',
  },
  {
    name: 'rawBlocks',
    label: 'configEditor.rawElements.rawBlocks',
    description: 'configEditor.rawElements.rawBlocksDescription',
    kind: 'rawElements',
  },
  {
    name: 'inputConverters',
    label: 'configEditor.inputConverters.label',
    description: 'configEditor.inputConverters.description',
    kind: 'inputConverters',
  },
  {
    name: 'outputConverters',
    label: 'configEditor.outputConverters.label',
    description: 'configEditor.outputConverters.description',
    kind: 'outputConverters',
  },
  {
    name: 'automations',
    label: 'configEditor.automations.label',
    description: 'configEditor.automations.description',
    kind: 'automations',
  },
];

const groupedFields = (names: (keyof PundokEditorConfigInit)[]) =>
  names.map((name) => fields.find((field) => field.name === name)!);

const tabs: EditorConfigTab[] = [
  {
    name: 'general',
    label: 'configEditor.tabs.general',
    fields: groupedFields([
      'name',
      'description',
      /* 'tiptap', */
    ]),
  },
  {
    name: 'project-configurations',
    label: 'configEditor.tabs.projectConfigurations',
    fields: [],
  },
  {
    name: 'file-formats',
    label: 'configEditor.tabs.documentTypes',
    fields: groupedFields([
      'workingFormat',
      'copyFormat',
      'mainFormats',
      'documentTemplate',
    ]),
  },
  ...fields
    .filter(
      (field) =>
        ![
          'name',
          'description',
          // 'tiptap',
          'workingFormat',
          'copyFormat',
          'mainFormats',
          'documentTemplate',
          'defaultRawFormat',
          'rawInlines',
          'rawBlocks',
        ].includes(field.name),
    )
    .map((field) => ({
      name: field.name,
      label: `configEditor.tabs.${field.name}`,
      fields: [field],
    })),
  {
    name: 'raw-elements',
    label: 'configEditor.tabs.rawElements',
    fields: groupedFields(['defaultRawFormat', 'rawInlines', 'rawBlocks']),
  },
];

export default {
  props: {
    visible: { type: Boolean, default: false },
    configuration: { type: Object, default: () => ({}) },
    projectConfigurations: { type: Array, default: () => [] },
    project: {
      type: Object as PropType<PundokEditorProject | undefined>,
      default: undefined,
    },
    editor: { type: Object as PropType<Editor>, default: undefined },
  },
  emits: ['save', 'close'],
  components: {
    ProjectConfigurationsEditor,
    CustomStylesEditor,
    CustomClassesEditor,
    CustomAttributesEditor,
    CustomMetadataEditor,
    NoteStylesEditor,
    CustomCssEditor,
    IndicesEditor,
    InputConvertersEditor,
    RawElementsEditor,
    OutputConvertersEditor,
    AutomationsEditor,
    AutoDelimitersEditor,
    PandocFormatExtensionsEditor,
    MainFormatsEditor,
  },
  data() {
    return {
      fields,
      tabs,
      activeTab: tabs[0].name,
      chosenConfigurations: [] as string[],
      rootDocument: '',
      documentTemplateOptions: [] as ResourceFile[],
      loadingDocumentTemplates: false,
      formatSelections: {} as Record<
        string,
        { format: string; extensions: string[] }
      >,
      mainFormatOptions: [] as Array<{
        label: string;
        value: string;
        pandocFormat: string;
        source: string;
        color: string;
      }>,
      values: {} as Record<string, any>,
      jsonValues: {} as Record<string, string>,
      jsonErrors: {} as Record<string, string>,
    };
  },
  computed: {
    ...mapState(useBackend, ['backend']),
    inheritedCustomStyles(): NonNullable<
      PundokEditorProject['computedConfig']
    >['customStyles'] {
      return this.inheritedItems('customStyles');
    },
    inheritedCustomClasses(): NonNullable<
      PundokEditorProject['computedConfig']
    >['customClasses'] {
      return this.inheritedItems('customClasses');
    },
    inheritedCustomAttributes(): NonNullable<
      PundokEditorProject['computedConfig']
    >['customAttributes'] {
      return this.inheritedItems('customAttributes');
    },
    inheritedCustomMetadata(): NonNullable<
      PundokEditorProject['computedConfig']
    >['customMetadata'] {
      return this.inheritedItems('customMetadata');
    },
    inheritedNoteStyles(): NonNullable<
      PundokEditorProject['computedConfig']
    >['noteStyles'] {
      return this.inheritedItems('noteStyles');
    },
    inheritedCustomCss(): string[] {
      const computed = this.project?.computedConfig?.customCss || [];
      const local = this.configuration.customCss || [];
      return computed.filter((filename) => !local.includes(filename));
    },
    inheritedIndices(): NonNullable<
      PundokEditorProject['computedConfig']
    >['indices'] {
      return this.inheritedItems('indices');
    },
    inheritedOutputConverters(): NonNullable<
      PundokEditorProject['computedConfig']
    >['outputConverters'] {
      return this.inheritedItems('outputConverters');
    },
    inheritedInputConverters(): NonNullable<
      PundokEditorProject['computedConfig']
    >['inputConverters'] {
      return this.inheritedItems('inputConverters');
    },
    formatOptions() {
      const options = Object.entries(pandocFormatsDefs)
        .filter(
          ([, format]) => format.input === true && format.output === true,
        )
        .map(([name, format]) => ({
          label: format.description ? `${name} - ${format.description}` : name,
          value: name,
        }));
      const inputNames = new Set(
        this.project?.computedConfig?.inputConverters?.map(
          (converter) => converter.name,
        ),
      );
      const converterOptions = (
        this.project?.computedConfig?.outputConverters || []
      )
        .filter((converter) => inputNames.has(converter.name))
        .map((converter) => ({
          label: `${converter.name} - ${
            converter.description || converter.format
          }`,
          value: converter.name,
        }));
      return [...options, ...converterOptions].filter(
        (option, index, all) =>
          all.findIndex((candidate) => candidate.value === option.value) ===
          index,
      );
    },
  },
  watch: {
    visible(value: boolean) {
      if (value) this.loadConfiguration();
    },
  },
  mounted() {
    if (this.visible) this.loadConfiguration();
  },
  methods: {
    inheritedItems<K extends keyof InheritedItems>(
      field: K,
    ): InheritedItems[K] {
      const computed = (this.project?.computedConfig?.[field] ||
        []) as InheritedItems[K];
      const local = ((this.configuration as Partial<InheritedItems>)[field] ||
        []) as InheritedItems[K];
      return computed.filter(
        (item) =>
          !local.some((localItem) => {
            const localKey =
              field === 'noteStyles'
                ? (localItem as NoteStyle).noteType
                : field === 'indices'
                  ? (localItem as Index).indexName
                  : (localItem as { name: string }).name;
            const itemKey =
              field === 'noteStyles'
                ? (item as NoteStyle).noteType
                : field === 'indices'
                  ? (item as Index).indexName
                  : (item as { name: string }).name;
            return localKey === itemKey;
          }),
      ) as InheritedItems[K];
    },
    loadConfiguration() {
      const source = this.configuration as Partial<PundokEditorConfigInit>;
      this.chosenConfigurations = [...(this.projectConfigurations as string[])];
      this.rootDocument = this.project?.rootDocument || '';
      const values: Record<string, any> = {};
      const jsonValues: Record<string, string> = {};
      fields.forEach((field) => {
        const value =
          field.name === 'name' || field.name === 'description'
            ? this.project?.[field.name]
            : source[field.name];
        if (field.kind === 'json') {
          jsonValues[field.name] = JSON.stringify(
            value === undefined ? null : value,
            null,
            2,
          );
          if (field.name === 'mainFormats') {
            values[field.name] =
              field.name === 'mainFormats' && Array.isArray(value) && value.length
                ? [...value]
                : field.name === 'mainFormats'
                  ? [...DEFAULT_MAIN_FORMATS]
                  : [];
          }
        } else if (
          field.name === 'customStyles' ||
          field.name === 'customClasses' ||
          field.name === 'customAttributes' ||
          field.name === 'customMetadata' ||
          field.name === 'noteStyles' ||
          field.name === 'customCss' ||
          field.name === 'indices' ||
          field.name === 'inputConverters' ||
          field.name === 'outputConverters' ||
          field.name === 'automations' ||
          field.name === 'rawInlines' ||
          field.name === 'rawBlocks'
        ) {
          values[field.name] = value || [];
        } else if (field.name === 'autoDelimiters') {
          values[field.name] = value;
        } else {
          values[field.name] = value;
        }
      });
      this.values = values;
      this.formatSelections = {};
      for (const fieldName of ['workingFormat', 'copyFormat']) {
        const value = String(values[fieldName] || '');
        const [format, ...extensionParts] = value.split(/(?=[+-])/);
        const extensions = extensionParts.filter(Boolean);
        this.formatSelections[fieldName] = { format, extensions };
      }
      this.jsonValues = jsonValues;
      this.jsonErrors = {};
      this.activeTab = tabs[0].name;
      void this.loadDocumentTemplates();
      void this.loadMainFormatOptions();
    },
    updateFormatSelection(fieldName: string, format: string) {
      this.formatSelections[fieldName] = { format, extensions: [] };
      this.values[fieldName] = format;
    },
    pandocFormatForSelection(format: string): string {
      return (
        this.project?.computedConfig?.outputConverters?.find(
          (converter) => converter.name === format,
        )?.format || format
      );
    },
    updateFormatExtensions(fieldName: string, extensions?: string[]) {
      const selection = this.formatSelections[fieldName];
      if (!selection) return;
      selection.extensions = extensions || [];
      this.values[fieldName] = `${selection.format}${selection.extensions.join('')}`;
    },
    clearJsonError(fieldName: string) {
      if (this.jsonErrors[fieldName]) {
        const errors = { ...this.jsonErrors };
        delete errors[fieldName];
        this.jsonErrors = errors;
      }
    },
    selectRootDocument() {
      if (!this.editor || !this.project) return;
      const rootPath = this.project.rootDocument
        ? parsePath(`${this.project.path}/${this.project.rootDocument}`)
        : undefined;
      showOpenDocumentDialog({
        editor: this.editor,
        options: {
          prompt: this.$t('configEditor.general.chooseRootDocument'),
          startFolder: rootPath?.dir || this.project.path,
          startFilename: rootPath?.base,
        },
        callback: ({ path }) => {
          if (!path) return;
          const { dir, base } = parsePath(path);
          if (dir === this.project?.path) {
            this.rootDocument = base;
          } else {
            this.$q.notify({
              type: 'negative',
              message: this.$t(
                'configEditor.general.rootDocumentProjectFolder',
              ),
            });
          }
        },
      });
    },
    async loadDocumentTemplates() {
      this.documentTemplateOptions = [];
      if (!this.project || !this.backend) return;
      this.loadingDocumentTemplates = true;
      try {
        const resources = (
          await Promise.all(
            (this.project.configurations || []).map((configurationName) =>
              this.backend!.findResourceFiles(/.+/, {
                kind: 'template',
                project: this.project!,
                configurationName,
                searchMode: 'loose',
                filterSearchTerms: [],
              }),
            ),
          )
        ).flat();
        const options = resources.filter(
          (resource: ResourceFile) =>
            resource.provenance === 'configuration' &&
            !!resource.configurationName &&
            resource.path
              .replaceAll('\\', '/')
              .split('/')
              .includes('templates'),
        );
        this.documentTemplateOptions = options.filter(
          (resource, index) =>
            options.findIndex(
              (candidate) =>
                candidate.path === resource.path &&
                candidate.configurationName === resource.configurationName,
            ) === index,
        );
      } finally {
        this.loadingDocumentTemplates = false;
      }
    },
    async loadMainFormatOptions() {
      const sourceOptions = new Map<string, { source: string; color: string }>();
      const options = Object.entries(pandocFormatsDefs)
        .filter(([, format]) => format.input === true || format.output === true)
        .map(([name, format]) => ({
          label: format.description ? `${name} - ${format.description}` : name,
          value: name,
          pandocFormat: name,
          source: 'Editor',
          color: '#eeeeee',
        }));
      if (this.backend && this.project) {
        for (const configurationName of this.project.configurations || []) {
          const configuration = await this.backend.configuration(configurationName);
          for (const converter of [
            ...(configuration.inputConverters || []),
            ...(configuration.outputConverters || []),
          ]) {
            sourceOptions.set(converter.name, {
              source: configurationName,
              color: '#e8f5e9',
            });
          }
        }
      }
      for (const converter of [
        ...(this.configuration.inputConverters || []),
        ...(this.configuration.outputConverters || []),
      ]) {
        sourceOptions.set(converter.name, {
          source: 'Project',
          color: '#e3f2fd',
        });
      }
      const converterOptions = [
        ...(this.project?.computedConfig?.inputConverters || []),
        ...(this.project?.computedConfig?.outputConverters || []),
      ].map((converter) => {
        const source = sourceOptions.get(converter.name) || {
          source: 'Editor',
          color: '#eeeeee',
        };
        return {
          label: `${converter.name} - ${
            converter.description ||
            ('format' in converter ? converter.format : converter.name)
          }`,
          value: converter.name,
          pandocFormat:
            'format' in converter
              ? converter.format || converter.name
              : converter.name,
          ...source,
        };
      });
      this.mainFormatOptions = [...options, ...converterOptions].filter(
        (option, index, all) =>
          all.findIndex((candidate) => candidate.value === option.value) ===
          index,
      );
    },
    async chooseDocumentTemplate() {
      if (!this.editor || !this.project) return;
      let startFolder = this.values.documentTemplate
        ? parsePath(this.values.documentTemplate).dir
        : this.project.path;
      if (!this.values.documentTemplate && this.backend) {
        const templatesFolder = `${this.project.path}/templates`;
        try {
          await this.backend.getFolderContents({
            path: `file://${templatesFolder}`,
          });
          startFolder = templatesFolder;
        } catch {
          // Fall back to the project directory when no templates directory exists.
        }
      }
      showOpenDocumentDialog({
        editor: this.editor,
        options: {
          prompt: this.$t('configEditor.documentTemplate.choose'),
          startFolder,
        },
        callback: ({ path }) => {
          if (path) {
            this.values.documentTemplate = path;
          }
        },
      });
    },
    resourceName(path: string): string {
      return path.replace(/^.*[\\/]/, '');
    },
    templateSourceLabel(resource: ResourceFile): string {
      return `${this.$t(
        'configEditor.outputConverters.pandocResources.provenance.configuration',
      )}: ${resource.configurationName}`;
    },
    onCancel() {
      this.$emit('close');
    },
    onSave() {
      const { name, description, ...editorConfigValues } = this.values;
      if (Array.isArray(this.values.mainFormats)) {
        this.jsonValues.mainFormats = JSON.stringify(this.values.mainFormats);
      }
      const editorConfig: Record<string, any> = {
        ...(this.configuration as Record<string, any>),
        ...editorConfigValues,
      };
      const errors: Record<string, string> = {};
      fields
        .filter((field) => field.kind === 'json')
        .forEach((field) => {
          try {
            const parsed = JSON.parse(this.jsonValues[field.name]);
            if (parsed === null) {
              delete editorConfig[field.name];
            } else {
              editorConfig[field.name] = parsed;
            }
          } catch {
            errors[field.name] = 'Enter valid JSON.';
          }
        });
      if (Object.keys(errors).length > 0) {
        this.jsonErrors = errors;
        const errorField = Object.keys(errors)[0];
        this.activeTab =
          tabs.find((tab) =>
            tab.fields.some((field) => field.name === errorField),
          )?.name || tabs[0].name;
        return;
      }
      Object.keys(editorConfig).forEach((key) => {
        if (editorConfig[key] === undefined || editorConfig[key] === '')
          delete editorConfig[key];
      });
      this.$emit('save', {
        ...(this.project as PundokEditorProject),
        name,
        description,
        editorConfig,
        configurations: [...this.chosenConfigurations],
        rootDocument: this.rootDocument,
      });
      this.$emit('close');
    },
  },
};
</script>

<style scoped>
.configuration-editor-dialog {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.configuration-editor-dialog__body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: row;
}

.configuration-editor-dialog__tabs {
  flex: 0 0 16rem;
  overflow-y: auto;
}

.configuration-editor-dialog__panels {
  flex: 1;
  overflow: auto;
}
</style>
