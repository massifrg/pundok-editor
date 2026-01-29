import type { Backend, BackendConfig, WhyAskingForIdOrPath } from './backend';
import {
  type ConfigurationSummary,
  type PundokEditorConfig,
  type SaveResponse,
  type CxDocument,
  getHardcodedCustomCss,
  getHardcodedEditorConfig,
  HARDCODED_CONFIG_NAME,
  HARDCODED_CONFIG_DESC,
  Query,
  QueryResult,
  IndexTermQuery,
  PundokEditorProject,
  EditorKeyType,
  FindResourceOptions,
  ProjectComponent,
  DocumentContext,
  DocumentCoords,
  PandocFilterTransform,
  SynctexInfo,
  RenderingJob,
  ConfigInitField,
  GetProjectOptions,
  FolderContents,
  PundokBookmarkType,
  PundokBookmark,
  PandocFeatureName,
  PandocFeatureOptions,
} from '../common';
import { OpenDialogOptions } from 'electron';

export class NetBackend implements Backend {
  private config: BackendConfig = {};

  constructor(config: BackendConfig) {
    this.config = config;
  }

  loggedin() {
    return Promise.resolve(false);
  }

  login(user: string, password: string) {
    return Promise.resolve(false);
  }

  logout() {
    return Promise.resolve(false);
  }

  async editorReady(editorKey?: EditorKeyType) { }

  getFolderContents(options: { path?: string }): Promise<FolderContents> {
    throw new Error('Method not implemented.');
  }

  async getBookmarks(bookmarkType?: PundokBookmarkType): Promise<PundokBookmark[]> {
    throw new Error('Method not implemented.');
  }

  open(context: DocumentContext): Promise<CxDocument> {
    throw new Error('Method not implemented.');
  }

  save(doc: CxDocument): Promise<SaveResponse> {
    console.log(doc.content);
    throw new Error('Method not implemented.');
  }

  async debugInfo(): Promise<object> {
    return Promise.resolve({ info: 'no debug info yet for netbackend!' });
  }

  async getProject(options: GetProjectOptions): Promise<PundokEditorProject> {
    throw new Error('Method not implemented.');
  }

  async createProject(path: string, project: Partial<PundokEditorProject>): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async availableConfigurations(): Promise<ConfigurationSummary[]> {
    return [
      {
        name: HARDCODED_CONFIG_NAME,
        description: HARDCODED_CONFIG_DESC,
      },
    ] as ConfigurationSummary[];
  }

  async configuration(name?: string): Promise<PundokEditorConfig> {
    if (!name) return Promise.resolve(getHardcodedEditorConfig());

    switch (name) {
      case HARDCODED_CONFIG_NAME:
      default:
        return Promise.resolve(getHardcodedEditorConfig());
    }
  }

  getFileContents(
    filename: string,
    options?: Partial<FindResourceOptions>,
  ): Promise<string> {
    if (filename === 'default.css') return getHardcodedCustomCss();
    return Promise.reject('Method not implemented');
  }

  async setValue(key: string, value?: any): Promise<void> {
    // TODO: remember to JSON.stringify the value before sending it
  }

  pandocFeature(featureName: PandocFeatureName, options?: PandocFeatureOptions): Promise<any[]> {
    return Promise.reject('Method not implemented');
  }

  async queryDatabase(query: Query): Promise<QueryResult[]> {
    if (!query) return Promise.reject('no query submitted');
    if (!query.type) return Promise.reject('query type not specified');
    if (query.type === 'index-term') {
      return dummyQueryHandler(query as IndexTermQuery);
    }
    return Promise.reject('query type unknown');
    // throw new Error('Method not implemented.');
  }

  async getInclusionTree(
    project: PundokEditorProject,
  ): Promise<ProjectComponent | undefined> {
    return undefined;
  }

  async askForDocumentIdOrPath(
    why: WhyAskingForIdOrPath,
    options?: DocumentContext & { openDialogOptions?: Partial<OpenDialogOptions> },
  ): Promise<DocumentCoords | undefined> {
    return Promise.reject('method non implemented');
  }

  // openViewer(docName: string, options?: Partial<FindResourceOptions>): Promise<void> {
  //   throw new Error('Method not implemented.');
  // }

  async transformPandocJson(
    doc: Partial<CxDocument>,
    transform: PandocFilterTransform
  ): Promise<string> {
    return Promise.reject('method non implemented');
  }

  gotoSource(
    editorKey: EditorKeyType,
    info: SynctexInfo,
  ): Promise<void> {
    return Promise.reject('method non implemented');
  }

  async showAgain(hash: string, editorKey: EditorKeyType): Promise<void> {
    return Promise.reject('method non implemented');
  }

  async renderAgain(hash: string, editorKey: EditorKeyType): Promise<void> {
    return Promise.reject('method non implemented');
  }

  async getRenderingJob(hash: string): Promise<RenderingJob | undefined> {
    return Promise.reject('method non implemented');
  }

  async storeInConfiguration(
    where: ConfigInitField,
    obj: object,
    isDeletion: boolean,
    isProject: boolean,
    configNameOrProjectPath: string
  ): Promise<void> {
    return Promise.reject('method non implemented');
  }
}

function dummyQueryHandler(query: IndexTermQuery): QueryResult[] {
  const searchText = query.searchText;
  const results: QueryResult[] = [];
  const st: string[] = (
    Array.isArray(searchText) ? searchText : [searchText]
  ).filter((t) => t.toLocaleLowerCase());
  dummyIndex.filter((record) => {
    const { id, text, html } = record as Record<string, any>;
    if (id && text) {
      const lowtext = text.toLocaleLowerCase();
      if (st.every((t) => lowtext.indexOf(t) >= 0))
        results.push({ id, text, html });
    }
  });
  return results;
}

const dummyIndex: QueryResult[] = [
  {
    id: '12321',
    text: 'Alice McDaniels',
  },
  {
    id: '12323',
    text: 'Bob Barrymore',
  },
  {
    id: '12383',
    text: 'Charlie Thomas',
  },
  {
    id: '57386',
    text: 'Diana McKenzie',
  },
  {
    id: '3134',
    text: 'Elisabeth Johnson',
  },
  {
    id: '555',
    text: 'Fabian Johnston',
  },
];
