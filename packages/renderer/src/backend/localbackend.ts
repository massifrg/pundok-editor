import type {
  Backend,
  BackendConfig,
  Ipc,
  IpcRendererListener,
  WhyAskingForIdOrPath,
} from './backend';
import {
  type ConfigurationSummary,
  PandocEditorConfig,
  type SaveResponse,
  type StoredDoc,
  getHardcodedCustomCss,
  getHardcodedEditorConfig,
  HARDCODED_CONFIG_NAME,
  HARDCODED_CONFIG_DESC,
  PreviewOptions,
  Query,
  QueryResult,
  PandocEditorProject,
  EditorKeyType,
  ServerMessageSetConfiguration,
  ServerMessageSetProject,
  ServerMessageFeedback,
  ServerMessageContent,
  ServerMessageCommand,
  PandocEditorConfigInit,
  computeProjectConfiguration,
  FindResourceOptions,
  ReadDoc,
  ProjectComponent,
  DocumentContext,
  DocumentCoords,
  CompatibleDocumentContext,
  IpcRendererToMainChannel,
  IpcMainToRendererChannel,
  ServerMessageForViewer,
  PandocFilterTransform,
} from '../common';
import {
  ACTION_BACKEND_FEEDBACK,
  ACTION_BACKEND_SET_CONFIG_NAME,
  ACTION_BACKEND_SET_CONTENT,
  ACTION_BACKEND_SET_CONTENT_WITH_PROJECT,
  ACTION_BACKEND_SET_PROJECT,
  ACTION_DOCUMENT_EXPORT,
  ACTION_DOCUMENT_IMPORT,
  ACTION_DOCUMENT_OPEN,
  ACTION_DOCUMENT_SAVE,
  ACTION_DOCUMENT_SAVE_AS,
  BaseEditorAction,
  EditorAction,
  setActionSetupViewer,
} from '../actions';
import { useActions } from '../stores';
import { IPC_CHANNELS } from '../common';
import { isString } from 'lodash';

type Listener = () => void;

export class LocalBackend implements Backend {
  ipc?: Ipc;
  private listeners: Listener[] = [];

  constructor(config: BackendConfig) {
    this.ipc = config.ipc;
    this.registerListeners();
  }

