import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, resolve, parse } from 'node:path';
import {
  DEFAULT_INDEX_NAME,
  type IndexTermQuery,
  type ProjectIndexQuery,
  type PundokEditorProject,
  type Query,
  type QueryResult,
  searchQueryResults,
} from '../../../common/src';
import { localizePath } from '../filesystem';
import {
  findResourceFile,
  findResourceFiles,
  isReadableFile,
  type BackendDirectories,
} from '../resourceManager';
import { runExternalProgram } from '../runExternal';
import { isObject } from 'lodash';

const INCLUDE_DOC_FILTER = 'include-doc.lua';
const INDICES_WRITER = 'indices2json.lua';

export async function queryHandler(
  directories: BackendDirectories,
  queryAsJsonString: string,
): Promise<QueryResult[]> {
  try {
    return dispatchQuery(directories, JSON.parse(queryAsJsonString) as Query);
  } catch (error) {
    throw new Error(`Query unsuccessful: ${error}`);
  }
}

export async function dispatchQuery(
  directories: BackendDirectories,
  query: Query,
): Promise<QueryResult[]> {
  if (!query) throw new Error('No query submitted');
  if (!query.type) throw new Error('Query type not specified');
  switch (query.type) {
    case 'index-term':
      return indexTermQueryHandler(directories, query as IndexTermQuery);
    case 'project-index':
      return projectIndexQueryHandler(directories, query as ProjectIndexQuery);
    default:
      throw new Error('Query type unknown');
  }
}

async function indexTermQueryHandler(
  directories: BackendDirectories,
  query: IndexTermQuery,
): Promise<QueryResult[]> {
  const { indexName, searchText, options } = query;
  if (!indexName) throw new Error('No index name specified');
  if (!searchText || searchText.length === 0)
    throw new Error('No searchText field in query');

  const dbFilenames = findResourceFiles(
    directories,
    new RegExp(`${indexName || DEFAULT_INDEX_NAME}([^A-Za-z].*?)?.json`),
    options,
  ).filter(dbfn => existsSync(dbfn))
  if (dbFilenames.length === 0)
    throw new Error(`No index database file starting with "${indexName}" found`);

  let results: object[] = []
  try {
    dbFilenames.forEach(dbfn => {
      const db = JSON.parse(readFileSync(dbfn, 'utf8'));
      const source = parse(dbfn).base
      if (Array.isArray(db))
        results = results.concat(db.filter(r => isObject(r)).map(r => ({ ...r, source })))
    })
  } catch (error) {
    console.log(
      `Index database file "${dbFilenames}" does not contain valid JSON: ${error}`,
    );
  }
  console.log(results)
  return searchQueryResults(results, searchText);
}

async function projectIndexQueryHandler(
  directories: BackendDirectories,
  query: ProjectIndexQuery,
): Promise<QueryResult[]> {
  const project = query.options?.project;
  if (!project)
    throw new Error("Project not specified, you can't get a project index");

  const result = await runWriterOnMasterFile(directories, project, INDICES_WRITER);
  if (!result) return [];

  let data: { terms?: Record<string, QueryResult[]> };
  try {
    data = JSON.parse(result) as { terms?: Record<string, QueryResult[]> };
  } catch (error) {
    throw new Error(`Project index writer returned invalid JSON: ${error}`);
  }
  const indexTerms = data.terms?.[query.indexName];
  return indexTerms
    ? indexTerms.map(({ id, text, html }) => ({ id, text, html, source: 'project' }))
    : [];
}

async function runWriterOnMasterFile(
  directories: BackendDirectories,
  editorProject: string | PundokEditorProject,
  writerFilename: string,
): Promise<string | undefined> {
  const project =
    typeof editorProject === 'string'
      ? (JSON.parse(editorProject) as PundokEditorProject)
      : editorProject;
  if (!project.path || !project.rootDocument) return undefined;

  const path = localizePath(project.path);
  const source = resolve(path, localizePath(project.rootDocument));
  if (!isAbsolute(source) || !isReadableFile(source))
    throw new Error(`Project root document is not readable: ${source}`);

  const writer = findResourceFile(directories, localizePath(writerFilename), {
    kind: 'writer',
    project,
  });
  const filter = findResourceFile(directories, INCLUDE_DOC_FILTER, {
    kind: 'filter',
    project,
  });
  if (!writer || !filter) return undefined;

  const { result } = runExternalProgram(
    'pandoc',
    [
      '-f',
      'json',
      '-t',
      writer,
      '-L',
      filter,
      `--data-dir=${path}`,
      '--',
      source,
    ],
    { cwd: path },
  );
  const output = await result;
  if (output.exitCode !== 0) throw new Error(output.error);
  return output.output;
}
