import { copyFile, writeFile } from 'node:fs/promises';
import { parse, resolve } from 'node:path';
import {
  type Automation,
  type ConfigurationUpdateOptions,
  type PundokEditorProject,
  serializeProject,
} from '../../../common/src';
import { localizePath } from '../filesystem';
import { loadProjectInDirectory, projectFileNameInDirectory } from './project';

export async function updateConfiguration(
  options: ConfigurationUpdateOptions,
): Promise<void> {
  const { configurationName, projectPath, value, field, operation } = options;
  if (!projectPath) {
    if (configurationName)
      throw new Error('Official configurations are read-only');
    throw new Error('A project path is required to update a configuration');
  }
  const projectDirectory = localizePath(projectPath);
  const projectFilename = projectFileNameInDirectory(projectDirectory);
  if (!field) {
    if (operation !== 'update')
      throw new Error(
        'Updating a whole project requires the "update" operation',
      );
    const updatedProject = parseProject(value);
    await copyFile(projectFilename, backupFilename(projectFilename));
    await writeFile(projectFilename, serializeProject(updatedProject));
    return;
  }
  if (field !== 'automations')
    throw new Error(`Updating "${field}" is not supported`);

  const automation = parseAutomation(value);
  const project = await loadProjectInDirectory(projectDirectory);
  const currentAutomations = project.editorConfig?.automations || [];
  const updatedAutomations = currentAutomations.filter(
    ({ name, type }) => name !== automation.name || type !== automation.type,
  );
  if (operation !== 'delete') updatedAutomations.push(automation);

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

function parseProject(value: string): PundokEditorProject {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new Error(`Project must be valid JSON: ${error}`);
  }
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    typeof (parsed as Record<string, unknown>).name !== 'string' ||
    typeof (parsed as Record<string, unknown>).rootDocument !== 'string' ||
    !(
      (parsed as Record<string, unknown>).editorConfig &&
      typeof (parsed as Record<string, unknown>).editorConfig === 'object'
    )
  )
    throw new Error(
      'Project must include string "name" and "rootDocument" fields and an "editorConfig" object',
    );
  return parsed as PundokEditorProject;
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
