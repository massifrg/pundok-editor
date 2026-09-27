import { IpcMainInvokeEvent } from 'electron';
import { IpcHub } from './ipcHub';
import {
  PandocFeatureName,
  PandocFeatureOptions,
  PandocFormatExtension,
} from '../common';
import { getPandocFeature } from '../backend';

export const pandocFeaturesHandler =
  (hub: IpcHub) =>
  async (
    e: IpcMainInvokeEvent,
    featureName: PandocFeatureName,
    options?: PandocFeatureOptions,
  ): Promise<string[] | PandocFormatExtension[]> => {
    return getPandocFeature(featureName, options);
  };
