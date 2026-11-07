import type { SelectedNodeOrMark } from '../../schema';
import {
  type EditAttributesActionProps,
  NODE_NAME_INDEX_TERM,
} from '../../common';

export interface UiStateHost {
  [key: string]: any;
}

export function showSearchAndReplaceDialog(host: UiStateHost): void {
  host.visibleSearchAndReplaceDialog = true;
}

export function hideSearchAndReplaceDialog(host: UiStateHost): void {
  host.visibleSearchAndReplaceDialog = false;
}

export function toggleSearchAndReplaceDialog(host: UiStateHost): void {
  host.visibleSearchAndReplaceDialog = !host.visibleSearchAndReplaceDialog;
}

export function editNodeOrMarkAttributes(
  host: UiStateHost,
  nodeOrMark: SelectedNodeOrMark,
  props?: EditAttributesActionProps,
): void {
  if (!nodeOrMark) return;
  let { tab, action } = props || {};
  const node = nodeOrMark.node;
  if (!tab && node && node.type.name === NODE_NAME_INDEX_TERM) {
    if ((node.attrs.id || '').length === 0) tab = 'id';
  }
  host.startAttributesTab = tab;
  host.onAttributesEditorShow = action;
  host.nodeOrMarkToEdit = nodeOrMark;
}

export function closeAttributesEditor(host: UiStateHost): void {
  host.nodeOrMarkToEdit = undefined;
}

export function showInputTextDialog(
  host: UiStateHost,
  label: string,
  startValue?: string,
  callback?: (text: string, oldText?: string) => void,
): void {
  host.inputTextDialogLabel = label;
  host.inputTextDialogStartValue = startValue || '';
  host.inputTextDialogCallback = callback;
  host.visibleInputTextDialog = true;
}

export function closeInputTextDialog(
  host: UiStateHost,
  text: string | null | undefined,
  oldText?: string,
): void {
  const callback = host.inputTextDialogCallback;
  if (callback && text) callback(text, oldText);
  host.visibleInputTextDialog = false;
  host.inputTextDialogLabel = 'text';
  host.inputTextDialogStartValue = '';
  host.inputTextDialogCallback = undefined;
}

export function maximizePdfViewer(host: UiStateHost): void {
  host.leftDrawerState = 'normal';
}

export function minimizePdfViewer(host: UiStateHost): void {
  host.leftDrawerState = 'mini';
}

export function startSettingLeftDrawerWidth(
  host: UiStateHost,
  event: MouseEvent,
): void {
  if (event.button !== 0) return;
  event.preventDefault();
  host.leftDrawerHandleStart = event.clientX;
  host.prevLeftDrawerWidth = host.leftDrawerWidth;
  host.leftDrawerPreviewWidth = host.leftDrawerWidth;
  document.addEventListener('mousemove', host.changeLeftDrawerWidth);
  document.addEventListener('mouseup', host.stopSettingLeftDrawerWidth);
}

export function changeLeftDrawerWidth(
  host: UiStateHost,
  event: MouseEvent,
): void {
  if (host.leftDrawerHandleStart === undefined) return;
  const width =
    host.prevLeftDrawerWidth + event.clientX - host.leftDrawerHandleStart;
  if (width >= 16 && width <= 1024) host.leftDrawerPreviewWidth = width;
}

export function stopSettingLeftDrawerWidth(host: UiStateHost): void {
  if (host.leftDrawerPreviewWidth !== undefined)
    host.leftDrawerWidth = host.leftDrawerPreviewWidth;
  host.leftDrawerHandleStart = undefined;
  host.leftDrawerPreviewWidth = undefined;
  document.removeEventListener('mousemove', host.changeLeftDrawerWidth);
  document.removeEventListener('mouseup', host.stopSettingLeftDrawerWidth);
}

function cssfilename2id(filename: string): string {
  return filename ? filename.replace(/[^_0-9A-Za-z]+/g, '-') : '';
}

export function removeCssStylesheets(
  _host: UiStateHost,
  filenames: string[],
): void {
  filenames?.forEach((filename) => {
    const id = cssfilename2id(filename);
    const style = document.querySelector(`style#${id}`);
    if (style) style.parentNode?.removeChild(style);
    else console.log(`can't remove <style> element with id="${id}"`);
  });
}

export function addCssStylesheets(
  host: UiStateHost,
  filenames: string[],
): void {
  filenames?.forEach(async (filename) => {
    const docState = host.docState();
    if (!docState) return;
    console.log(`loading CSS from "${filename}"`);
    const { configuration, project } = docState;
    try {
      const data = await host.backend?.getFileContents(filename, {
        kind: 'css',
        configurationName: configuration?.name,
        project: JSON.stringify({ ...project }),
      });
      if (data) {
        const style = document.createElement('style');
        style.setAttribute('id', cssfilename2id(filename));
        style.innerHTML = data;
        document.head.appendChild(style);
      }
    } catch (error) {
      console.log(`can't load "${filename}": ${error}`);
    }
  });
}
