# CSS selectors

The app uses CSS-like selectors to select ProseMirror nodes and marks. They are
used by the **CSS selector search** mode and by project automations that operate
on document elements. Selection is implemented in
`packages/renderer/src/schema/helpers/cssSelection.ts`; this is not a browser
CSS engine, so only the syntax and matching rules described here are supported.

## Basic selectors

Selectors can match:

- a type name, such as `paragraph` or `emph`;
- an ID, such as `#introduction`;
- a class, such as `.important`;
- an attribute, such as `[id=introduction]` or `[classes~=important]`;
- the universal selector, `*`;
- a compound selector, such as `heading.important`;
- a selector list, such as `h1, h2`;
- combinators:
  - whitespace for a descendant;
  - `>` for a child;
  - `+` for the adjacent sibling;
  - `~` for a following sibling.

Alias names are looked up case-insensitively; lowercase type names are the
safest spelling for internal ProseMirror types. IDs and class names are matched
against the node or mark attributes. Attribute selectors also see the virtual
attributes described below. The usual attribute operators are supported: `=`,
`~=`, `|=`, `^=`, `$=`, and `*=`.

Attribute names may be written in camel case or kebab case. The matcher treats
the camel-case spelling as equivalent to the corresponding kebab-case spelling
when looking in Pandoc key/value attributes. For example, these selectors are
equivalent:

```css
p[customStyle=myStyle]
p[custom-style=myStyle]
span[customStyle=myStyle]
span[custom-style=myStyle]
```

This is useful because paragraph custom styles can be stored in the dedicated
`customStyle` attribute, while span custom styles are stored in the Pandoc
key/value map under `custom-style`.

For example:

```css
heading[level="2"]
.important
paragraph > emph
Quoted[quoteType=DoubleQuote]
```

The selector parser may accept CSS syntax that the matcher does not implement.
Unsupported pseudo-elements, combinators, or other AST forms cause selection to
fail rather than being silently ignored.

## Equivalent tags

Type tags are case-insensitive. A selector may use the ProseMirror `Node` or
`Mark` name, the corresponding Pandoc `Block`, `Inline`, or `MetaValue`
constructor name, or an HTML name where one is defined. The complete
`NORMALIZED_NAME` equivalence table is:

  | ProseMirror Node or Mark                   | Pandoc constructor          | HTML name(s) and other aliases |
  | ---                                        | ---                         | ---                            |
  | `plain`                                    | `Plain`                     | `plain`                        |
  | `paragraph`                                | `Para`                      | `p`, `para`                    |
  | `lineBlock`                                | `LineBlock`                 | `lineblock`                    |
  | `codeBlock`                                | `CodeBlock`                 | `codeblock`, `pre`             |
  | `rawBlock`                                 | `RawBlock`                  | `rawblock`                     |
  | `blockquote`                               | `BlockQuote`                | `blockquote`                   |
  | `orderedList`                              | `OrderedList`               | `orderedlist`, `ol`            |
  | `bulletList`                               | `BulletList`                | `bulletlist`, `ul`             |
  | `definitionList`                           | `DefinitionList`            | `definitionlist`, `dl`         |
  | `heading`                                  | `Header`                    | `header`                       |
  | `heading` with `level=1` through `level=6` | `Header`                    | `h1` through `h6`              |
  | `horizontalRule`                           | `HorizontalRule`            | `hr`                           |
  | `pandocTable`                              | `Table`                     | `table`                        |
  | `figure`                                   | `Figure`                    | `figure`                       |
  | `div`                                      | `Div`                       | `div`                          |
  | `emph`                                     | `Emph`                      | `emph`, `em`, `i`              |
  | `underline`                                | `Underline`                 | `underline`, `u`               |
  | `strong`                                   | `Strong`                    | `strong`, `b`                  |
  | `strikeout`                                | `Strikeout`                 | `strikeout`, `s`, `del`        |
  | `superscript`                              | `Superscript`               | `superscript`, `sup`           |
  | `subscript`                                | `Subscript`                 | `subscript`, `sub`             |
  | `smallcaps`                                | `SmallCaps`                 | `smallcaps`                    |
  | `cite`                                     | `Cite`                      | `cite`                         |
  | `code`                                     | `Code`                      | `code`                         |
  | `hardBreak` with `soft=false`              | `LineBreak`                 | `br`, `linebreak`              |
  | `hardBreak` with `soft=true`               | `SoftBreak`                 | `softbreak`                    |
  | `doubleQuoted`                             | `Quoted` with `DoubleQuote` | `dq`                           |
  | `singleQuoted`                             | `Quoted` with `SingleQuote` | `sq`                           |
  | `math`                                     | `Math`                      | `math`                         |
  | `rawInline`                                | `RawInline`                 | `rawinline`                    |
  | `link`                                     | `Link`                      | `link`, `a`                    |
  | `image`                                    | `Image`                     | `image`, `img`                 |
  | `note`                                     | `Note`                      | `note`                         |
  | `span`                                     | `Span`                      | `span`                         |
  | `singleQuoted` or `doubleQuoted`           | `Quoted`                    | `quoted`, `q`                  |
  | `metaMap`                                  | `MetaMap`                   | `metamap`                      |
  | `metaList`                                 | `MetaList`                  | `metalist`                     |
  | `metaBool`                                 | `MetaBool`                  | `metabool`                     |
  | `metaString`                               | `MetaString`                | `metastring`                   |
  | `metaInlines`                              | `MetaInlines`               | `metainlines`                  |
  | `metaBlocks`                               | `MetaBlocks`                | `metablocks`                   |
  | `customStyle` or `custom-style`            | —                           | `§` or `:cs` pseudo-class      |