  private registerListeners() {
    const ipc = this.ipc;
    if (ipc) {
      this.listeners.forEach((removeListener) => {
        removeListener();
      });

      let listeners: Listener[] = this.listeners;
      const addListener = (
        channel: IpcMainToRendererChannel,
        listener: IpcRendererListener,
      ) => {
        const l = ipc.on(channel, listener);
        if (l) {
          listeners.push(l);
        }
      };
      const actions = useActions();

      addListener(
        'set-configuration',
        (e: any, setConfigMsg: ServerMessageSetConfiguration) => {
          // this.setConfiguration(setConfig)
          const { editorKey, configurationName } = setConfigMsg;
          const action: EditorAction = {
            ...ACTION_BACKEND_SET_CONFIG_NAME,
            editorKey: editorKey!,
            props: { configurationName },
          };
          actions.setAction(action);
        },
      );

      addListener(
        'set-project',
        async (e: any, setProjectMsg: ServerMessageSetProject) => {
          let { editorKey, project } = setProjectMsg;
          project = await computeProjectConfiguration(
            project,
            getConfigurationFunction(this.ipc),
          );
          console.log(project);
          const action: EditorAction = {
            ...ACTION_BACKEND_SET_PROJECT,
            editorKey: editorKey!,
            props: { project },
          };
          actions.setAction(action);
        },
      );

      addListener('feedback', (e: any, feedbackMsg: ServerMessageFeedback) => {
        const { editorKey, feedback } = feedbackMsg;
        const action: EditorAction = {
          ...ACTION_BACKEND_FEEDBACK,
          editorKey: editorKey!,
          props: { feedback },
        };
        actions.setAction(action);
      });

      addListener(
        'content',
        async (e: any, contentMsg: ServerMessageContent) => {
          const { editorKey, content, project } = contentMsg;
          console.log(contentMsg);

          const project_with_conf: PandocEditorProject | undefined = project
            ? await computeProjectConfiguration(
                project,
                getConfigurationFunction(this.ipc),
              )
            : undefined;
          const action: EditorAction = project_with_conf
            ? {
                ...ACTION_BACKEND_SET_CONTENT_WITH_PROJECT,
                editorKey: editorKey!,
                props: {
                  project: project_with_conf,
                  configuration: project_with_conf.computedConfig,
                  content,
                },
              }
            : {
                ...ACTION_BACKEND_SET_CONTENT,
                editorKey: editorKey!,
                props: { content },
              };
          actions.setAction(action);
        },
      );

      addListener('document', (e: any, commandMsg: ServerMessageCommand) => {
        const { editorKey, command, path, configurationName } = commandMsg;
        let props: Record<string, any> = {};
        let baseAction: BaseEditorAction;
        switch (command) {
          case 'open':
            baseAction = ACTION_DOCUMENT_OPEN;
            props.context = {
              path,
              configurationName,
            } as DocumentContext;
            break;
          case 'save':
            baseAction = ACTION_DOCUMENT_SAVE;
            break;
          case 'save-as':
            baseAction = ACTION_DOCUMENT_SAVE_AS;
            break;
          case 'import':
            baseAction = ACTION_DOCUMENT_IMPORT;
            break;
          case 'export':
            baseAction = ACTION_DOCUMENT_EXPORT;
            break;
          default:
            return;
        }
        const action: EditorAction = {
          ...baseAction,
          editorKey: editorKey!,
          props,
        };
        if (action) actions.setAction(action);
      });

      addListener(
        'show-in-viewer',
        (e: any, message: ServerMessageForViewer) => {
          const editorKey = message.editorKey;
          console.log(message);
          setActionSetupViewer(editorKey!, message.setup);
        },
      );

      this.listeners = listeners;
    }
  }

  private async invokeIpc(
    channel: IpcRendererToMainChannel,
    ...args: any[]
  ): Promise<any> {
    const c = IPC_CHANNELS[channel];
    if (c && c.dir === 'r2m') return this.ipc?.invoke(channel, ...args);
    else
      return Promise.reject(
        `"${channel}" is not a valid <Renderer -> Main> channel`,
      );
  }

  loggedin() {
    return Promise.resolve(true);
  }

  login(user: string, password: string) {
    return Promise.resolve(true);
  }

  logout() {
    return Promise.resolve(false);
  }

  async editorReady(editorKey?: EditorKeyType) {
    this.invokeIpc('editor-ready', editorKey);
  }

