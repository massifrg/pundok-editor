import { IpcMainInvokeEvent } from 'electron';
import { IpcHub } from './ipcHub';
import { pandocFeatures } from '../pandocFeatures';
import { PandocFeatureName, PandocFeatureOptions, PandocFormatExtension } from '../common';

export const pandocFeaturesHandler = (hub: IpcHub) => async (
  e: IpcMainInvokeEvent,
  featureName: PandocFeatureName,
  options?: PandocFeatureOptions,
): Promise<string[] | PandocFormatExtension[]> => {
  if (featureName === 'input-formats')
    return pandocFeatures.inputFormatNames();
  else if (featureName === 'output-formats')
    return pandocFeatures.outputFormatNames();
  else if (featureName === 'extensions' && options?.format)
    return pandocFeatures.getFormatExtensions(options.format)
  return Promise.reject(`unknown "${featureName}" feature or wrong options`)
};