import { IpcMainInvokeEvent } from 'electron';
import { IpcHub } from './ipcHub';
import {
  Automation,
  ConfigInitField,
  PundokEditorConfigInit,
  PundokEditorProject
} from '../common';
import { getConfigurationInit } from './configurationHandlers';
import { loadProjectFromDocFile } from './getProjectHandler';
import { stringify } from '../utils';

export const updateConfigHandler =
  (hub: IpcHub) =>
    async (
      e: IpcMainInvokeEvent,
      where: ConfigInitField,
      json_obj: string,
      isProject: boolean,
      configNameOrProjectPath: string,
    ): Promise<void> => {
      const obj = JSON.parse(json_obj)
      let updatingObject: PundokEditorProject | PundokEditorConfigInit | undefined = undefined
      let fieldCurrentValue = undefined
      try {
        if (isProject) {
          updatingObject = await loadProjectFromDocFile(configNameOrProjectPath)
          fieldCurrentValue = updatingObject && updatingObject.editorConfig && updatingObject.editorConfig[where] as any[]
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
      const old_count = newValue.length
      switch (where) {
        case 'automations': {
          const { name, type } = obj as Automation
          newValue = (newValue as Automation[]).filter(a => a.type !== type || a.name !== name)
          newValue = [...newValue, obj]
        }
          break
        default:
          break
      }
      // TODO: 
      const new_count = newValue.length
      const operationType = old_count === new_count ? 'update' : 'append'
    };
