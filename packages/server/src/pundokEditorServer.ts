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
} from './common';

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
 * This is just a stub: every method is empty/not implemented yet.
 *
 * The method signatures mirror `Backend`/`NetBackend`
 * (`packages/renderer/src/backend/backend.ts` and `netbackend.ts`), on purpose,
 * but this class doesn't depend on the renderer package (which needs the Vue
 * toolchain to be type-checked), so it isn't declared as `implements Backend`.
 * Keep the two in sync manually if `Backend` changes.
 */
export class PundokEditorServer {
  async loggedin(): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  async login(user: string, password: string): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  async logout(): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  async debugInfo(): Promise<object> {
    throw new Error('Method not implemented.');
  }

  async editorReady(editorKey?: EditorKeyType): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async getFolderContents(
    context: Partial<DocumentContext>,
  ): Promise<FolderContents> {
    throw new Error('Method not implemented.');
  }

  async getBookmarks(
    bookmarkType?: PundokBookmarkType,
  ): Promise<PundokBookmark[]> {
    throw new Error('Method not implemented.');
  }

  async open(context: DocumentContext): Promise<CxDocument> {
    throw new Error('Method not implemented.');
  }

  async save(doc: CxDocument): Promise<SaveResponse> {
    throw new Error('Method not implemented.');
  }

  async getProject(
    options: GetProjectOptions,
  ): Promise<PundokEditorProject | undefined> {
    throw new Error('Method not implemented.');
  }

  async createProject(
    path: string,
    project: Partial<PundokEditorProject>,
  ): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async getInclusionTree(
    project: PundokEditorProject,
  ): Promise<ProjectComponent | undefined> {
    throw new Error('Method not implemented.');
  }

  async createFolder(path: string): Promise<string> {
    throw new Error('Method not implemented.');
  }

  async availableConfigurations(
    options?: ConfigQueryOptions,
  ): Promise<ConfigurationSummary[]> {
    throw new Error('Method not implemented.');
  }

  async configuration(name?: string): Promise<PundokEditorConfig> {
    throw new Error('Method not implemented.');
  }

  async getFileContents(
    filename: string,
    options?: Partial<FindResourceOptions>,
  ): Promise<string> {
    throw new Error('Method not implemented.');
  }

  async queryDatabase(query: Query): Promise<QueryResult[]> {
    throw new Error('Method not implemented.');
  }

  async setValue(key: string, value?: any): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async pandocFeature(
    featureName: PandocFeatureName,
    options?: PandocFeatureOptions,
  ): Promise<any[]> {
    throw new Error('Method not implemented.');
  }

  async transformPandocJson(
    doc: Partial<CxDocument>,
    transform: PandocFilterTransform,
  ): Promise<string> {
    throw new Error('Method not implemented.');
  }

  async gotoSource(editorKey: EditorKeyType, info: SynctexInfo): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async renderAgain(hash: string, editorKey: EditorKeyType): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async getRenderingJob(hash: string): Promise<RenderingJob | undefined> {
    throw new Error('Method not implemented.');
  }

  async showAgain(hash: string, editorKey: EditorKeyType): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async storeInConfiguration(
    options: ConfigurationUpdateOptions,
  ): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
