import {
  CustomStyleInstance,
  SearchAndReplaceMark,
  SearchAndReplaceSpan,
} from '../common';
import { SearchMarkSpec } from '../schema';

export * from './helpers/deproxify';

export interface AddableMark {
  active: boolean;
  name: string;
  title: string;
  icon?: string;
  label?: string;
  kind: 'base' | 'style' | 'span';
  markspec: SearchMarkSpec;
}

const BASE_ADDABLE_MARKS: Partial<AddableMark>[] = [
  { name: 'emph', title: 'Emph', icon: 'mdi-format-italic' },
  { name: 'strong', title: 'Strong', icon: 'mdi-format-bold' },
  { name: 'underline', title: 'Underline', icon: 'mdi-format-underline' },
  { name: 'strikeout', title: 'Strikeout', icon: 'mdi-format-strikethrough' },
  { name: 'superscript', title: 'Superscript', icon: 'mdi-format-superscript' },
  { name: 'subscript', title: 'Subscript', icon: 'mdi-format-subscript' },
  { name: 'smallcaps', title: 'SmallCaps', label: 'K' },
  { name: 'singleQuoted', title: 'Quoted(Single)', label: '‘a’' },
  { name: 'doubleQuoted', title: 'Quoted(Double)', label: '“a”' },
];

export function baseAddableMarks(
  actives?: string[],
  acc?: AddableMark[],
): AddableMark[] {
  const result = acc || [];
  BASE_ADDABLE_MARKS.forEach((bam) => {
    const { name, title, icon, label } = bam;
    result.push({
      active: !!actives?.find((a) => a == name),
      kind: 'base',
      name: name as SearchAndReplaceMark,
      title: title || (name as string),
      icon,
      label: label,
      markspec: { typeName: bam.name! },
    });
  });
  return result;
}

export function customStylesToAddableMarks(
  styles: CustomStyleInstance[],
  actives?: string[],
  acc?: AddableMark[],
): AddableMark[] {
  const result = acc || [];
  styles
    .filter((s) => s.element === 'span')
    .forEach((s) => {
      const { name, description } = s.styleDef;
      result.push({
        active: !!actives?.find((a) => a == name),
        kind: 'style',
        name: name,
        title: description || `custom style "${name}"`,
        label: name,
        markspec: {
          typeName: 'span',
          attrs: {
            customStyle: name,
            kv: { 'custom-style': name },
          },
        },
      });
    });
  return result;
}

export function searchAndReplaceSpanToAddableMarks(
  spans: SearchAndReplaceSpan[],
  actives?: string[],
  acc?: AddableMark[],
): AddableMark[] {
  const result = acc || [];
  spans.forEach((s) => {
    const { name, description, icon, classes, kv } = s;
    result.push({
      active: !!actives?.find((a) => a == name),
      kind: 'span',
      name: name,
      title: description || `"${name}" span`,
      label: name,
      icon,
      markspec: {
        typeName: 'span',
        attrs: {
          classes,
          kv,
        },
      },
    });
  });
  return result;
}

export { default as AttributesEditor } from './AttributesEditor.vue';
export { default as BreadCrumb } from './BreadCrumb.vue';
export { default as ConfigurationsDialog } from './ConfigurationsDialog.vue';
export { default as ContextMenu } from './ContextMenu.vue';
export { default as CustomClassList } from './CustomClassList.vue';
export { default as CustomStylesPanel } from './CustomStylesPanel.vue';
export { default as CustomWrapperMenu } from './CustomWrapperMenu.vue';
export { default as CustomMarkMenu } from './CustomMarkMenu.vue';
export { default as DraggableDialog } from './DraggableDialog.vue';
export { default as ExportDialog } from './ExportDialog.vue';
export { default as ExportToolbarButton } from './ExportToolbarButton.vue';
export { default as ImportDialog } from './ImportDialog.vue';
export { default as ImportToolbarButton } from './ImportToolbarButton.vue';
export { default as InputTextDialog } from './InputTextDialog.vue';
export { default as InsertNoteButton } from './InsertNoteButton.vue';
// export { default as Menubar } from './Menubar.vue'
export { default as NewDocumentButton } from './NewDocumentButton.vue';
export { default as NodeOrMarkContextMenu } from './NodeOrMarkContextMenu.vue';
export { default as PendingOperationDialog } from './PendingOperationDialog.vue';
export type { PendingOperation, PendingOperationType } from './helpers/pending';
export { default as ProjectStructureDialog } from './ProjectStructureDialog.vue';
export { default as RawInlineMenu } from './RawInlineMenu.vue';
export { default as SearchAndReplace } from './SearchAndReplace.vue';
export { default as ShowMessageDialog } from './ShowMessageDialog.vue';
export { default as CustomBlocksButtons } from './CustomBlocksButtons.vue';
export { default as TableTools } from './TableTools.vue';
export { default as ToolbarButton } from './ToolbarButton.vue';

export { default as ClassesEditor } from './attreditors/ClassesEditor.vue';
export { default as CustomStyleEditor } from './attreditors/CustomStyleEditor.vue';
export { default as IntegerEditor } from './attreditors/IntegerEditor.vue';
export { default as LevelEditor } from './attreditors/LevelEditor.vue';
export { default as OtherAttributesEditor } from './attreditors/OtherAttributesEditor.vue';
export { default as TextAttrEditor } from './attreditors/TextAttrEditor.vue';

export { default as EmptySpanView } from './nodeviews/EmptySpanView.vue';
export { default as IndexRefView } from './nodeviews/IndexRefView.vue';
export { default as MetaBoolView } from './nodeviews/MetaBoolView.vue';
export { default as MetadataView } from './nodeviews/MetadataView.vue';
export { default as MetaMapView } from './nodeviews/MetaMapView.vue';
export { default as NoteView } from './nodeviews/NoteView.vue';
export { default as RawBlockView } from './nodeviews/RawBlockView.vue';
