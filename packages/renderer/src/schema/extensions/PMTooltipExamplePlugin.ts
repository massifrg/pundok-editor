import { Extension } from '@tiptap/core';
import type { EditorState } from '@tiptap/pm/state';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

export const PMTooltipPluginExtension = Extension.create({
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('pmTooltipExamplePlugin'),
        view(editorView) {
          return new SelectionSizeTooltip(editorView);
        },
      }),
    ];
  },
});

class SelectionSizeTooltip {
  tooltip: HTMLElement | null = null;

  constructor(view: EditorView) {
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'tooltip';
    if (view.dom.parentNode) view.dom.parentNode.appendChild(this.tooltip);

    this.update(view, null);
  }

  update(view: EditorView, lastState: EditorState | null) {
    const state = view.state;
    // Don't do anything if the document/selection didn't change
    if (
      lastState &&
      lastState.doc.eq(state.doc) &&
      lastState.selection.eq(state.selection)
    )
      return;

    // Hide the tooltip if the selection is empty
    if (state.selection.empty) {
      if (this.tooltip) this.tooltip.style.display = 'none';
      return;
    }

    // Otherwise, reposition it and update its content
    const tooltip = this.tooltip;
    if (tooltip) {
      tooltip.style.display = '';
      const { from, to } = state.selection;
      // These are in screen coordinates
      const start = view.coordsAtPos(from),
        end = view.coordsAtPos(to);
      // The box in which the tooltip is positioned, to use as base
      if (tooltip.offsetParent) {
        const box = tooltip.offsetParent.getBoundingClientRect();
        // Find a center-ish x position from the selection endpoints (when
        // crossing lines, end may be more to the left)
        const left = Math.max((start.left + end.left) / 2, start.left + 3);
        tooltip.style.left = left - box.left + 'px';
        tooltip.style.bottom = box.bottom - start.top + 'px';
        tooltip.textContent = (to - from).toString();
      }
    }
  }

  destroy() {
    if (this.tooltip) this.tooltip.remove();
  }
}
