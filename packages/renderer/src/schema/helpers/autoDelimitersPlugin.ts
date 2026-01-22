import { Mark } from "@tiptap/pm/model";
import { EditorState, Plugin, PluginKey } from "@tiptap/pm/state";
import { NodeWithPos } from "@tiptap/vue-3";
import { changedRanges } from "./whatChanged";
import {
  AutoDelimitedMarkDefinition,
  defaultDelimiterForMark,
  DelimiterForMarkFunction,
  fixAutoDelimitersTransaction,
} from "./autoDelimiters";
import { MARK_NAME_DOUBLE_QUOTED, MARK_NAME_SINGLE_QUOTED } from "../../common";
import { isString } from "lodash-es";

export const REGISTER_AUTO_DELIMITER = 'register-auto-delimiter'

class AutoDelimitersState {
  delimiterForMark: DelimiterForMarkFunction = defaultDelimiterForMark

  constructor(readonly marks: Mark[], delimiterForMark?: DelimiterForMarkFunction) {
    this.delimiterForMark = delimiterForMark || this.delimiterForMark
  }

  setAutodelimitedMarks(state: EditorState, markDefs: AutoDelimitedMarkDefinition[]): AutoDelimitersState {
    const marks: Mark[] = [];
    const delimiters: string[][] = [];
    const schema = state.schema;
    if (schema) {
      markDefs.forEach(
        ({ typeName, attrs, openingDelimiter, closingDelimiter }) => {
          if (typeName) {
            const mark = schema.marks[typeName].create(attrs);
            if (mark) {
              marks.push(mark);
              delimiters.push([openingDelimiter, closingDelimiter]);
            }
          }
        },
      );
    }
    const delimiterForMark: DelimiterForMarkFunction = (mark, isOpen) => {
      const index = marks.findIndex((m) =>
        isString(mark) ? m.type.name === mark : mark.eq(m),
      );
      if (index >= 0) return delimiters[index][isOpen ? 0 : 1];
      return '"';
    };
    return new AutoDelimitersState(marks, delimiterForMark)
  }

  apply(
    state: EditorState,
    autoDelimiters: Record<string, string[]>,
  ): AutoDelimitersState {
    const markDefs: AutoDelimitedMarkDefinition[] = [];
    Object.keys(autoDelimiters).forEach((k) => {
      let typeName = k;
      const lk = k.toLowerCase();
      if (lk === 'singlequote' || lk === 'singlequoted')
        typeName = MARK_NAME_SINGLE_QUOTED;
      else if (lk === 'doublequote' || lk === 'doublequoted')
        typeName = MARK_NAME_DOUBLE_QUOTED;
      const delimiters = autoDelimiters[k];
      markDefs.push({
        typeName,
        openingDelimiter: delimiters[0] || '"',
        closingDelimiter: delimiters[1] || '"',
      });
    });
    return this.setAutodelimitedMarks(state, markDefs);
  }
}

export const autoDelimitersPluginKey = new PluginKey('autoDelimiters')

export const getAutoDelimitersState: (state: EditorState) => AutoDelimitersState =
  (state) => autoDelimitersPluginKey.getState(state)

export const autoDelimitersPlugin = new Plugin({
  key: autoDelimitersPluginKey,
  state: {
    init: function (): AutoDelimitersState {
      return new AutoDelimitersState([])
    },
    apply: function (tr, adState: AutoDelimitersState, oldState, newState): AutoDelimitersState {
      const autoDelimitersDefs: Record<string, string[]> = tr.getMeta(REGISTER_AUTO_DELIMITER)
      if (autoDelimitersDefs)
        return adState.apply(newState, autoDelimitersDefs)
      return adState
    }
  },
  appendTransaction(transactions, oldState, newState) {
    const adm = getAutoDelimitersState(newState).marks || []
    // search for the widest range containing all the changes
    // consider only changes that modify content or add/remove autodelimited marks
    const changes = changedRanges(transactions);
    if (changes.length === 0) return undefined;
    const interestingChanges = changes.filter(
      (cr) =>
        (cr.isContent && !(cr.isInsertion && cr.deltaContent === 1)) ||
        (cr.isMark &&
          (cr.isMarkRemoval ||
            adm.find((m) => cr.mark && cr.mark.eq(m)))),
    );
    // logDocChanges(changes);
    if (interestingChanges.length === 0) return undefined;
    if (interestingChanges.length > 0) {
      // logDocChanges(interestingChanges);
      let minFrom: number | undefined;
      let maxTo: number | undefined;
      changes.forEach(({ from, to, isContent, isMark }) => {
        if (isContent || isMark) {
          minFrom = !minFrom || from < minFrom ? from : minFrom;
          maxTo = !maxTo || to > maxTo ? to : maxTo;
        }
      });

      const paras: NodeWithPos[] = [];
      try {
        newState.doc.nodesBetween(minFrom!, maxTo!, (node, pos) => {
          if (node?.inlineContent) {
            paras.push({ node, pos });
            // return false;
          }
          return true;
        });
      } catch {
        // console.log(`minFrom=${minFrom}, maxTo=${maxTo}`);
      }
      paras.sort((p1, p2) => p2.pos - p1.pos);

      return fixAutoDelimitersTransaction(newState, paras, adm);
    }
  },
})