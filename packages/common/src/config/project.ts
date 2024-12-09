import { PundokEditorConfig, PundokEditorConfigInit } from '.';

export const DEFAULT_PROJECT_FILENAME = 'pundok-project.json';

export interface PundokEditorProject {
  name: string;
  path: string;
  /** The root (master) document of the document tree */
  rootDocument: string;
  /** A description of the project */
  description?: string;
  /** The names of configurations to inherit */
  configurations?: string[];
  /** A complement to the inherited configurations */
  editorConfig: Partial<PundokEditorConfig>;
  /** The actual configuration computed from the inherited configurations and complemented with editorConfig  */
  computedConfig: PundokEditorConfig;
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
  let computedConfig: PundokEditorConfig | undefined;
  const projectConfig = new PundokEditorConfig({
    name: project.name,
    description: project.description,
    version: [],
    tiptap: {},
    ...project.editorConfig,
  } as PundokEditorConfigInit);
  const inherited = project.configurations ? [...project.configurations] : [];
  if (inherited.length === 0) {
    computedConfig = projectConfig;
  } else {
    try {
      computedConfig = await getConfiguration(inherited.shift());
      if (computedConfig) {
        while (inherited.length > 0) {
          const configurationName = inherited.shift();
          const onTop = await getConfiguration(configurationName!);
          if (!onTop)
            return Promise.reject(`can't read configuration "${name}"`);
          computedConfig = computedConfig.addConfiguration(onTop);
        }
        computedConfig = computedConfig.addConfiguration(projectConfig);
      }
    } catch (err) {
      // console.log(err);
      return Promise.reject(`can't read configuration "${name}"`);
    }
  }
  // console.log(computedConfig);
  return computedConfig ? { ...project, computedConfig } : project;
}
