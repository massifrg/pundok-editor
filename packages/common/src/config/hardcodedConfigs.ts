// @ts-ignore
import hardCodedConfigInitJson from '../../../../staticResources/configs/default.config.json?raw';
// @ts-ignore
import testingDefaultCSS from '../../../../staticResources/configs/default/default.css?raw';
import { PandocEditorConfig } from './editorConfiguration';

export const HARDCODED_CONFIG_NAME = 'default';
export const HARDCODED_CONFIG_DESC = 'the default, hard-coded, configuration';

export function getHardcodedEditorConfig(): PandocEditorConfig {
  const hardCodedConfigInit = JSON.parse(hardCodedConfigInitJson);
  return new PandocEditorConfig(hardCodedConfigInit);
}

export function getHardcodedCustomCss(): Promise<string> {
  return Promise.resolve(testingDefaultCSS);
}
