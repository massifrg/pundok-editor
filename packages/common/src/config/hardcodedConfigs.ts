// @ts-ignore
import hardCodedConfigInitJson from '../../../../staticResources/configs/default.config.json?raw';
// @ts-ignore
import testingDefaultCSS from '../../../../staticResources/configs/default/default.css?raw';
import { PundokEditorConfig } from './editorConfiguration';

export const HARDCODED_CONFIG_NAME = 'default';
export const HARDCODED_CONFIG_DESC = 'the default, hard-coded, configuration';

export function getHardcodedEditorConfig(): PundokEditorConfig {
  const hardCodedConfigInit = JSON.parse(hardCodedConfigInitJson);
  return new PundokEditorConfig(hardCodedConfigInit);
}

export function getHardcodedCustomCss(): Promise<string> {
  return Promise.resolve(testingDefaultCSS);
}
