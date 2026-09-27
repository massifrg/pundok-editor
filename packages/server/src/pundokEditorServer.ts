import type {
  ConfigurationSummary,
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
} from './common';
import {
  getHardcodedEditorConfig,
  HARDCODED_CONFIG_DESC,
  HARDCODED_CONFIG_NAME,
  PundokEditorConfig,
} from './common';
import {
  ensureBackendDirectories,
  getConfigurationInit,
  getAvailableConfigurationSummaries,
  getBackendDebugInfo,
  getBookmarks,
  getFileContents,
  getFolderContents,
  parseConfigurationFiles,
  RenderingJobStore,
  getPandocFeature,
  createFolder,
  editorReady,
  type BackendDirectories,
  type RendererHub,
} from '../../backend/src';
import { isAbsolute, relative, resolve } from 'node:path';
import { EditorEventHub } from './editorEventHub';

/**
 * A stub implementation of {@link Backend}, meant to run on a server
 * (e.g. behind an Express app), so that the editor can be served as a SPA
 * and talk to it through {@link NetBackend} (`packages/renderer/src/backend/netbackend.ts`).
 *
 * Every method mirrors one of `NetBackend`'s methods and is wired to an HTTP
 * route in `routes.ts`, reusing the same channel names/constants that
 * `LocalBackend` uses for the Main <-> Renderer IPC (see
 * `packages/common/src/ipc.ts`).
 *
 * Configuration access is implemented through the shared backend package;
 * document and rendering operations remain stubs.
 *
 * The method signatures mirror `Backend`/`NetBackend`
 * (`packages/renderer/src/backend/backend.ts` and `netbackend.ts`), on purpose,
 * but this class doesn't depend on the renderer package (which needs the Vue
 * toolchain to be type-checked), so it isn't declared as `implements Backend`.
 * Keep the two in sync manually if `Backend` changes.
 */
export class PundokEditorServer {
  private readonly renderingJobsByUser = new Map<string, RenderingJobStore>();

  constructor(
    private readonly directoriesForUser: (
      username: string,
    ) => BackendDirectories,
    readonly events: EditorEventHub,
  ) {}

  prepareUser(username: string): void {
    ensureBackendDirectories(this.directoriesForUser(username));
  }

  rendererHub(username: string): RendererHub {
    return this.events.forUser(username);
  }

  async loggedin(_user: string): Promise<boolean> {
    return true;
  }

  async login(_user: string, _password: string): Promise<boolean> {
    throw new Error('Use the JWT login route');
  }

  async logout(_user: string): Promise<boolean> {
    return true;
  }

  async debugInfo(user: string): Promise<object> {
    return getBackendDebugInfo(this.directoriesForUser(user));
  }

  async editorReady(user: string, editorKey?: EditorKeyType): Promise<void> {
    return editorReady(
      this.directoriesForUser(user),
      this.rendererHub(user),
      editorKey,
    );
  }

  async getFolderContents(
    user: string,
    context: Partial<DocumentContext>,
  ): Promise<FolderContents> {
    const path = context.path || context.project?.path || '.';
    return getFolderContents(this.userPath(user, path));
  }

  async getBookmarks(
    user: string,
    bookmarkType?: PundokBookmarkType,
  ): Promise<PundokBookmark[]> {
    return getBookmarks(this.directoriesForUser(user), bookmarkType);
  }

  async open(_user: string, context: DocumentContext): Promise<CxDocument> {
    throw new Error('Method not implemented.');
  }

  async save(_user: string, doc: CxDocument): Promise<SaveResponse> {
    throw new Error('Method not implemented.');
  }

  async getProject(
    _user: string,
    options: GetProjectOptions,
  ): Promise<PundokEditorProject | undefined> {
    throw new Error('Method not implemented.');
  }

  async createProject(
    _user: string,
    path: string,
    project: Partial<PundokEditorProject>,
  ): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async getInclusionTree(
    _user: string,
    project: PundokEditorProject,
  ): Promise<ProjectComponent | undefined> {
    throw new Error('Method not implemented.');
  }

  async createFolder(user: string, path: string): Promise<string> {
    return createFolder(this.userPath(user, path));
  }

  async availableConfigurations(
    user: string,
    options?: ConfigQueryOptions,
  ): Promise<ConfigurationSummary[]> {
    const configurations = await getAvailableConfigurationSummaries(
      this.directoriesForUser(user),
      options,
    );
    if (!configurations.some(({ name }) => name === HARDCODED_CONFIG_NAME)) {
      configurations.push({
        name: HARDCODED_CONFIG_NAME,
        description: HARDCODED_CONFIG_DESC,
        isLocal: false,
      });
    }
    return configurations;
  }

  async configuration(
    user: string,
    name?: string,
  ): Promise<PundokEditorConfig> {
    if (!name) return getHardcodedEditorConfig();
    const config = await getConfigurationInit(
      this.directoriesForUser(user),
      name,
    );
    return config ? new PundokEditorConfig(config) : getHardcodedEditorConfig();
  }

  async getFileContents(
    user: string,
    filename: string,
    options?: Partial<FindResourceOptions>,
  ): Promise<string> {
    const path = filename.replace(/^file:\/\//, '');
    return getFileContents(
      this.directoriesForUser(user),
      isAbsolute(path) ? this.userPath(user, path) : filename,
      options,
    );
  }

  async queryDatabase(_user: string, query: Query): Promise<QueryResult[]> {
    throw new Error('Method not implemented.');
  }

  async setValue(_user: string, key: string, value?: any): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async pandocFeature(
    _user: string,
    featureName: PandocFeatureName,
    options?: PandocFeatureOptions,
  ): Promise<any[]> {
    return getPandocFeature(featureName, options);
  }

  async transformPandocJson(
    _user: string,
    doc: Partial<CxDocument>,
    transform: PandocFilterTransform,
  ): Promise<string> {
    throw new Error('Method not implemented.');
  }

  async gotoSource(
    _user: string,
    editorKey: EditorKeyType,
    info: SynctexInfo,
  ): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async renderAgain(
    _user: string,
    hash: string,
    editorKey: EditorKeyType,
  ): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async getRenderingJob(
    user: string,
    hash: string,
  ): Promise<RenderingJob | undefined> {
    return this.renderingJobsForUser(user).get(hash);
  }

  async showAgain(
    _user: string,
    hash: string,
    editorKey: EditorKeyType,
  ): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async storeInConfiguration(
    _user: string,
    options: ConfigurationUpdateOptions,
  ): Promise<void> {
    throw new Error('Method not implemented.');
  }

  private renderingJobsForUser(username: string): RenderingJobStore {
    let renderingJobs = this.renderingJobsByUser.get(username);
    if (!renderingJobs) {
      renderingJobs = new RenderingJobStore();
      this.renderingJobsByUser.set(username, renderingJobs);
    }
    return renderingJobs;
  }

  private userPath(username: string, path: string): string {
    const root = resolve(this.directoriesForUser(username).userDataDir);
    const candidate = resolve(root, path.replace(/^file:\/\//, ''));
    const relativePath = relative(root, candidate);
    if (
      relativePath === '..' ||
      relativePath.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`)
    )
      throw new Error('Path must be within the authenticated user directory');
    return candidate;
  }
}
