import { IpcMainInvokeEvent } from 'electron';
import { IpcHub } from './ipcHub';
import {
  Automation,
  ConfigurationUpdateOptions,
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
    async (e: IpcMainInvokeEvent, options: ConfigurationUpdateOptions): Promise<void> => {
      const { configurationName, projectPath, value, field, operation } = options
      console.log(`updating "${field}" field in configuration with value ${value}`)
      const obj = JSON.parse(value)
      let updatingObject: PundokEditorProject | PundokEditorConfigInit | undefined = undefined
      let fieldCurrentValue = undefined
      let newValue
      try {
        if (field) {
          if (projectPath) {
            updatingObject = await loadProjectInDirectory(projectPath)
            fieldCurrentValue = updatingObject?.editorConfig && updatingObject.editorConfig[field] as any[]
          } else if (configurationName) {
            updatingObject = await getConfigurationInit(configurationName)
            fieldCurrentValue = updatingObject && updatingObject[field] as any[]
          } else {
            return Promise.reject("Don't know what configuration to update")
          }
        } else {

        }
      } catch (err) {
        return Promise.reject(stringify(err))
      }
      if (!updatingObject)
        return Promise.reject(projectPath && 'project file not found' || `configuration "${configurationName}" not found`)
      if (field) {
        newValue = fieldCurrentValue === undefined ? [] : fieldCurrentValue
        switch (field) {
          case 'automations': {
            const { name, type } = obj as Automation
            newValue = (newValue as Automation[]).filter(a => a.type !== type || a.name !== name)
            newValue = operation === 'delete' ? newValue : [...newValue, obj]
          }
            break
          default:
            break
        }
        console.log(`updateConfigHandler: ${operation} in ${field} in ${projectPath || configurationName}`)
      }
      if (projectPath) {
        try {
          const project_path = projectFileNameInDirectory(projectPath)
          const backup_path = replaceFileExtension(project_path, 'bak')
          await copyFile(project_path, backup_path)
          //@ts-ignore
          updatingObject.editorConfig[field] = newValue;
          await writeFile(project_path, serializeProject(updatingObject as PundokEditorProject))
        } catch (err) {
          return Promise.reject(err)
        }
      }
    };
