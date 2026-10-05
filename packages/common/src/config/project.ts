import {
  PundokEditorConfigInit,
  PundokEditorProjectConfig,
} from './editorConfigInit';
import { getPrunedConfigInit, PundokEditorConfig } from './editorConfiguration';
import { NamedAndDescribed } from '../types';

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
  /** the component content format */
  format?: string;
  /** the sha1 of the contents (it may be used to check updates) */
  sha1?: string;
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
 * children, the container itself is returned.
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
 * no children, the container itself is returned.
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
      let configName = inherited.shift();
      let inheritedConfig = await getConfiguration(configName);
      if (!inheritedConfig)
        return Promise.reject(`can't read configuration "${configName}"`);
      computedConfig = computedConfig.addConfiguration(inheritedConfig);
    }
    const pruning = project.editorConfig.remove;
    if (pruning) computedConfig = getPrunedConfigInit(computedConfig, pruning);
  } catch (err) {
    // console.log(err);
    return Promise.reject(
      `can't compute configuration for project "${project.name}"`,
    );
  }
  // console.log(computedConfig);
  return { ...project, computedConfig };
}

export interface GetProjectOptions {
  path: string;
  computeConfig?: boolean;
}
