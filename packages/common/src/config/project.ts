import type {
  PundokEditorConfigInit,
  PundokEditorProjectConfig,
} from './editorConfigInit';
import {
  getPrunedConfigInit,
  PundokEditorConfig,
} from './editorConfiguration';
import type { NamedAndDescribed } from '../types';

export const DEFAULT_PROJECT_FILENAME = 'pundok-project.json';

export interface PundokEditorProject extends NamedAndDescribed {
  path: string;
  /** The root (master) document of the document tree */
  rootDocument: string;
  /** The names of configurations to inherit */
  configurations?: string[];
  /** A complement to the inherited configurations */
  editorConfig: Partial<PundokEditorProjectConfig>;
  /** The actual configuration computed from the inherited configurations and complemented with editorConfig  */
  computedConfig?: PundokEditorConfig;
}

interface AbstractProjectComponent {
  /** the component identifier */
  id?: string;
  /** the component source (file path or URI) */
  src?: string;
  /** the component title */
  title?: string;
  /** the component content format */
  format?: string;
  /** the sha1 of the contents (it may be used to check updates) */
  sha1?: string;
  /** ordered inclusive PDF page ranges where the component is referenced */
  pageRanges?: [start: number, end: number][];
  /** components included by this component */
  children?: ProjectComponent[];
}

/** A project component with a source (file path or URI) */
interface SrcProjectComponent extends AbstractProjectComponent {
  src: string;
}

/** A project component with an identifier (tipically in a database) */
interface IdProjectComponent extends AbstractProjectComponent {
  id: string;
}

export type ProjectComponent = SrcProjectComponent | IdProjectComponent;

/**
 * Finds the immediate sibling of a document source in its containing
 * component's `children` array.
 */
function siblingProjectComponent(
  structure: ProjectComponent,
  src: string,
  offset: -1 | 1,
): ProjectComponent | undefined {
  const children = structure.children;
  if (!children) return undefined;

  const index = children.findIndex((child) => child.src === src);
  if (index >= 0) return children[index + offset];

  for (const child of children) {
    const sibling = siblingProjectComponent(child, src, offset);
    if (sibling) return sibling;
  }

  return undefined;
}

/**
 * Returns the component immediately before the document with the given source
 * in the same `children` array.
 *
 * Returns `undefined` when the source is not found, is the first child, or
 * belongs to the root component itself.
 */
export function getPreviousProjectComponent(
  structure: ProjectComponent,
  src: string,
): ProjectComponent | undefined {
  return siblingProjectComponent(structure, src, -1);
}

/**
 * Returns the component immediately after the document with the given source
 * in the same `children` array.
 *
 * Returns `undefined` when the source is not found, is the last child, or
 * belongs to the root component itself.
 */
export function getNextProjectComponent(
  structure: ProjectComponent,
  src: string,
): ProjectComponent | undefined {
  return siblingProjectComponent(structure, src, 1);
}

/**
 * Returns the component whose `children` array directly contains the document
 * with the given source.
 *
 * Returns `undefined` when the source is not found or belongs to the root
 * component itself.
 */
export function getParentProjectComponent(
  structure: ProjectComponent,
  src: string,
): ProjectComponent | undefined {
  const children = structure.children;
  if (!children) return undefined;
  if (children.some((child) => child.src === src)) return structure;

  for (const child of children) {
    const parent = getParentProjectComponent(child, src);
    if (parent) return parent;
  }

  return undefined;
}

/**
 * Returns the children of the component with the given source.
 */
export function getProjectComponentChildren(
  structure: ProjectComponent,
  src: string,
): ProjectComponent[] | undefined {
  if (structure.src === src) return structure.children || [];

  for (const child of structure.children || []) {
    const children = getProjectComponentChildren(child, src);
    if (children) return children;
  }

  return undefined;
}

/**
 * Returns normalized absolute and project-relative variants of a source.
 */
