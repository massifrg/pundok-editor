import { PundokEditorConfigInit } from "./editorConfigInit";
import {
  ConfigurationPruning,
  getPrunedConfigInit,
  PundokEditorConfig
} from "./editorConfiguration";
import { NamedAndDescribed } from "./types";

export const DEFAULT_PROJECT_FILENAME = 'pundok-project.json';

export interface PundokEditorProject extends NamedAndDescribed {
  path: string;
  /** The root (master) document of the document tree */
  rootDocument: string;
  /** The names of configurations to inherit */
  configurations?: string[];
  /** A complement to the inherited configurations */
  editorConfig: Partial<PundokEditorConfigInit & { remove: ConfigurationPruning }>;
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

export async function computeProjectConfiguration(
  project: PundokEditorProject,
  getConfiguration: (
    configurationName?: string
  ) => Promise<PundokEditorConfig | undefined>
): Promise<PundokEditorProject> {
  let computedConfig: PundokEditorConfig = new PundokEditorConfig({
    name: project.name,
    description: project.description,
    version: [],
    tiptap: {},
    ...project.editorConfig,
  } as PundokEditorConfigInit);
  const inherited = project.configurations ? [...project.configurations] : [];
  try {
    while (inherited.length > 0) {
      let configName = inherited.shift()
      let inheritedConfig = await getConfiguration(configName);
      if (!inheritedConfig)
        return Promise.reject(`can't read configuration "${configName}"`);
      computedConfig = computedConfig.addConfiguration(inheritedConfig);
    }
    const pruning = project.editorConfig.remove
    if (pruning)
      computedConfig = getPrunedConfigInit(computedConfig, pruning)
  } catch (err) {
    // console.log(err);
    return Promise.reject(`can't compute configuration for project "${project.name}"`);
  }
  // console.log(computedConfig);
  return { ...project, computedConfig }
}

export interface GetProjectOptions {
  path: string,
  computeConfig?: boolean,
}