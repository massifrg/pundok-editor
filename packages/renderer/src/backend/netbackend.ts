import type { Backend } from './backend';
import type {
  ConfigurationSummary,
  PundokEditorConfig,
  SaveResponse,
  CxDocument,
  Query,
  QueryResult,
  PundokEditorProject,
  EditorKeyType,
  FindResourceOptions,
  ProjectComponent,
  DocumentContext,
  PandocFilterTransform,
  SynctexInfo,
  RenderingJob,
  GetProjectOptions,
  FolderContents,
  PundokBookmarkType,
  PundokBookmark,
  PandocFeatureName,
  PandocFeatureOptions,
  ConfigQueryOptions,
  ConfigurationUpdateOptions,
  IpcMainToRendererChannel,
  ServerMessage,
} from '../common';
import { handleEditorEvent } from './editorEventHandlers';

class BackendHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'BackendHttpError';
  }
}

type LoginResponse = {
  token: string;
  user: string;
};

const TOKEN_STORAGE_KEY = 'pundok-editor.auth-token';

export class NetBackend implements Backend {
  private token: string | undefined;
  private readonly baseUrl = '/backend';
  private eventStreamAbortController: AbortController | undefined;
  private eventStreamToken: string | undefined;

  constructor() {
    this.token = window.localStorage.getItem(TOKEN_STORAGE_KEY) || undefined;
    window.addEventListener('storage', (event) => {
      if (
        event.storageArea === window.localStorage &&
        event.key === TOKEN_STORAGE_KEY
      ) {
        this.token = event.newValue || undefined;
        this.openEventStream();
      }
    });
    this.openEventStream();
  }

  async loggedin(): Promise<boolean> {
    if (!this.token) return false;
    try {
      return await this.request<boolean>('loggedin');
    } catch (error) {
      if (error instanceof BackendHttpError && error.status === 401) {
        this.setToken(undefined);
        return false;
      }
      throw error;
    }
  }

  async login(user: string, password: string): Promise<boolean> {
    try {
      const response = await this.request<LoginResponse>(
        'login',
        { user, password },
        undefined,
      );
      this.setToken(response.token);
      await this.openEventStream();
      return true;
    } catch (error) {
      if (error instanceof BackendHttpError && error.status === 401)
        return false;
      throw error;
    }
  }

  async logout(): Promise<boolean> {
    const token = this.token;
    this.setToken(undefined);
    if (!token) return false;
    return this.request<boolean>('logout', {}, token);
  }

  debugInfo(): Promise<object> {
    return this.request('debug-info');
  }

  editorReady(editorKey?: EditorKeyType): Promise<void> {
    return this.request('editor-ready', { editorKey });
  }

  getFolderContents(
    context: Partial<DocumentContext>,
  ): Promise<FolderContents> {
    return this.request('get-folder-contents', { context });
  }

  getBookmarks(bookmarkType?: PundokBookmarkType): Promise<PundokBookmark[]> {
    return this.request('get-bookmarks', { bookmarkType });
  }

  open(context: DocumentContext): Promise<CxDocument> {
    return this.request('open-document', { context });
  }

  save(doc: CxDocument): Promise<SaveResponse> {
    return this.request('save-document', { doc });
  }

  getProject(
    options: GetProjectOptions,
  ): Promise<PundokEditorProject | undefined> {
    return this.request('get-project', { options });
  }

  createProject(
    path: string,
    project: Partial<PundokEditorProject>,
  ): Promise<void> {
    return this.request('new-project', { path, project });
  }

  getInclusionTree(
    project: PundokEditorProject,
  ): Promise<ProjectComponent | undefined> {
    return this.request('get-inclusion-tree', { project });
  }

  createFolder(path: string): Promise<string> {
    return this.request('create-folder', { path });
  }

  availableConfigurations(
    options?: ConfigQueryOptions,
  ): Promise<ConfigurationSummary[]> {
    return this.request('available-configurations', { options });
  }

  configuration(name?: string): Promise<PundokEditorConfig> {
    return this.request('load-configuration', { name });
  }

  getFileContents(
    filename: string,
    options?: Partial<FindResourceOptions>,
  ): Promise<string> {
    return this.request('file-contents', { filename, options });
  }

  queryDatabase(query: Query): Promise<QueryResult[]> {
    return this.request('query', { query });
  }