  async open(context: DocumentContext): Promise<ReadDoc> {
    try {
      const { inputConverter, project } = context;
      return this.ipc?.invoke('open-document', {
        ...context,
        inputConverter: inputConverter && JSON.stringify(inputConverter),
        project: project && JSON.stringify(project),
      } as CompatibleDocumentContext);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  private doSave(
    doc: StoredDoc,
    project?: PandocEditorProject,
    editorKey?: EditorKeyType,
  ): Promise<SaveResponse> {
    const ipc = this.ipc;
    if (ipc) {
      return ipc.invoke(
        'save-document',
        JSON.stringify(doc),
        project && JSON.stringify(project),
        editorKey,
      );
    } else {
      throw new Error('Method not implemented.');
    }
  }

  save(
    doc: StoredDoc,
    project?: PandocEditorProject,
    editorKey?: EditorKeyType,
  ): Promise<SaveResponse> {
    let preview: Partial<PreviewOptions> | undefined = undefined;
    const openResult = doc.converter?.openResult;
    if (openResult)
      preview = {
        inPandocEditor: openResult === 'editor',
      };
    console.log(doc);
    return this.doSave({ ...doc /*, preview */ }, project, editorKey);
  }

  async debugInfo(): Promise<object> {
    return this.invokeIpc('debug-info');
  }

  async getProject(context: Record<string, any>): Promise<PandocEditorProject> {
    return this.invokeIpc('get-project', context);
  }

  async availableConfigurations(): Promise<ConfigurationSummary[]> {
    const ipc = this.ipc;
    let configs: ConfigurationSummary[] = [
      {
        name: HARDCODED_CONFIG_NAME,
        description: HARDCODED_CONFIG_DESC,
      },
    ];
    if (ipc) {
      const maybeConfigs = await ipc.invoke('available-configurations');
      configs = configs.concat(maybeConfigs || []);
    }
    return configs;
  }

  async configuration(name?: string): Promise<PandocEditorConfig> {
    if (!name || name === HARDCODED_CONFIG_NAME)
      return Promise.resolve(getHardcodedEditorConfig());
    const notFound = `Configuration "${name}" not found`;
    const ipc = this.ipc;
    if (ipc) {
      const configInit: PandocEditorConfigInit = await ipc.invoke(
        'load-configuration',
        name,
      );
      return configInit
        ? new PandocEditorConfig(configInit)
        : Promise.reject(notFound);
    } else {
      return Promise.reject(notFound);
    }
  }

  async getFileContents(
    filename: string,
    options?: Partial<FindResourceOptions>,
  ): Promise<string> {
    if (filename === 'custom.css') {
      return getHardcodedCustomCss();
    }
    return this.invokeIpc('file-contents', filename, options);
  }

  async setValue(key: string, value?: any): Promise<void> {
    this.invokeIpc('set-value', key, JSON.stringify(value));
  }

  async pandocInputFormats(): Promise<string[]> {
    return this.invokeIpc('pandoc-input-formats');
  }

  async pandocOutputFormats(): Promise<string[]> {
    return this.invokeIpc('pandoc-output-formats');
  }

  // async openViewer(
  //   docName: string,
  //   options?: Partial<FindResourceOptions>
  // ): Promise<void> {
  //   const opts = options?.project && !isString(options?.project)
  //     ? { ...options, project: JSON.stringify(options.project) }
  //     : options
  //   this.invokeIpc('open-viewer', docName, opts)
  // }

  async queryDatabase(query: Query): Promise<QueryResult[]> {
    try {
      return this.invokeIpc('query', JSON.stringify(query)) as Promise<
        QueryResult[]
      >;
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async getInclusionTree(
    project: PandocEditorProject,
  ): Promise<ProjectComponent | undefined> {
    const structure = await this.invokeIpc(
      'get-inclusion-tree',
      JSON.stringify(project),
    );
    if (structure) {
      return JSON.parse(structure) as ProjectComponent;
    }
    return undefined;
  }

  async askForDocumentIdOrPath(
    why: WhyAskingForIdOrPath,
    context?: DocumentContext,
  ): Promise<DocumentCoords | undefined> {
    const maybeProject = context?.project;
    const project = isString(maybeProject)
      ? (JSON.parse(maybeProject) as PandocEditorProject)
      : maybeProject;
    console.log(`asking for a filename relative to ${project?.path}`);
    return this.invokeIpc('ask-for-document', context?.editorKey, context?.id, {
      defaultPath: project?.path,
      title: why === 'inclusion' ? 'Include document' : 'Open document',
      buttonLabel: why === 'inclusion' ? 'Include' : undefined,
    });
  }

  async transformPandocJson(
    pandocJson: string | undefined,
    transform: PandocFilterTransform,
    options?: Partial<FindResourceOptions>,
  ): Promise<string> {
    return this.invokeIpc(
      'transform-json',
      pandocJson,
      JSON.stringify({ ...transform }),
      JSON.stringify(options || {}),
    );
  }
}

function getConfigurationFunction(ipc: any) {
  return async (name?: string) => {
    if (!name || name === HARDCODED_CONFIG_NAME)
      return Promise.resolve(getHardcodedEditorConfig());
    const notFound = `Configuration "${name}" not found`;
    if (ipc) {
      const configInit: PandocEditorConfigInit = await ipc.invoke(
        'load-configuration',
        name,
      );
      return configInit
        ? new PandocEditorConfig(configInit)
        : Promise.reject(notFound);
    } else {
      return Promise.reject(notFound);
    }
  };
}
