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
  getInclusionTree,
  parseConfigurationFiles,
  RenderingJobStore,
  getPandocFeature,
  dispatchQuery,
  updateConfiguration,
  transformWithPandoc,
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
    user: string,
    project: PundokEditorProject,
  ): Promise<ProjectComponent | undefined> {
    const result = await getInclusionTree(this.directoriesForUser(user), {
      ...project,
      path: this.userPath(user, project.path),
    });
    return result ? JSON.parse(result) : undefined;
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

  async queryDatabase(user: string, query: Query): Promise<QueryResult[]> {
    return dispatchQuery(
      this.directoriesForUser(user),
      this.queryForUser(user, query),
    );
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
    user: string,
    doc: Partial<CxDocument>,
    transform: PandocFilterTransform,
  ): Promise<string> {
    return transformWithPandoc(
      this.directoriesForUser(user),
      this.documentForUser(user, doc),
      this.transformForUser(user, transform),
    );
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
    user: string,
    options: ConfigurationUpdateOptions,
  ): Promise<void> {
    if (!options.projectPath)
      return updateConfiguration(options);
    return updateConfiguration({
      ...options,
      projectPath: this.userPath(user, options.projectPath),
    });
  }

  private renderingJobsForUser(username: string): RenderingJobStore {
    let renderingJobs = this.renderingJobsByUser.get(username);
    if (!renderingJobs) {
      renderingJobs = new RenderingJobStore();
      this.renderingJobsByUser.set(username, renderingJobs);
    }
    return renderingJobs;
  }

  private queryForUser(username: string, query: Query): Query {
    const project = query.options?.project;
    if (!project) return query;

    const parsedProject =
      typeof project === 'string'
        ? (JSON.parse(project) as PundokEditorProject)
        : project;
    if (!parsedProject.path) return query;

    const projectForUser = this.projectForUser(username, parsedProject);
    return {
      ...query,
      options: {
        ...query.options,
        project: projectForUser,
      },
    };
  }

  private documentForUser(
    username: string,
    document: Partial<CxDocument>,
  ): Partial<CxDocument> {
    return document.project
      ? {
          ...document,
          project: this.projectForUser(username, document.project),
        }
      : document;
  }

  private projectForUser(
    username: string,
    project: PundokEditorProject,
  ): PundokEditorProject {
    const path = this.userPath(username, project.path);
    const rootDocument = project.rootDocument
      ? this.userPath(username, resolve(path, project.rootDocument))
      : undefined;
    return {
      ...project,
      path,
      ...(rootDocument && { rootDocument }),
    };
  }

  private transformForUser(
    username: string,
    transform: PandocFilterTransform,
  ): PandocFilterTransform {
    return {
      ...transform,
      filters: transform.filters.map((filter) =>
        this.resourcePathForUser(username, filter),
      ),
      sources: transform.sources?.map((source) =>
        this.resourcePathForUser(username, source),
      ),
    };
  }

  private resourcePathForUser(username: string, resource: string): string {
    const path = resource.replace(/^file:\/\//, '');
    if (isAbsolute(path)) return this.userPath(username, path);
    if (path.split(/[\\/]/).includes('..'))
      throw new Error('Resource path must not leave the authenticated user directory');
    return resource;
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
