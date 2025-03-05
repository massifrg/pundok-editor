import { isArray, isObject } from 'lodash';
import { FindResourceOptions } from './resources';

/** Types of possible queries. */
export type QueryType = 'project-index' | 'index-term';

/**
 * A query to get e.g. the id of an index term from a database.
 */
export interface Query extends Record<string, any> {
  type: QueryType;
}

interface IndexQueryCommon {
  /** The name of the index to be searched (e.g. "names", "subjects", etc.) */
  indexName: string;
  /** Options to help retrieving the index. */
  options?: Partial<FindResourceOptions>;
}

/**
 * A query to get all the terms of an index.
 */
export interface ProjectIndexQuery extends Query, IndexQueryCommon {
  type: 'project-index';
}

/**
 * A query to look for the terms of an index containing one or more texts.
 */
export interface IndexTermQuery extends Query, IndexQueryCommon {
  type: 'index-term';
  /** The text(s) to be searched. */
  searchText: string | string[];
}

/**
 * The result of a query to an index.
 */
export interface QueryResult extends Record<string, any> {
  /** The id of the index term. */
  id: string;
  /** The text of the index term. */
  text?: string;
  /** The HTML-formatted version of the text of the index term. */
  html?: string;
}

export type IndexSourceType = 'project' | 'json-file' | 'document';

interface AbstractIndexSource {
  type: IndexSourceType;
}

export interface IndexSourceProject extends AbstractIndexSource {
  type: 'project';
}

export interface IndexSourceJsonFile extends AbstractIndexSource {
  type: 'json-file';
  filename: string;
}

export interface IndexSourceDocumentMetadata extends AbstractIndexSource {
  type: 'document'
}

export type IndexSource =
  | IndexSourceProject
  | IndexSourceJsonFile
  | IndexSourceDocumentMetadata;

/**
 * A function to search one or more texts inside an array of records.
 * @param data it should be an array of objects with at least an `id` and a `text` field.
 * @param searchText the text(s) to search.
 * @returns the subset of matching results.
 */
export function searchQueryResults(data: any[], searchText: string | string[]) {
  const results: QueryResult[] = [];
  if (data && Array.isArray(data)) {
    const st: string[] = (isArray(searchText) ? searchText : [searchText]).map(
      (t) => t.toLocaleLowerCase(),
    );
    data.forEach((record) => {
      if (isObject(record)) {
        const { id, text, html } = record as Record<string, any>;
        if (id && text) {
          const lowtext = text.toLocaleLowerCase();
          const found = st.map((t) => lowtext.indexOf(t)).filter((i) => i >= 0);
          if (found.length === st.length) {
            const minIndex = found.reduce(
              (min, i) => (min < i ? min : i),
              100000,
            );
            results.push({ id, text, html, minIndex });
          }
        }
      }
    });
    results.sort((r1, r2) => r1.minIndex - r2.minIndex);
  }
  return results;
}
