// @ts-ignore
import package_json from '../../../package.json?raw';
const pkg_json = JSON.parse(package_json);

/**
 * 
 * @returns The current version of pundok-editor.
 */
export function version() {
  return pkg_json.version;
}
