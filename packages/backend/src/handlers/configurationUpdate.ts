import { copyFile, writeFile } from 'node:fs/promises';
import { parse, resolve } from 'node:path';
import {
  type Automation,
  type ConfigurationUpdateOptions,
  type PundokEditorProject,
  serializeProject,
} from '../../../common/src';
import { localizePath } from '../filesystem';
import {
  loadProjectInDirectory,
  projectFileNameInDirectory,
} from './project';

export async function updateConfiguration(
  options: ConfigurationUpdateOptions,
): Promise<void> {
  const { configurationName, projectPath, value, field, operation } = options;
  if (!projectPath) {
    if (configurationName)
      throw new Error('Official configurations are read-only');
    throw new Error('A project path is required to update a configuration');
  }
  if (field !== 'automations')
    throw new Error(`Updating "${field}" is not supported`);

  const automation = parseAutomation(value);
  const projectDirectory = localizePath(projectPath);
  const project = await loadProjectInDirectory(projectDirectory);
  const currentAutomations = project.editorConfig?.automations || [];
  const updatedAutomations = currentAutomations.filter(
    ({ name, type }) => name !== automation.name || type !== automation.type,
  );
  if (operation !== 'delete') updatedAutomations.push(automation);

  const projectFilename = projectFileNameInDirectory(projectDirectory);
  await copyFile(projectFilename, backupFilename(projectFilename));
  const updatedProject: PundokEditorProject = {
    ...project,
    editorConfig: {
      ...project.editorConfig,
      automations: updatedAutomations,
    },
  };
  await writeFile(projectFilename, serializeProject(updatedProject));
}

function parseAutomation(value: string): Automation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new Error(`Automation must be valid JSON: ${error}`);
  }
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    typeof (parsed as Record<string, unknown>).name !== 'string' ||
    typeof (parsed as Record<string, unknown>).type !== 'string'
  )
    throw new Error('Automation must include string "name" and "type" fields');
  return parsed as Automation;
}

function backupFilename(filename: string): string {
  const { dir, name } = parse(filename);
  return resolve(dir, `${name}.bak`);
}
