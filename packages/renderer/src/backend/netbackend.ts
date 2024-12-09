import type { Backend, BackendConfig, WhyAskingForIdOrPath } from './backend';
import {
  type ConfigurationSummary,
  type PundokEditorConfig,
  type SaveResponse,
  type StoredDoc,
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
  ReadDoc,
  ProjectComponent,
  DocumentContext,
  DocumentCoords,
  PandocFilterTransform,
} from '../common';

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

  open(context: DocumentContext): Promise<ReadDoc> {
    throw new Error('Method not implemented.');
  }

  save(
    doc: StoredDoc,
    project?: PundokEditorProject,
    editorKey?: EditorKeyType,
  ): Promise<SaveResponse> {
    console.log(doc.content);
    throw new Error('Method not implemented.');
  }

  async debugInfo(): Promise<object> {
    return Promise.resolve({ info: 'no debug info yet for netbackend!' });
  }

  async getProject(context: Record<string, any>): Promise<PundokEditorProject> {
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

  async pandocInputFormats(): Promise<string[]> {
    return Promise.resolve([]);
  }

  async pandocOutputFormats(): Promise<string[]> {
    return Promise.resolve([]);
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
    context?: DocumentContext,
  ): Promise<DocumentCoords | undefined> {
    return Promise.reject('method non implemented');
  }

  // openViewer(docName: string, options?: Partial<FindResourceOptions>): Promise<void> {
  //   throw new Error('Method not implemented.');
  // }

  async transformPandocJson(
    pandocJson: string | undefined,
    transform: PandocFilterTransform,
    options?: Partial<FindResourceOptions>,
  ): Promise<string> {
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
