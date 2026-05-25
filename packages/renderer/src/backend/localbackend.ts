import type {
  Backend,
  IpcRendererListener,
} from './backend';
import {
  type ConfigurationSummary,
  PundokEditorConfig,
  type SaveResponse,
  type CxDocument,
  getHardcodedCustomCss,
  getHardcodedEditorConfig,
  HARDCODED_CONFIG_NAME,
  HARDCODED_CONFIG_DESC,
  PreviewOptions,
  Query,
  QueryResult,
  PundokEditorProject,
  EditorKeyType,
  ServerMessageSetConfiguration,
  ServerMessageSetProject,
  ServerMessageFeedback,
  ServerMessageContent,
  ServerMessageCommand,
  PundokEditorConfigInit,
  computeProjectConfiguration,
  FindResourceOptions,
  ProjectComponent,
  DocumentContext,
  IpcRendererToMainChannel,
  IpcMainToRendererChannel,
  ServerMessageForViewer,
  PandocFilterTransform,
  SynctexInfo,
  RenderingJob,
  BackendFeedbackActionProps,
  BackendSetProjectActionProps,
  BackendSetConfigNameActionProps,
  BackendSetContentActionProps,
  BackendSetContentWithProjectActionProps,
  DocumentOpenActionProps,
  ConfigInitField,
  GetProjectOptions,
  FolderContents,
  PundokBookmarkType,
  PundokBookmark,
  documentFormatToOutputConverter,
  PandocFeatureName,
  PandocFeatureOptions,
  ConfigQueryOptions,
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
  ACTION_PROJECT_NEW,
  BaseEditorAction,
  EditorAction,
  setActionSetupViewer,
} from '../actions';
import { useActions } from '../stores';

type Listener = () => void;

export class LocalBackend implements Backend {
  private listeners: Listener[] = [];

  constructor() {
    this.registerListeners();
  }

  private registerListeners() {
    const ipc = window.ipc;
    if (ipc) {
      this.listeners.forEach((removeListener) => {
        removeListener();
      });

      let listeners: Listener[] = this.listeners;
      const addListener = (
        channel: IpcMainToRendererChannel,
        listener: IpcRendererListener,
      ) => {
        const l = ipc.listen(channel, listener);
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
            props: { configurationName } as BackendSetConfigNameActionProps,
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
            getConfigurationFunction(window.ipc),
          );
          console.log(project);
          const action: EditorAction = {
            ...ACTION_BACKEND_SET_PROJECT,
            editorKey: editorKey!,
            props: { project } as BackendSetProjectActionProps,
          };
          actions.setAction(action);
        },
      );

      addListener('feedback', (e: any, feedbackMsg: ServerMessageFeedback) => {
        const { editorKey, feedback } = feedbackMsg;
        const action: EditorAction = {
          ...ACTION_BACKEND_FEEDBACK,
          editorKey: editorKey!,
          props: { feedback } as BackendFeedbackActionProps,
        };
        actions.setAction(action);
      });

