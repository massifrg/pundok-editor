type Delimiters = [open: string, close: string];

/** automatic delimiters for Marks like singleQuoted or doubleQuoted,
   * e.g. { doubleQuoted: [ "“", "”" ], singleQuoted: [ "‘", "’" ] } */
export interface AutoDelimitersDef extends Record<string, Delimiters> {
  SingleQuote: Delimiters;
  DoubleQuote: Delimiters;
}