  setValue(key: string, value?: unknown): Promise<void> {
    return this.request('set-value', { key, value });
  }

  pandocFeature(
    featureName: PandocFeatureName,
    options?: PandocFeatureOptions,
  ): Promise<any[]> {
    return this.request('pandoc-feature', { featureName, options });
  }

  transformPandocJson(
    doc: Partial<CxDocument>,
    transform: PandocFilterTransform,
  ): Promise<string> {
    return this.request('transform-json', { doc, transform });
  }

  gotoSource(editorKey: EditorKeyType, info: SynctexInfo): Promise<void> {
    return this.request('get-source-file', { editorKey, info });
  }

  renderAgain(hash: string, editorKey: EditorKeyType): Promise<void> {
    return this.request('render-again', { hash, editorKey });
  }

  getRenderingJob(hash: string): Promise<RenderingJob | undefined> {
    return this.request('get-rendering-job', { hash });
  }

  showAgain(hash: string, editorKey: EditorKeyType): Promise<void> {
    return this.request('show-rendered-again', { hash, editorKey });
  }

  storeInConfiguration(options: ConfigurationUpdateOptions): Promise<void> {
    return this.request('update-config', { options });
  }

  private async request<T>(
    endpoint: string,
    body: unknown = {},
    token = this.token,
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${this.baseUrl}/${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const responseBody = await response.json().catch(() => undefined);
    if (!response.ok) {
      throw new BackendHttpError(
        responseBody?.error || response.statusText || 'Backend request failed',
        response.status,
      );
    }
    return responseBody as T;
  }

  private setToken(token: string | undefined): void {
    this.token = token;
    if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    if (!token) this.closeEventStream();
  }

  private async openEventStream(): Promise<void> {
    const token = this.token;
    if (!token || this.eventStreamToken === token) return;

    this.closeEventStream();
    const abortController = new AbortController();
    this.eventStreamAbortController = abortController;
    this.eventStreamToken = token;

    try {
      const response = await fetch(`${this.baseUrl}/events`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: abortController.signal,
      });
      if (!response.ok) {
        if (response.status === 401) this.setToken(undefined);
        throw new BackendHttpError(
          response.statusText || 'Could not connect to backend events',
          response.status,
        );
      }
      if (!response.body) throw new Error('Backend event stream has no body');
      await consumeEventStream(response.body, (channel, message) =>
        handleEditorEvent(channel, message, (name) => this.configuration(name)),
      );
    } catch (error) {
      if (!abortController.signal.aborted) {
        console.error('Backend event stream disconnected:', error);
        if (this.token === token) {
          window.setTimeout(() => {
            void this.openEventStream();
          }, 1_000);
        }
      }
    } finally {
      if (this.eventStreamAbortController === abortController) {
        this.eventStreamAbortController = undefined;
        this.eventStreamToken = undefined;
      }
    }
  }

  private closeEventStream(): void {
    this.eventStreamAbortController?.abort();
    this.eventStreamAbortController = undefined;
    this.eventStreamToken = undefined;
  }
}

const EVENT_CHANNELS = new Set<IpcMainToRendererChannel>([
  'feedback',
  'document',
  'new-empty-document',
  'content',
  'set-configuration',
  'set-project',
  'ask-value',
  'show-in-viewer',
]);

async function consumeEventStream(
  stream: ReadableStream<Uint8Array>,
  onEvent: (
    channel: IpcMainToRendererChannel,
    message: ServerMessage,
  ) => Promise<void>,
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let eventName: string | undefined;
  let data = '';

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    let lineEnd: number;
    while ((lineEnd = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, lineEnd).replace(/\r$/, '');
      buffer = buffer.slice(lineEnd + 1);
      if (line === '') {
        if (
          eventName &&
          data &&
          EVENT_CHANNELS.has(eventName as IpcMainToRendererChannel)
        ) {
          await onEvent(
            eventName as IpcMainToRendererChannel,
            JSON.parse(data) as ServerMessage,
          );
        }
        eventName = undefined;
        data = '';
      } else if (line.startsWith('event:')) {
        eventName = line.slice('event:'.length).trim();
      } else if (line.startsWith('data:')) {
        data += line.slice('data:'.length).trim();
      }
    }
    if (done) return;
  }
}
