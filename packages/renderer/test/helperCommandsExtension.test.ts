import { describe, expect, it } from 'vitest';
import { Schema } from '@tiptap/pm/model';
import {
  EditorState,
  NodeSelection,
  type Command,
  type Transaction,
} from '@tiptap/pm/state';
import {
  addPandocAttributeCommand,
  addPandocAttrClassCommand,
  removePandocAttributeCommand,
  removePandocAttrClassCommand,
  renamePandocAttributeCommand,
  renamePandocAttrClassCommand,
} from '../src/schema/extensions/HelperCommandsExtension';

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    div: {
      content: 'block+',
      group: 'block',
      attrs: {
        classes: { default: [] },
        kv: { default: {} },
      },
    },
    paragraph: { content: 'text*', group: 'block' },
    text: { group: 'inline' },
  },
});

function makeState() {
  const paragraph = schema.nodes.paragraph.create(null, schema.text('text'));
  const innerDiv = schema.nodes.div.create(
    { classes: ['old'], kv: { old: 'inner' } },
    paragraph,
  );
  const outerDiv = schema.nodes.div.create(
    { classes: ['old'], kv: { old: 'outer' } },
    [innerDiv, paragraph],
  );
  const doc = schema.nodes.doc.create(null, outerDiv);
  return EditorState.create({
    doc,
    selection: NodeSelection.create(doc, 0),
  });
}

function applyCommand(
  state: EditorState,
  command: Command,
) {
  let transaction: Transaction | undefined;
  command(state, (tr) => {
    transaction = tr;
  });
  expect(transaction).toBeDefined();
  return state.apply(transaction!);
}

describe('Pandoc attribute class commands', () => {
  it('updates only the selected node for a NodeSelection', () => {
    const state = makeState();
    const nextState = applyCommand(
      state,
      addPandocAttrClassCommand('added', schema.nodes.div),
    );

    expect(nextState.doc.child(0).attrs.classes).toEqual(['old', 'added']);
    expect(nextState.doc.child(0).child(0).attrs.classes).toEqual(['old']);
  });

  it.each([
    ['remove', removePandocAttrClassCommand('old', schema.nodes.div), []],
    ['rename', renamePandocAttrClassCommand('old', 'renamed', schema.nodes.div), ['renamed']],
  ] as const)(
    'updates only the selected node when it can apply: %s',
    (_, command, expectedOuterClasses) => {
      const state = makeState();
      const nextState = applyCommand(state, command);

      expect(nextState.doc.child(0).attrs.classes).toEqual(expectedOuterClasses);
      expect(nextState.doc.child(0).child(0).attrs.classes).toEqual(['old']);
    },
  );

  it.each([
    ['add', addPandocAttributeCommand('added', 'value', schema.nodes.div), { old: 'outer', added: 'value' }],
    ['remove', removePandocAttributeCommand('old', schema.nodes.div), {}],
    ['rename', renamePandocAttributeCommand('old', 'renamed', schema.nodes.div), { renamed: 'outer' }],
  ] as const)(
    'updates only the selected node attributes when it can apply: %s',
    (_, command, expectedOuterAttributes) => {
      const state = makeState();
      const nextState = applyCommand(state, command);

      expect(nextState.doc.child(0).attrs.kv).toEqual(expectedOuterAttributes);
      expect(nextState.doc.child(0).child(0).attrs.kv).toEqual({ old: 'inner' });
    },
  );
});
