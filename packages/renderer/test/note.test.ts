import { describe, expect, it } from 'vitest';
import { Schema } from '@tiptap/pm/model';
import {
  EditorState,
  NodeSelection,
  TextSelection,
  type Transaction,
} from '@tiptap/pm/state';
import { insertNoteCommand, noteToTextCommand } from '../src/schema/nodes/Note';

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'inline*', group: 'block' },
    plain: { content: 'inline*', group: 'block' },
    text: { group: 'inline' },
    note: { inline: true, group: 'inline', atom: true, content: 'block+' },
  },
});

function makeState(
  selection: 'inside' | 'node',
  noteContent: 'paragraph' | 'plain' | 'blocks' = 'paragraph',
  hasAfterText = true,
) {
  const paragraph = schema.nodes.paragraph;
  const content =
    noteContent === 'plain'
      ? schema.nodes.plain.create(null, schema.text('note text'))
      : noteContent === 'blocks'
        ? [
            paragraph.create(null, schema.text('first block')),
            paragraph.create(null, schema.text('second block')),
          ]
        : paragraph.create(null, schema.text('note text'));
  const note = schema.nodes.note.create(null, content);
  const doc = schema.nodes.doc.create(
    null,
    paragraph.create(
      null,
      hasAfterText
        ? [schema.text('before'), note, schema.text('after')]
        : [schema.text('before'), note],
    ),
  );
  const notePos = 1 + 'before'.length;
  const editorSelection =
    selection === 'node'
      ? NodeSelection.create(doc, notePos)
      : TextSelection.create(doc, notePos + 3);
  return EditorState.create({ doc, selection: editorSelection });
}

describe('noteToTextCommand', () => {
  it.each(['paragraph', 'plain'] as const)(
    'replaces a note with the inlines of a single %s',
    (noteContent) => {
      const state = makeState('inside', noteContent);
      let transaction: Transaction | undefined;

      expect(
        noteToTextCommand(state, (tr) => {
          transaction = tr;
        }),
      ).toBe(true);

      expect(transaction).toBeDefined();
      expect(state.apply(transaction!).doc.toString()).toBe(
        'doc(paragraph("beforenote textafter"))',
      );
    },
  );

  it.each(['inside', 'node'] as const)(
    'splits the containing block for multi-block note content with a %s selection',
    (selection) => {
      const state = makeState(selection, 'blocks');
      let transaction: Transaction | undefined;

      expect(
        noteToTextCommand(state, (tr) => {
          transaction = tr;
        }),
      ).toBe(true);

      expect(transaction).toBeDefined();
      expect(state.apply(transaction!).doc.toString()).toBe(
        'doc(paragraph("before"), paragraph("first block"), paragraph("second block"), paragraph("after"))',
      );
    },
  );
});

it('inserts trailing multi-block note content after the current paragraph', () => {
  const state = makeState('inside', 'blocks', false);
  let transaction: Transaction | undefined;

  expect(
    noteToTextCommand(state, (tr) => {
      transaction = tr;
    }),
  ).toBe(true);

  expect(transaction).toBeDefined();
  expect(state.apply(transaction!).doc.toString()).toBe(
    'doc(paragraph("before"), paragraph("first block"), paragraph("second block"))',
  );
});

it('inserts only the selected part of a paragraph into a note', () => {
  const noteSchema = new Schema({
    nodes: {
      doc: { content: 'block+' },
      paragraph: { content: 'inline*', group: 'block' },
      text: { group: 'inline' },
      note: {
        inline: true,
        group: 'inline',
        atom: true,
        content: 'block+',
        attrs: { noteType: { default: 'footnote' }, kv: { default: null } },
      },
    },
  });
  const paragraph = noteSchema.nodes.paragraph;
  const doc = noteSchema.nodes.doc.create(
    null,
    paragraph.create(null, noteSchema.text('one two three')),
  );
  const state = EditorState.create({
    doc,
    selection: TextSelection.create(doc, 5, 8),
  });
  let transaction: Transaction | undefined;

  expect(
    insertNoteCommand({
      noteTypes: ['footnote'],
      HTMLAttributes: {},
      placeHolderText: () => 'footnote text',
    })(state, (tr) => {
      transaction = tr;
    }),
  ).toBe(true);

  expect(transaction).toBeDefined();
  expect(state.apply(transaction!).doc.toString()).toBe(
    'doc(paragraph("one ", note(paragraph("two")), " three"))',
  );
});
