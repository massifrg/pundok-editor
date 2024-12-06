import { existsSync } from 'fs';
import {
  DEFAULT_INDEX_NAME,
  Query,
  QueryResult,
  IndexTermQuery,
  ProjectIndexQuery,
  searchQueryResults,
} from '../common';
import { readFileSync } from 'fs';
import { IpcMainInvokeEvent } from 'electron';
import { IpcHub } from './ipcHub';
import { findResourceFile } from '../resourcesManager';
import { runWriterOnMasterFile } from '../importExport';

export const queryHandler =
  (hub: IpcHub) => (event: IpcMainInvokeEvent, queryAsJsonString: string) => {
    try {
      const query: Query = JSON.parse(queryAsJsonString);
      return dispatchQuery(query);
    } catch (err) {
      return Promise.reject(`Query unsuccessful: ${err}`);
    }
  };

export async function dispatchQuery(query: Query): Promise<QueryResult[]> {
  if (!query) return Promise.reject('no query submitted');
  if (!query.type) return Promise.reject('query type not specified');
  switch (query.type) {
    case 'index-term':
      return indexTermQueryHandler(query as IndexTermQuery);
    case 'project-index':
      return projectIndexQueryHandler(query as ProjectIndexQuery);
    default:
      return Promise.reject('query type unknown');
  }
}

async function indexTermQueryHandler(
  query: IndexTermQuery,
): Promise<QueryResult[]> {
  const { indexName, searchText, options } = query;
  if (!indexName) return Promise.reject(`no index name specified`);
  if (!searchText || searchText.length === 0)
    return Promise.reject('no searchText field in query');
  let dbFilename = findResourceFile(
    `${indexName || DEFAULT_INDEX_NAME}.json`,
    options,
  );
  if (dbFilename && existsSync(dbFilename)) {
    try {
      const dbData = readFileSync(dbFilename);
      const db = dbData && JSON.parse(dbData.toString());
      return searchQueryResults(db, searchText);
    } catch (err) {
      console.log(
        `"${dbFilename}" does not contain a valid index (it must be an array of {id, text, html?} objects)`,
      );
    }
  }
  return Promise.reject(`index database file "${dbFilename}" does not exist`);
}

async function projectIndexQueryHandler(
  query: ProjectIndexQuery,
): Promise<QueryResult[]> {
  const project = query.options?.project;
  if (!project)
    return Promise.reject(
      `project not specified, you can't get a project index`,
    );
  try {
    const result = await runWriterOnMasterFile(project, 'indices2json.lua');
    if (!result) return [];
    const data = JSON.parse(result);
    const indexTerms = data?.terms[query.indexName] as QueryResult[];
    if (!indexTerms) return [];
    return indexTerms.map(({ id, text, html }) => ({ id, text, html }));
  } catch (err) {
    console.log(err);
    return Promise.reject(`projectIndexQueryHandler: ${err}`);
  }
}
