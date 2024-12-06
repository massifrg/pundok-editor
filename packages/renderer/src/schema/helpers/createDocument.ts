import type { PandocJsonDocument } from '../../pandoc';
import {
  PandocJsonParser,
  PANDOC_JSON_PARSER_RULES,
  PandocJsonParserOptions,
} from './PandocJsonParser';
import { Node } from '@tiptap/pm/model';
import type { CommandProps } from '@tiptap/vue-3';

export interface CreateDocumentOptions extends PandocJsonParserOptions {
  emitUpdate?: boolean;
}

export const createDocument =
  (json: string | PandocJsonDocument, options?: CreateDocumentOptions) =>
  (props: CommandProps) => {
    const { dispatch, state, tr } = props;
    const { doc } = tr;
    let { indices, noteStyles, emitUpdate } = options || {};
    indices = indices ? JSON.parse(JSON.stringify(indices)) : [];
    noteStyles = noteStyles ? JSON.parse(JSON.stringify(noteStyles)) : [];
    const pandocParser = new PandocJsonParser(
      state.schema,
      PANDOC_JSON_PARSER_RULES,
      {
        indices,
        noteStyles,
      },
    );
    const document = pandocParser.parse(json);
    // const pandocParser2 = new PandocJsonParser(
    //   schema,
    //   PANDOC_JSON_PARSER_RULES
    // );
    // const document2 = pandocParser2.parse(json);
    // console.log(document);
    // console.log(document2);
    // console.log(`JSON.stringify(document1): ${JSON.stringify(document)}`);
    // console.log(`JSON.stringify(document2): ${JSON.stringify(document2)}`);
    if (!document) return false;
    const reparsedDocument = JSON.parse(JSON.stringify(document));
    const docNode = Node.fromJSON(state.schema, reparsedDocument);

    if (dispatch) {
      dispatch(
        tr
          .replaceWith(0, doc.content.size, docNode)
          .setMeta('preventUpdate', !emitUpdate),
      );
    }
    return true;
  };