export function projectSourceVariants(
  src: string,
  projectPath?: string,
): Set<string> {
  let normalized = src.trim();
  try {
    if (/^file:\/\//i.test(normalized))
      normalized = decodeURIComponent(new URL(normalized).pathname);
    else normalized = decodeURIComponent(normalized);
  } catch {
    // Keep filesystem paths containing a literal or malformed percent sign.
  }
  normalized = normalized
    .replaceAll('\\', '/')
    .replace(/^\.\/+/, '')
    .replace(/\/+$/, '');
  const variants = new Set([normalized]);
  let project = projectPath?.trim();
  try {
    if (project && /^file:\/\//i.test(project))
      project = decodeURIComponent(new URL(project).pathname);
    else if (project) project = decodeURIComponent(project);
  } catch {
    // Keep filesystem paths containing a literal or malformed percent sign.
  }
  project = project
    ?.replaceAll('\\', '/')
    .replace(/\/+$/, '');
  if (project && normalized.startsWith(`${project}/`))
    variants.add(normalized.slice(project.length + 1));
  return variants;
}

function sameProjectSource(
  first: string | undefined,
  second: string | undefined,
  projectPath?: string,
): boolean {
  if (!first || !second) return false;
  const secondVariants = projectSourceVariants(second, projectPath);
  return [...projectSourceVariants(first, projectPath)]
    .some((source) => secondVariants.has(source));
}

/**
 * Returns whether a saved document is the given project component or one of
 * its descendants.
 */
export function isProjectDocumentOrDescendant(
  structure: ProjectComponent,
  documentSrc: string,
  savedSrc: string,
  projectPath?: string,
  savedProjectPath?: string,
): boolean {
  if (
    !projectPath ||
    !savedProjectPath ||
    !sameProjectSource(projectPath, savedProjectPath)
  )
    return false;
  const findComponent = (
    component: ProjectComponent,
    source: string,
  ): ProjectComponent | undefined =>
    sameProjectSource(component.src, source, projectPath)
      ? component
      : (component.children || [])
        .map((child) => findComponent(child, source))
        .find(Boolean);
  const document = findComponent(structure, documentSrc);
  const saved = findComponent(structure, savedSrc);
  return document && saved
    ? isProjectComponentOrDescendant(document, saved)
    : false;
}

/**
 * Returns whether a project component is the given component or contains it
 * in its children.
 */
export function isProjectComponentOrDescendant(
  component: ProjectComponent,
  descendant: ProjectComponent,
): boolean {
  return component === descendant ||
    (component.children || []).some((child) =>
      isProjectComponentOrDescendant(child, descendant),
    );
}

interface ProjectComponentLocation {
  container: ProjectComponent;
  index: number;
}

/**
 * Returns the path of containing components and child indexes for a document
 * source.
 */
function findProjectComponentPath(
  structure: ProjectComponent,
  src: string,
  path: ProjectComponentLocation[] = [],
): ProjectComponentLocation[] | undefined {
  const children = structure.children;
  if (!children) return undefined;

  const index = children.findIndex((child) => child.src === src);
  if (index >= 0) return [...path, { container: structure, index }];

  for (const [childIndex, child] of children.entries()) {
    const result = findProjectComponentPath(child, src, [
      ...path,
      { container: structure, index: childIndex },
    ]);
    if (result) return result;
  }

  return undefined;
}

/**
 * Finds an adjacent component by walking up through containing components when
 * the source is at the edge of its current `children` array.
 */
function adjacentProjectComponent(
  structure: ProjectComponent,
  src: string,
  offset: -1 | 1,
): ProjectComponent | undefined {
  const path = findProjectComponentPath(structure, src);
  if (!path) return undefined;

  for (let level = path.length - 1; level >= 0; level--) {
    const { container, index } = path[level];
    const children = container.children;
    if (!children) continue;

    const sibling = children[index + offset];
    if (!sibling) continue;
    if (level === path.length - 1 && children[index].children?.length)
      return sibling;
    if (!sibling.children?.length) return sibling;

    return offset === 1
      ? sibling.children[0]
      : sibling.children[sibling.children.length - 1];
  }

  return undefined;
}

/**
 * Returns the next component, crossing container boundaries when necessary.
 *
 * When the source is the last child of a container, the search moves to the
 * next sibling container and returns its first child. If that container has no
 * children, the container itself is returned. When the source itself has
 * children, its sibling is returned without descending into it.
 */
export function getNextProjectComponentAcrossContainers(
  structure: ProjectComponent,
  src: string,
): ProjectComponent | undefined {
  return adjacentProjectComponent(structure, src, 1);
}

/**
 * Returns the previous component, crossing container boundaries when
 * necessary.
 *
 * When the source is the first child of a container, the search moves to the
 * previous sibling container and returns its last child. If that container has
 * no children, the container itself is returned. When the source itself has
 * children, its sibling is returned without descending into it.
 */
export function getPreviousProjectComponentAcrossContainers(
  structure: ProjectComponent,
  src: string,
): ProjectComponent | undefined {
  return adjacentProjectComponent(structure, src, -1);
}

export async function computeProjectConfiguration(
  project: PundokEditorProject,
  getConfiguration: (
    configurationName?: string,
  ) => Promise<PundokEditorConfig | undefined>,
  warn: (message: string) => void = console.warn,
): Promise<PundokEditorProject> {
  let computedConfig: PundokEditorConfig = new PundokEditorConfig({
    name: project.name,
    description: project.description,
    version: [],
    // tiptap: {},
    ...project.editorConfig,
  } as PundokEditorConfigInit);
  const inherited = project.configurations ? [...project.configurations] : [];
  try {
    while (inherited.length > 0) {
      const configName = inherited.shift();
      try {
        const inheritedConfig = await getConfiguration(configName);
        if (!inheritedConfig)
          throw new Error(`can't read configuration "${configName}"`);
        computedConfig = computedConfig.addConfiguration(inheritedConfig);
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        warn(
          `can't use inherited configuration "${configName}": ${reason}`,
        );
      }
    }
    const pruning = project.editorConfig.remove;
    if (pruning) computedConfig = getPrunedConfigInit(computedConfig, pruning);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return Promise.reject(
      `can't compute configuration for project "${project.name}": ${reason}`,
    );
  }
  // console.log(computedConfig);
  return { ...project, computedConfig };
}

export interface GetProjectOptions {
  path: string;
  computeConfig?: boolean;
}