`Str` and `Space` both map to ProseMirror text because the editor stores both
Pandoc inline constructors as text nodes. Similarly, `LineBreak` and `SoftBreak`
are represented by one `hardBreak` node with different `soft` attributes.
Pandoc's `Quoted` inline is represented by the `singleQuoted` and `doubleQuoted`
marks.

The aliases are useful when a selector is intended to describe Pandoc elements.
For example, `header` and `heading` select the same node type, while `h2`
selects only level-two headings:

```css
header
h2
```

Aliases are applied to type selectors and to type comparisons used by
type-related pseudo-classes. Matching is still against the editor's underlying
ProseMirror node or mark.

### Virtual attributes

Some Pandoc concepts are represented by a different ProseMirror shape. The
matcher adds virtual attributes so that they can still be selected with
attribute selectors:

- `doubleQuoted` has `quoteType=DoubleQuote`;
- `singleQuoted` has `quoteType=SingleQuote`;
- `paragraph` exposes its custom style as both `customStyle` and
  `kv["custom-style"]`; equivalent camel-case and kebab-case spellings are
  supported for key/value attributes.

For example:

```css
Quoted[quoteType=DoubleQuote]
paragraph[custom-style="Body Text"]
```

## Pseudo-classes

The following pseudo-classes are implemented by `nomMatchesPseudoClass`.
Pseudo-class names are written in lowercase.

### Text predicates

These predicates inspect a node's `textContent`. When the selector matches a
mark, they inspect the containing parent node instead:

  | Pseudo-class                   | Meaning                                                                                         |
  | ---                            | ---                                                                                             |
  | `:contains(text)`              | Text contains the argument; the argument may be unquoted or single-/double-quoted               |
  | `:text-starts-with(text)`      | Text starts with the argument; the argument may be unquoted or single-/double-quoted            |
  | `:text-ends-with(text)`        | Text ends with the argument; the argument may be unquoted or single-/double-quoted              |
  | `:text-matches-regex(pattern)` | Text matches a JavaScript regular expression; the pattern may optionally be enclosed in `/.../` |

The arguments to the text predicates may be unquoted or enclosed in matching
single or double quotes. Inside a quoted argument, escape the matching quote
with a backslash, for example `:contains('it\'s')` or
`:contains("say \"hello\"")`. The regular-expression argument may additionally
be enclosed in slash delimiters: `:text-matches-regex(/^Summary:/)`. The
delimiters are removed before the pattern is passed to JavaScript's `RegExp`
constructor. Escape a slash inside a slash-delimited pattern with `\`, as in
`:text-matches-regex(/path\/to\/file/)`. An invalid expression simply does not
match.

Examples:

```css
paragraph:contains("Pandoc")
heading:text-starts-with("Chapter")
paragraph:text-matches-regex("^Summary:")
```

### Custom styles

`:cs(style)` matches a node or mark whose custom style is `style`. Its argument
may be unquoted or enclosed in matching single or double quotes; escape the
matching quote with a backslash. It checks both the dedicated `customStyle`
attribute and the Pandoc key/value attribute `custom-style`, so it is shorthand
for an equivalent custom-style attribute selector:

```css
p:cs(myStyle)
p[customStyle=myStyle]
p:cs("myStyle")
```

### Structural predicates

Structural pseudo-classes use the element's child index and its parent. Child
indexes are zero-based internally.

  | Pseudo-class           | Meaning                                                                                  |
  | ---                    | ---                                                                                      |
  | `:first-child`         | The element has child index 0                                                            |
  | `:last-child`          | The element is the parent's last child                                                   |
  | `:nth-child(n)`        | The element has the requested one-based ordinal, subject to the current matcher behavior |
  | `:only-child`          | The parent has exactly one child                                                         |
  | `:first-of-type`       | The element is the first matching type among its siblings                                |
  | `:last-of-type`        | The element is the last matching type among its siblings                                 |
  | `:nth-of-type(n)`      | The element is the requested matching-type ordinal                                       |
  | `:nth-last-of-type(n)` | The element is the requested matching-type ordinal counted from the end                  |
  | `:nth-last-child(n)`   | The element is the requested ordinal counted from the end                                |
  | `:only-of-type`        | Exactly one sibling has the same type                                                    |

The numeric forms parse their argument with `parseInt`; expressions such as
`2n+1` are not supported. The implementation currently uses a truthiness check
for the index in `:last-child` and `:nth-child`, so the first child does not
match `:last-child` or `:nth-child(1)`. Use `:first-child` for the first child.

Examples:

```css
paragraph:first-child
heading:nth-of-type(2)
paragraph:last-of-type
```

### Logical and type predicates

  | Pseudo-class              | Meaning                                                                 |
  | ---                       | ---                                                                     |
  | `:not(selector)`          | Matches when the supplied selector does not match the same node or mark |
  | `:where(type1,type2,...)` | Matches when the node or mark has one of the listed type names          |

`:where()` is intentionally narrower than the browser version: its
comma-separated arguments are interpreted as type names, not arbitrary
selectors. Type aliases such as `p`, `header`, and `h1` are honored.

Examples:

```css
paragraph:not(.draft)
:where(p,heading,emph)
```

## Matching notes

- A selector can return both nodes and marks.
- A mark is associated with the text node that carries it for traversal and
  sibling matching.
- `cssSelect` can optionally merge adjacent results carrying the same mark.
- Empty selectors are valid and select nothing.
- Selector validation only checks whether `parsel-js` can parse the string;
  matching support is limited to the rules in this document.
