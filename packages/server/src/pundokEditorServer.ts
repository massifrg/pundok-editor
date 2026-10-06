import type {
  ConfigurationSummary,
  SaveResponse,
  CxDocument,
  Query,
  QueryResult,
  ResourceFile,
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
  BackendValueKey,
  DocRepository,
  CloneGitProjectOptions,
  ClonedGitProject,
  LocalGitProjectOptions,
  GitCommitOptions,
  GitProjectStatus,
} from './common';
import {
  getHardcodedEditorConfig,
  HARDCODED_CONFIG_DESC,
  HARDCODED_CONFIG_NAME,
  PundokEditorConfig,
  documentFormatToOutputConverter,
} from './common';
import {
  ensureBackendDirectories,
  getConfigurationInit,
  getAvailableConfigurationSummaries,
  getBackendDebugInfo,
  getBookmarks,
  getFileContents,
  findResourceFilesWithProvenance,
  getFolderContents,
  getInclusionTree,
  getProject,
  parseConfigurationFiles,
  RenderingJobStore,
  getPandocFeature,
  dispatchQuery,
  updateConfiguration,
  transformWithPandoc,
  feedbackSink,
  getSourceLocation,
  showAgain,
  createFolder,
  createProject,
  editorReady,
  expandCommandArgs,
  openDocument,
  saveDocument,
  GitRepositoryManager,
  type BackendDirectories,
  type RendererHub,
} from '../../backend/src';
import { realpath } from 'node:fs/promises';
import { isAbsolute, parse as parsePath, relative, resolve } from 'node:path';
import { EditorEventHub } from './editorEventHub';
import { loadImage } from './image';

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
 * Shared backend operations run against the authenticated user's directories.
 * Desktop-only window and shell behavior is intentionally not available here.
 *
 * The method signatures mirror `Backend`/`NetBackend`
 * (`packages/renderer/src/backend/backend.ts` and `netbackend.ts`), on purpose,
 * but this class doesn't depend on the renderer package (which needs the Vue
 * toolchain to be type-checked), so it isn't declared as `implements Backend`.
 * Keep the two in sync manually if `Backend` changes.
 */
export class PundokEditorServer {
  private readonly renderingJobsByUser = new Map<string, RenderingJobStore>();
  private readonly gitRepositoriesByUser = new Map<
    string,
    GitRepositoryManager
  >();
  private readonly inclusionTreesByUser = new Map<
    string,
    Map<string, Promise<ProjectComponent | undefined>>
  >();

