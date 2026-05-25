import { NamedAndDescribed } from "./types";

/**
 * A `Span`, with eventual `Attr`'s classes and attributes that can be added as a result
 * of a replacement in search/replace operations.
 * It's an extendend version of applying a custom style `Span` to selected portions of text.
 */
export interface CustomSpan extends NamedAndDescribed {
  icon?: string;
  /** The classes that the `Span` will have. */
  classes?: string[];
  /** The attributes that the `Span` will have. */
  kv?: Record<string, string>;
}