      addListener(
        'content',
        async (e: any, contentMsg: ServerMessageContent) => {
          const { editorKey, content, project } = contentMsg;
          console.log(contentMsg);

          const project_with_conf: PundokEditorProject | undefined = project
            ? await computeProjectConfiguration(
              project,
              getConfigurationFunction(window.ipc),
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
              } as BackendSetContentWithProjectActionProps,
            }
            : {
              ...ACTION_BACKEND_SET_CONTENT,
              editorKey: editorKey!,
              props: { content } as BackendSetContentActionProps,
            };
          actions.setAction(action);
        },
      );

      addListener('document', (e: any, commandMsg: ServerMessageCommand) => {
        const { editorKey, command, path, configurationName, atLine } = commandMsg;
        let props: Record<string, any> = {};
        let baseAction: BaseEditorAction;
        switch (command) {
          case 'open':
            baseAction = ACTION_DOCUMENT_OPEN;
            props = {
              context: {
                path,
                configurationName,
              } as DocumentContext,
              atLine,
            } as DocumentOpenActionProps
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
          case 'new-project':
            baseAction = ACTION_PROJECT_NEW;
            break
          default:
            return;
        }
        const action: EditorAction = {
          ...baseAction,
          editorKey: editorKey!,
          props,
        };
        console.log(`setting DOCUMENT action for editor ${editorKey}`)
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

  // private async invokeIpc(
  //   channel: IpcRendererToMainChannel,
  //   ...args: any[]
  // ): Promise<any> {
  //   const c = IPC_CHANNELS[channel];
  //   if (c && c.dir === 'r2m')
  //     return window.ipc?.invoke(channel, ...args);
  //   else
  //     return Promise.reject(
  //       `"${channel}" is not a valid <Renderer -> Main> channel`,
  //     );
  // }

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
    window.ipc.editorReady(editorKey);
  }

  getFolderContents(context: Partial<DocumentContext>): Promise<FolderContents> {
    return window.ipc.getFolderContents(JSON.stringify(context))
  }

  async createFolder(path: string): Promise<string> {
    return window.ipc.createFolder(path)
  }

  async getBookmarks(bookmarkType?: PundokBookmarkType): Promise<PundokBookmark[]> {
    return window.ipc.getBookmarks(bookmarkType)
  }

  async open(context: DocumentContext): Promise<CxDocument> {
    try {
      return window.ipc.openDocument(JSON.stringify(context));
    } catch (error) {
      return Promise.reject(error);
    }
  }

  save(doc: CxDocument): Promise<SaveResponse> {
    let preview: Partial<PreviewOptions> | undefined = undefined;
    const { documentFormat } = doc
    const outputConverter = documentFormatToOutputConverter(documentFormat)
    const openResult = outputConverter?.openResult;
    if (openResult)
      preview = {
        inPundokEditor: openResult === 'editor',
      };
    const ipc = window.ipc;
    if (ipc) {
      return ipc.saveDocument(JSON.stringify(doc));
    } else {
      throw new Error('Method not implemented.');
    }
  }

  async debugInfo(): Promise<object> {
    return window.ipc.debugInfo();
  }

  async getProject(options: GetProjectOptions): Promise<PundokEditorProject | undefined> {
    return window.ipc.getProject(options);
  }

  async createProject(path: string, project: Partial<PundokEditorProject>): Promise<void> {
    return window.ipc.newProject(path, JSON.stringify(project));
  }

  async availableConfigurations(options?: ConfigQueryOptions): Promise<ConfigurationSummary[]> {
    const ipc = window.ipc;
    let configs: ConfigurationSummary[] = [
      {
        name: HARDCODED_CONFIG_NAME,
        description: HARDCODED_CONFIG_DESC,
        isLocal: false,
      },
    ];
    if (ipc) {
      const maybeConfigs = await window.ipc.availableConfigurations(options);
      configs = configs.concat(maybeConfigs || []);
    }
    return configs;
  }

  async configuration(name?: string): Promise<PundokEditorConfig> {
    if (!name || name === HARDCODED_CONFIG_NAME)
      return Promise.resolve(getHardcodedEditorConfig());
    const notFound = `Configuration "${name}" not found`;
    const ipc = window.ipc;
    if (ipc) {
      const configInit = await ipc.loadConfiguration(name);
      return configInit
        ? new PundokEditorConfig(configInit)
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
    return window.ipc.fileContents(filename, options);
  }

  async setValue(key: string, value?: any): Promise<void> {
    window.ipc.setValue(key, JSON.stringify(value));
  }

  pandocFeature(featureName: PandocFeatureName, options?: PandocFeatureOptions): Promise<any[]> {
    return window.ipc.pandocFeature(featureName, options)
  }

  // async openViewer(
  //   docName: string,
  //   options?: Partial<FindResourceOptions>
  // ): Promise<void> {
  //   const opts = options?.project && !isString(options?.project)
  //     ? { ...options, project: JSON.stringify(options.project) }
  //     : options
  //   window.ipc.open-viewer( docName, opts)
  // }

  async queryDatabase(query: Query): Promise<QueryResult[]> {
    try {
      return window.ipc.query(JSON.stringify(query)) as Promise<QueryResult[]>;
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async getInclusionTree(
    project: PundokEditorProject,
  ): Promise<ProjectComponent | undefined> {
    try {
      const structure = await window.ipc.getInclusionTree(JSON.stringify(project));
      if (structure) {
        return JSON.parse(structure) as ProjectComponent;
      }
      return undefined;
    } catch (err) {
      return Promise.reject(err)
    }
  }

  async transformPandocJson(
    doc: Partial<CxDocument>,
    transform: PandocFilterTransform
  ): Promise<string> {
    console.log(doc)
    return window.ipc.transformJson(
      JSON.stringify(doc),
      JSON.stringify(transform || {}),
    );
  }

  async gotoSource(
    editorKey: EditorKeyType,
    info: SynctexInfo,
  ): Promise<void> {
    window.ipc.getSourceFile(editorKey, info)
  }

  async showAgain(hash: string, editorKey: EditorKeyType): Promise<void> {
    window.ipc.showRenderedAgain(hash, editorKey)
  }

  async renderAgain(hash: string, editorKey: EditorKeyType): Promise<void> {
    window.ipc.renderAgain(hash, editorKey)
  }

  async getRenderingJob(hash: string): Promise<RenderingJob | undefined> {
    const job_as_string: string | undefined = await window.ipc.getRenderingJob(hash)
    return job_as_string && JSON.parse(job_as_string) as RenderingJob || undefined
  }

  async storeInConfiguration(
    where: ConfigInitField,
    obj: object,
    isDeletion: boolean,
    isProject: boolean,
    configNameOrProjectPath: string
  ): Promise<void> {
    console.log(`calling backend to update configuration`)
    return window.ipc.updateConfig(where, JSON.stringify(obj), isDeletion, isProject, configNameOrProjectPath)
  }
}

function getConfigurationFunction(ipc: any) {
  return async (name?: string) => {
    if (!name || name === HARDCODED_CONFIG_NAME)
      return Promise.resolve(getHardcodedEditorConfig());
    const notFound = `Configuration "${name}" not found`;
    if (ipc) {
      const configInit: PundokEditorConfigInit = await ipc.invoke(
        'load-configuration',
        name,
      );
      return configInit
        ? new PundokEditorConfig(configInit)
        : Promise.reject(notFound);
    } else {
      return Promise.reject(notFound);
    }
  };
}