  constructor(
    private readonly directoriesForUser: (
      username: string,
    ) => BackendDirectories,
    readonly events: EditorEventHub,
    private readonly getValueForUser: (
      username: string,
      key: BackendValueKey,
    ) => DocRepository[],
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

  async listGitRepositories(user: string): Promise<DocRepository[]> {
    return this.gitRepositoriesForUser(user).list();
  }

  async cloneGitProject(
    user: string,
    options: CloneGitProjectOptions,
  ): Promise<ClonedGitProject> {
    return this.gitRepositoriesForUser(user).clone({
      ...options,
      destination: options.destination
        ? this.userPath(user, options.destination)
        : undefined,
    });
  }

  async publishGitProject(
    user: string,
    options: LocalGitProjectOptions,
  ): Promise<ClonedGitProject> {
    return this.gitRepositoriesForUser(user).publish({
      ...options,
      projectPath: this.userPath(user, options.projectPath),
    });
  }

  async connectGitProject(
    user: string,
    options: LocalGitProjectOptions,
  ): Promise<ClonedGitProject> {
    return this.gitRepositoriesForUser(user).connect({
      ...options,
      projectPath: this.userPath(user, options.projectPath),
    });
  }

  async gitProjectStatus(
    user: string,
    path: string,
  ): Promise<GitProjectStatus> {
    return this.gitRepositoriesForUser(user).status(this.userPath(user, path));
  }

  async initGitProject(user: string, path: string): Promise<void> {
    return this.gitRepositoriesForUser(user).init(this.userPath(user, path));
  }

  async stageGitProject(
    user: string,
    path: string,
    paths: string[],
  ): Promise<void> {
    return this.gitRepositoriesForUser(user).stage(
      this.userPath(user, path),
      paths,
    );
  }

  async commitGitProject(
    user: string,
    options: GitCommitOptions,
  ): Promise<void> {
    return this.gitRepositoriesForUser(user).commit({
      ...options,
      projectPath: this.userPath(user, options.projectPath),
    });
  }

  async scanGitProjects(
    user: string,
    url: string,
    remoteUser: string,
    password: string,
  ) {
    return this.gitRepositoriesForUser(user).scanRemoteProjects(
      url,
      remoteUser,
      password,
    );
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

  async open(user: string, context: DocumentContext): Promise<CxDocument> {
    return openDocument(
      this.directoriesForUser(user),
      feedbackSink(this.rendererHub(user)),
      this.documentForUser(user, context),
    );
  }

  async save(user: string, doc: CxDocument): Promise<SaveResponse> {
    return saveDocument(
      this.directoriesForUser(user),
      this.rendererHub(user),
      feedbackSink(this.rendererHub(user)),
      this.renderingJobsForUser(user),
      this.documentForUser(user, doc) as CxDocument,
    );
  }

  async getProject(
    user: string,
    options: GetProjectOptions,
  ): Promise<PundokEditorProject | undefined> {
    return getProject(this.directoriesForUser(user), {
      ...options,
      path: this.userPath(user, options.path),
    });
  }

  async createProject(
    user: string,
    path: string,
    project: Partial<PundokEditorProject>,
  ): Promise<void> {
    return createProject(this.userPath(user, path), project);
  }

  async getInclusionTree(
    user: string,
    project: PundokEditorProject,
    refresh?: boolean,
  ): Promise<ProjectComponent | undefined> {
    let userCache = this.inclusionTreesByUser.get(user);
    if (!userCache) {
      userCache = new Map();
      this.inclusionTreesByUser.set(user, userCache);
    }

    const key = JSON.stringify(project);
    if (!refresh) {
      const cached = userCache.get(key);
      if (cached) return cached;
    }

    const pending = getInclusionTree(this.directoriesForUser(user), {
      ...project,
      path: this.userPath(user, project.path),
    }).then((result) => (result ? JSON.parse(result) : undefined));
    userCache.set(key, pending);
    void pending.catch(() => {
      if (userCache?.get(key) === pending) userCache.delete(key);
    });
    return pending;
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
    const directories = this.directoriesForUser(user);
    const path = filename.replace(/^file:\/\//, '');
    return getFileContents(
      directories,
      isAbsolute(path) ? path : filename,
      options,
      [
        directories.userDataDir,
        directories.configurationsDir,
        directories.localConfigurationsDir,
        ...(directories.staticResourcesDir
          ? [directories.staticResourcesDir]
          : []),
      ],
    );
  }

  async findResourceFiles(
    user: string,
    filenameRegex: string,
    regexFlags?: string,
    options?: Partial<FindResourceOptions>,
  ): Promise<ResourceFile[]> {
    return findResourceFilesWithProvenance(
      this.directoriesForUser(user),
      new RegExp(filenameRegex, regexFlags),
      this.findResourceOptionsForUser(user, options),
    );
  }

  async image(
    user: string,
    path: string,
    page?: string,
  ): Promise<{ body: Buffer; contentType: string }> {
    return loadImage(
      await this.existingUserPath(user, path),
      page,
      resolve(
        this.directoriesForUser(user).userDataDir,
        '.pundok-editor',
        'image-cache',
      ),
    );
  }

  async queryDatabase(user: string, query: Query): Promise<QueryResult[]> {
    return dispatchQuery(
      this.directoriesForUser(user),
      this.queryForUser(user, query),
    );
  }

  async setValue(_user: string, _key: string, _value?: any): Promise<void> {}

  async getValue(user: string, key: BackendValueKey): Promise<DocRepository[]> {
    return this.getValueForUser(user, key);
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
    user: string,
    editorKey: EditorKeyType,
    info: SynctexInfo,
  ): Promise<void> {
    const source = await getSourceLocation(
      this.directoriesForUser(user),
      feedbackSink(this.rendererHub(user)),
      editorKey,
      this.synctexInfoForUser(user, info),
    );
    if (source)
      this.rendererHub(user).send('document', {
        type: 'command',
        command: 'open',
        editorKey,
        path: this.userPath(user, source.path),
        atLine: source.line,
      });
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
    user: string,
    hash: string,
    editorKey: EditorKeyType,
  ): Promise<void> {
    showAgain(
      this.rendererHub(user),
      this.renderingJobsForUser(user).get(hash),
      hash,
      editorKey,
    );
  }

  async storeInConfiguration(
    user: string,
    options: ConfigurationUpdateOptions,
  ): Promise<void> {
    if (!options.projectPath) return updateConfiguration(options);
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

  private gitRepositoriesForUser(username: string): GitRepositoryManager {
    let repositories = this.gitRepositoriesByUser.get(username);
    if (!repositories) {
      repositories = new GitRepositoryManager(
        this.directoriesForUser(username),
      );
      this.gitRepositoriesByUser.set(username, repositories);
    }
    return repositories;
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

  private findResourceOptionsForUser(
    username: string,
    options?: Partial<FindResourceOptions>,
  ): Partial<FindResourceOptions> | undefined {
    if (!options?.project) return options;
    const project =
      typeof options.project === 'string'
        ? (JSON.parse(options.project) as PundokEditorProject)
        : options.project;
    return {
      ...options,
      project: this.projectForUser(username, project),
    };
  }

  private documentForUser(
    username: string,
    document: Partial<CxDocument>,
  ): Partial<CxDocument> {
    this.validateOutputPath(username, document);
    return {
      ...document,
      ...(document.path && { path: this.userPath(username, document.path) }),
      ...(document.resourcePath && {
        resourcePath: document.resourcePath.map((path) =>
          this.resourcePathForUser(username, path),
        ),
      }),
      ...(document.project && {
        project: this.projectForUser(username, document.project),
      }),
    };
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
        typeof filter === 'string'
          ? this.resourcePathForUser(username, filter)
          : {
              ...filter,
              name: this.resourcePathForUser(username, filter.name),
            },
      ),
      sources: transform.sources?.map((source) =>
        this.resourcePathForUser(username, source),
      ),
    };
  }

  private resourcePathForUser(username: string, resource: string): string {
    const path = resource.replace(/^file:\/\//, '');
    if (isAbsolute(path)) {
      const directories = this.directoriesForUser(username);
      const candidate = resolve(path);
      const allowedDirectories = [
        directories.userDataDir,
        directories.configurationsDir,
        directories.localConfigurationsDir,
        ...(directories.staticResourcesDir
          ? [directories.staticResourcesDir]
          : []),
      ];
      if (
        allowedDirectories.some((directory) => {
          const relativePath = relative(resolve(directory), candidate);
          return (
            relativePath === '' ||
            (relativePath !== '..' &&
              !relativePath.startsWith(
                `..${process.platform === 'win32' ? '\\' : '/'}`,
              ))
          );
        })
      )
        return candidate;
      throw new Error(
        'Resource path must be within an allowed resource directory',
      );
    }
    if (path.split(/[\\/]/).includes('..'))
      throw new Error(
        'Resource path must not leave the authenticated user directory',
      );
    return resource;
  }

  private validateOutputPath(
    username: string,
    document: Partial<CxDocument>,
  ): void {
    const outputTemplate = documentFormatToOutputConverter(
      document.documentFormat,
    )?.resultFile;
    if (!outputTemplate) return;
    const outputPath = document.path
      ? expandCommandArgs([outputTemplate], {
          path: document.path,
          project: document?.project,
        })[0]
      : outputTemplate;
    this.userPath(
      username,
      isAbsolute(outputPath)
        ? outputPath
        : resolve(
            document.project?.path || parsePath(document.path || '').dir,
            outputPath,
          ),
    );
  }

  private synctexInfoForUser(username: string, info: SynctexInfo): SynctexInfo {
    const project = info.projectAsJson
      ? this.projectForUser(
          username,
          JSON.parse(info.projectAsJson) as PundokEditorProject,
        )
      : undefined;
    return {
      ...info,
      outputFile: this.userPath(username, info.outputFile),
      projectAsJson: project ? JSON.stringify(project) : undefined,
    };
  }

  private userPath(username: string, path: string): string {
    const root = resolve(this.directoriesForUser(username).userDataDir);
    const candidate = resolve(root, path.replace(/^file:\/\//, ''));
    const relativePath = relative(root, candidate);
    if (
      relativePath === '..' ||
      relativePath.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`)
    )
      throw new Error(
        `Path must be within the authenticated user directory: ${relativePath}`,
      );
    return candidate;
  }

  private async existingUserPath(
    username: string,
    path: string,
  ): Promise<string> {
    return realpath(this.userPath(username, path));
  }
}
