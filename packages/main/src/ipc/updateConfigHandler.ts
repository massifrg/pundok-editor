import { IpcMainInvokeEvent } from 'electron';
import { IpcHub } from './ipcHub';
import {
  Automation,
  ConfigInitField,
  PundokEditorConfigInit,
  PundokEditorProject,
  serializeProject
} from '../common';
import { getConfigurationInit } from '../resourcesManager';
import { loadProjectInDirectory, projectFileNameInDirectory } from './getProjectHandler';
import { replaceFileExtension, stringify } from '../utils';
import { copyFile, writeFile } from 'fs/promises';

export const updateConfigHandler =
  (hub: IpcHub) =>
    async (
      e: IpcMainInvokeEvent,
      where: ConfigInitField,
      json_obj: string,
      isDeletion: boolean,
      isProject: boolean,
      configNameOrProjectPath: string,
    ): Promise<void> => {
      const obj = JSON.parse(json_obj)
      let updatingObject: PundokEditorProject | PundokEditorConfigInit | undefined = undefined
      let fieldCurrentValue = undefined
      try {
        if (isProject) {
          updatingObject = await loadProjectInDirectory(configNameOrProjectPath)
          fieldCurrentValue = updatingObject?.editorConfig && updatingObject.editorConfig[where] as any[]
        } else {
          updatingObject = await getConfigurationInit(configNameOrProjectPath)
          fieldCurrentValue = updatingObject && updatingObject[where] as any[]
        }
      } catch (err) {
        return Promise.reject(stringify(err))
      }
      if (!updatingObject)
        return Promise.reject(isProject ? 'project file not found' : `configuration "${configNameOrProjectPath}" not found`)
      let newValue: any[] = fieldCurrentValue === undefined ? [] : fieldCurrentValue
      const old_items_length = newValue.length
      switch (where) {
        case 'automations': {
          const { name, type } = obj as Automation
          newValue = (newValue as Automation[]).filter(a => a.type !== type || a.name !== name)
          newValue = isDeletion ? newValue : [...newValue, obj]
        }
          break
        default:
          break
      }
      const new_items_length = newValue.length
      // determine whether it's an update, deletion or append
      const length_diff = new_items_length - old_items_length
      const operationType = length_diff === 0
        ? 'update'
        : length_diff > 0
          ? 'append'
          : 'delete'
      console.log(`updateConfigHandler: ${operationType} in ${where} in ${isProject ? 'project' : 'configuration'} ${configNameOrProjectPath}`)
      if (isProject) {
        try {
          const project_path = projectFileNameInDirectory(configNameOrProjectPath)
          const backup_path = replaceFileExtension(project_path, 'bak')
          await copyFile(project_path, backup_path)
          //@ts-ignore
          updatingObject.editorConfig[where] = newValue;
          await writeFile(project_path, serializeProject(updatingObject as PundokEditorProject))
        } catch (err) {
          return Promise.reject(err)
        }
      }
    };
