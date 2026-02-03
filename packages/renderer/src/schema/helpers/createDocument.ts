import type { PandocJsonDocument } from '../../pandoc';
import {
  PandocJsonParser,
  PANDOC_JSON_PARSER_RULES,
  PandocJsonParserOptions,
} from './PandocJsonParser';
import { Node, Schema } from '@tiptap/pm/model';
import type { CommandProps } from '@tiptap/vue-3';

export interface CreateDocumentOptions extends PandocJsonParserOptions {
  emitUpdate?: boolean
}

export function createDocumentNodeFromJson(
  json: string | PandocJsonDocument,
  schema: Schema,
  options?: CreateDocumentOptions
): Node | null {
  let { indices, noteStyles } = options || {};
  indices = indices ? JSON.parse(JSON.stringify(indices)) : [];
  noteStyles = noteStyles ? JSON.parse(JSON.stringify(noteStyles)) : [];
  const pandocParser = new PandocJsonParser(
    schema,
    PANDOC_JSON_PARSER_RULES,
    {
      indices,
      noteStyles,
    },
  );
  const document = pandocParser.parse(json);
  if (!document)
    return null;
  // const pandocParser2 = new PandocJsonParser(
  //   schema,
  //   PANDOC_JSON_PARSER_RULES
  // );
  // const document2 = pandocParser2.parse(json);
  // console.log(document);
  // console.log(document2);
  // console.log(`JSON.stringify(document1): ${JSON.stringify(document)}`);
  // console.log(`JSON.stringify(document2): ${JSON.stringify(document2)}`);
  const reparsedDocument = JSON.parse(JSON.stringify(document));
  return Node.fromJSON(schema, reparsedDocument);
}

export const createDocumentCommand =
  (json: string | PandocJsonDocument, options?: CreateDocumentOptions) =>
    (props: CommandProps) => {
      const { dispatch, state, tr } = props;
      const { doc } = tr;
      try {
        const docNode = createDocumentNodeFromJson(json, state.schema, options)
        if (!docNode) return false
        if (dispatch) {
          dispatch(
            tr
              .replaceWith(0, doc.content.size, docNode)
              .setMeta('preventUpdate', !options?.emitUpdate),
          );
        }
        return true;
      } catch (err) {
        console.log(err)
        return false
      }
    };
