export const PANDOC_TYPES_VERSION = [1, 23, 1];

export const DEFAULT_IMPORT_PANDOC_OPTIONS = ['--wrap=none'];

export type PandocOptionType = 'general' | 'reader' | 'writer';
export type PandocOptionValueType =
  | 'flag'
  | 'boolean'
  | 'number'
  | 'FORMAT'
  | 'FILE'
  | 'URL'
  | 'DIRECTORY'
  | 'CLASSES'
  | 'EXTENSION'
  | 'PROGRAM'
  | 'SCRIPT'
  | 'KEY_VAL'
  | 'accept|reject|all'
  | 'FILE|URL'
  | 'NAME_VAL'
  | 'crlf|lf|native'
  | 'auto|none|preserve'
  | 'STYLE|FILE'
  | 'SEARCHPATH'
  | 'block|section|document'
  | 'above|below'
  | 'setext|atx'
  | 'default|section|chapter|part'
  | 'NUMBER[,NUMBER,…]'
  | 'none|javascript|references'
  | 'STRING'
  | 'PATHTEMPLATE'
  | 'all|none|best';

/**
 * An command line option of pandoc.
 */
export interface PandocOption {
  /** The type of this option */
  type: PandocOptionType;
  /** The option name(s) without the initial `-` or `--`. */
  name: string[];
  /** The type of its value (if any). */
  valueType: PandocOptionValueType | PandocOptionValueType[];
  /** The description('s lines). */
  description?: string | string[];
  /** The description URL in Pandoc's online Manual */
  descriptionUrl?: string;
  /** This option is not used in conversions, but for general information about pandoc's version. */
  notForConversion?: boolean;
  /** This option can be specified more than once. */
  multiple?: boolean;
  /** This option is used or pertinent only with the specified formats. */
  formats?: string[];
}

/** Every flavour of HTML output. */
const ALL_HTML = ['chunkedhtml', 'html', 'html4', 'html5'];
/** Every flavour of Markdown output. */
const ALL_MARKDOWN = [
  'markdown',
  'markdown_github',
  'markdown_mmd',
  'markdown_phpextra',
  'markdown_strict',
  'gfm',
  'commonmark',
  'commonmark_x',
];
/** Every flavour of Roff output. */
const ALL_ROFF = ['man', 'ms'];
/** Every flavour of HTML slides output. */
const ALL_HTML_SLIDES = ['slidy', 's5', 'slideous', 'dzslides', 'revealjs'];
/** Every flavour of slides output. */
const ALL_SLIDES = [...ALL_HTML_SLIDES, 'beamer', 'pptx'];
/** Every flavour of XML output. */
const ALL_DOCBOOK = ['docbook', 'docbook4', 'docbook5'];
/** Every flavour of JATS output. */
const ALL_JATS = [
  'jats',
  'jats_archiving',
  'jats_articleauthoring',
  'jats_publishing',
];
/** Every flavour of XML output. */
const ALL_XML = [...ALL_DOCBOOK, ...ALL_JATS, 'tei', 'bits'];
/** Every flavour of EPUB output. */
const ALL_EPUB = ['epub', 'epub2', 'epub3'];

const PANDOC_OPTIONS: PandocOption[] = [
  {
    type: 'general',
    name: ['f', 'from', 'r', 'read'],
    valueType: 'FORMAT',
    description: 'Specify input format.',
  },
  {
    type: 'general',
    name: ['t', 'to', 'w', 'write'],
    valueType: 'FORMAT',
    description: 'Specify output format.',
  },
  {
    type: 'general',
    name: ['o', 'output'],
    valueType: 'FILE',
    description:
      'Write output to FILE instead of stdout. If FILE is -, output will go to stdout, even if a non-textual format (docx, odt, epub2, epub3) is specified. If the output format is chunkedhtml and FILE has no extension, then instead of producing a .zip file pandoc will create a directory FILE and unpack the zip archive there (unless FILE already exists, in which case an error will be raised).',
  },
  {
    type: 'general',
    name: ['data-dir'],
    valueType: 'DIRECTORY',
    description:
      'Specify the user data directory to search for pandoc data files. If this option is not specified, the default user data directory will be used. On *nix and macOS systems this will be the pandoc subdirectory of the XDG data directory (by default, $HOME/.local/share, overridable by setting the XDG_DATA_HOME environment variable). If that directory does not exist and $HOME/.pandoc exists, it will be used (for backwards compatibility). On Windows the default user data directory is %APPDATA%\\pandoc. You can find the default user data directory on your system by looking at the output of pandoc --version. Data files placed in this directory (for example, reference.odt, reference.docx, epub.css, templates) will override pandoc’s normal defaults. (Note that the user data directory is not created by pandoc, so you will need to create it yourself if you want to make use of it.)',
  },
  {
    type: 'general',
    name: ['d', 'defaults'],
    valueType: 'FILE',
    description:
      'Specify a set of default option settings. FILE is a YAML file whose fields correspond to command-line option settings. All options for document conversion, including input and output files, can be set using a defaults file. The file will be searched for first in the working directory, and then in the defaults subdirectory of the user data directory (see --data-dir). The .yaml extension may be omitted. See the section Defaults files for more information on the file format. Settings from the defaults file may be overridden or extended by subsequent options on the command line.',
  },
  {
    type: 'general',
    name: ['bash-completion'],
    valueType: 'flag',
    description: 'Generate a bash completion script.',
    notForConversion: true,
  },
  {
    type: 'general',
    name: ['verbose'],
    valueType: 'flag',
    description: 'Give verbose debugging output.',
  },
  {
    type: 'general',
    name: ['quiet'],
    valueType: 'flag',
    description: 'Suppress warning messages.',
  },
  {
    type: 'general',
    name: ['fail-if-warnings'],
    valueType: 'boolean',
    description: 'Exit with error status if there are any warnings.',
  },
  {
    type: 'general',
    name: ['log'],
    valueType: 'FILE',
    description:
      'Write log messages in machine-readable JSON format to FILE. All messages above DEBUG level will be written, regardless of verbosity settings (--verbose, --quiet).',
  },
  {
    type: 'general',
    name: ['list-input-formats'],
    valueType: 'flag',
    description: 'List supported input formats, one per line.',
    notForConversion: true,
  },
  {
    type: 'general',
    name: ['list-output-formats'],
    valueType: 'flag',
    description: 'List supported output formats, one per line.',
    notForConversion: true,
  },
  {
    type: 'general',
    name: ['list-extensions'],
    valueType: 'FORMAT',
    description:
      'List supported extensions for FORMAT, one per line, preceded by a + or - indicating whether it is enabled by default in FORMAT. If FORMAT is not specified, defaults for pandoc’s Markdown are given.',
    notForConversion: true,
  },
  {
    type: 'general',
    name: ['list-highlight-languages'],
    valueType: 'flag',
    description:
      'List supported languages for syntax highlighting, one per line.',
    notForConversion: true,
  },
  {
    type: 'general',
    name: ['list-highlight-styles'],
    valueType: 'flag',
    description:
      'List supported styles for syntax highlighting, one per line. See --highlight-style.',
    notForConversion: true,
  },
  {
    type: 'general',
    name: ['v', 'version'],
    valueType: 'flag',
    description: 'Print version.',
    notForConversion: true,
  },
  {
    type: 'general',
    name: ['h', 'help'],
    valueType: 'flag',
    description: 'Show usage message.',
    notForConversion: true,
  },
  {
    type: 'reader',
    name: ['shift-heading-level-by'],
    valueType: 'number',
    description:
      'Shift heading levels by a positive or negative integer. For example, with --shift-heading-level-by=-1, level 2 headings become level 1 headings, and level 3 headings become level 2 headings. Headings cannot have a level less than 1, so a heading that would be shifted below level 1 becomes a regular paragraph. Exception: with a shift of -N, a level-N heading at the beginning of the document replaces the metadata title. --shift-heading-level-by=-1 is a good choice when converting HTML or Markdown documents that use an initial level-1 heading for the document title and level-2+ headings for sections. --shift-heading-level-by=1 may be a good choice for converting Markdown documents that use level-1 headings for sections to HTML, since pandoc uses a level-1 heading to render the document title.',
  },
  {
    type: 'reader',
    name: ['indented-code-classes'],
    valueType: 'CLASSES',
    description:
      'Specify classes to use for indented code blocks—for example, perl,numberLines or haskell. Multiple classes may be separated by spaces or commas.',
  },
  {
    type: 'reader',
    name: ['default-image-extension'],
    valueType: 'EXTENSION',
    description:
      'Specify a default extension to use when image paths/URLs have no extension. This allows you to use the same source for formats that require different kinds of images. Currently this option only affects the Markdown and LaTeX readers.',
    formats: ['markdown', 'latex'],
  },
  {
    type: 'reader',
    name: ['file-scope'],
    valueType: 'boolean',
    description: [
      'Parse each file individually before combining for multifile documents.This will allow footnotes in different files with the same identifiers to work as expected.If this option is set, footnotes and links will not work across files.Reading binary files(docx, odt, epub) implies--file - scope. ',
      'If two or more files are processed using--file - scope, prefixes based on the filenames will be added to identifiers in order to disambiguate them, and internal links will be adjusted accordingly.For example, a header with identifier foo in subdir / file1.txt will have its identifier changed to subdir__file1.txt__foo.',
    ],
  },
  {
    type: 'reader',
    name: ['f', 'filter'],
    valueType: 'PROGRAM',
    description: [
      'Specify an executable to be used as a filter transforming the pandoc AST after the input is parsed and before the output is written.The executable should read JSON from stdin and write JSON to stdout.The JSON must be formatted like pandoc’s own JSON input and output.',
      'The name of the output format will be passed to the filter as the first argument. Hence,',
      'pandoc--filter./ caps.py - t latex',
      'is equivalent to',
      'pandoc - t json | ./ caps.py latex | pandoc - f json - t latex',
      'The latter form may be useful for debugging filters.',
      'Filters may be written in any language.Text.Pandoc.JSON exports toJSONFilter to facilitate writing filters in Haskell.Those who would prefer to write filters in python can use the module pandocfilters, installable from PyPI.There are also pandoc filter libraries in PHP, perl, and JavaScript / node.js.',
      'In order of preference, pandoc will look for filters in',
      '1. a specified full or relative path(executable or non-executable),',
      '2. $DATADIR/filters (executable or non-executable) where $DATADIR is the user data directory(see --data-dir),',
      '3. $PATH (executable only)',
      'Filters, Lua-filters, and citeproc processing are applied in the order specified on the command line.',
    ],
    multiple: true,
  },
  {
    type: 'reader',
    name: ['L', 'lua-filter'],
    valueType: 'SCRIPT',
    description: [
      'Transform the document in a similar fashion as JSON filters(see --filter), but use pandoc’s built -in Lua filtering system.The given Lua script is expected to return a list of Lua filters which will be applied in order.Each Lua filter must contain element - transforming functions indexed by the name of the AST element on which the filter function should be applied.',
      'The pandoc Lua module provides helper functions for element creation. It is always loaded into the script’s Lua environment.',
      'See the Lua filters documentation for further details.',
      'In order of preference, pandoc will look for Lua filters in',
      '1. a specified full or relative path,',
      '2. $DATADIR/filters where $DATADIR is the user data directory (see --data-dir)',
      'Filters, Lua filters, and citeproc processing are applied in the order specified on the command line.',
    ],
    multiple: true,
  },
  {
    type: 'reader',
    name: ['M', 'metadata'],
    valueType: 'KEY_VAL',
    description:
      'Set the metadata field KEY to the value VAL. A value specified on the command line overrides a value specified in the document using YAML metadata blocks.Values will be parsed as YAML boolean or string values.If no value is specified, the value will be treated as Boolean true.Like--variable, --metadata causes template variables to be set.But unlike--variable, --metadata affects the metadata of the underlying document(which is accessible from filters and may be printed in some output formats) and metadata values will be escaped when inserted into the template.',
    multiple: true,
  },
  {
    type: 'reader',
    name: ['metadata-file'],
    valueType: 'FILE',
    description:
      'Read metadata from the supplied YAML (or JSON) file. This option can be used with every input format, but string scalars in the metadata file will always be parsed as Markdown. (If the input format is Markdown or a Markdown variant, then the same variant will be used to parse the metadata file; if it is a non - Markdown format, pandoc’s default Markdown extensions will be used.) This option can be used repeatedly to include multiple metadata files; values in files specified later on the command line will be preferred over those specified in earlier files.Metadata values specified inside the document, or by using - M, overwrite values specified with this option.The file will be searched for first in the working directory, and then in the metadata subdirectory of the user data directory (see --data-dir).',
  },
  {
    type: 'reader',
    name: ['p', 'preserve-tabs'],
    valueType: 'boolean',
    description:
      'Preserve tabs instead of converting them to spaces. (By default, pandoc converts tabs to spaces before parsing its input.) Note that this will only affect tabs in literal code spans and code blocks. Tabs in regular text are always treated as spaces.',
  },
  {
    type: 'reader',
    name: ['tab-stop'],
    valueType: 'number',
    description: 'Specify the number of spaces per tab (default is 4).',
  },
  {
    type: 'reader',
    name: ['track-changes'],
    valueType: 'accept|reject|all',
    description: [
      'Specifies what to do with insertions, deletions, and comments produced by the MS Word “Track Changes” feature.',
      'accept (the default) processes all the insertions and deletions.',
      'reject ignores them.',
      'Both accept and reject ignore comments.',
      'all includes all insertions, deletions, and comments, wrapped in spans with insertion, deletion, comment - start, and comment - end classes, respectively.The author and time of change is included.all is useful for scripting: only accepting changes from a certain reviewer, say, or before a certain date.If a paragraph is inserted or deleted, track - changes=all produces a span with the class paragraph-insertion/paragraph-deletion before the affected paragraph break.',
      'This option only affects the docx reader.',
    ],
    formats: ['docx'],
  },
  {
    type: 'reader',
    name: ['extract-media'],
    valueType: 'DIRECTORY',
    description:
      'Extract images and other media contained in or linked from the source document to the path DIR, creating it if necessary, and adjust the images references in the document so they point to the extracted files.Media are downloaded, read from the file system, or extracted from a binary container(e.g.docx), as needed.The original file paths are used if they are relative paths not containing... Otherwise filenames are constructed from the SHA1 hash of the contents.',
  },
  {
    type: 'reader',
    name: ['abbreviations'],
    valueType: 'FILE',
    description:
      'Specifies a custom abbreviations file, with abbreviations one to a line. If this option is not specified, pandoc will read the data file abbreviations from the user data directory or fall back on a system default. To see the system default, use pandoc--print -default -data - file=abbreviations.The only use pandoc makes of this list is in the Markdown reader. Strings found in this list will be followed by a nonbreaking space, and the period will not produce sentence-ending space in formats like LaTeX. The strings may not contain spaces.',
  },
  {
    type: 'reader',
    name: ['trace'],
    valueType: 'boolean',
    description:
      'Print diagnostic output tracing parser progress to stderr. This option is intended for use by developers in diagnosing performance issues.',
  },
  {
    type: 'writer',
    name: ['s', 'standalone'],
    valueType: 'flag',
    description:
      'Produce output with an appropriate header and footer (e.g. a standalone HTML, LaTeX, TEI, or RTF file, not a fragment). This option is set automatically for pdf, epub, epub3, fb2, docx, and odt output. For native output, this option causes metadata to be included; otherwise, metadata is suppressed.',
  },
  {
    type: 'writer',
    name: ['template'],
    valueType: 'FILE|URL',
    description:
      'Use the specified file as a custom template for the generated document. Implies --standalone. See Templates, below, for a description of template syntax. If no extension is specified, an extension corresponding to the writer will be added, so that --template=special looks for special.html for HTML output. If the template is not found, pandoc will search for it in the templates subdirectory of the user data directory (see --data-dir). If this option is not used, a default template appropriate for the output format will be used (see -D/--print-default-template).',
  },
  {
    type: 'writer',
    name: ['V', 'variable'],
    valueType: 'KEY_VAL',
    description:
      'Set the template variable KEY to the value VAL when rendering the document in standalone mode. If no VAL is specified, the key will be given the value true.',
  },
  {
    type: 'writer',
    name: ['sandbox'],
    valueType: 'boolean',
    description: [
      'Run pandoc in a sandbox, limiting IO operations in readers and writers to reading the files specified on the command line. Note that this option does not limit IO operations by filters or in the production of PDF documents. But it does offer security against, for example, disclosure of files through the use of include directives. Anyone using pandoc on untrusted user input should use this option.',
      'Note: some readers and writers (e.g., docx) need access to data files. If these are stored on the file system, then pandoc will not be able to find them when run in --sandbox mode and will raise an error. For these applications, we recommend using a pandoc binary compiled with the embed_data_files option, which causes the data files to be baked into the binary instead of being stored on the file system.',
    ],
  },
  {
    type: 'writer',
    name: ['D', 'print-default-template'],
    valueType: 'FORMAT',
    description: [
      'Print the system default template for an output FORMAT. (See -t for a list of possible FORMATs.) Templates in the user data directory are ignored. This option may be used with -o/--output to redirect output to a file, but -o/--output must come before --print-default-template on the command line.',
      'Note that some of the default templates use partials, for example styles.html. To print the partials, use --print-default-data-file: for example, --print-default-data-file=templates/styles.html.',
    ],
  },
  {
    type: 'writer',
    name: ['print-default-data-file'],
    valueType: 'FILE',
    description:
      'Print a system default data file. Files in the user data directory are ignored. This option may be used with -o/--output to redirect output to a file, but -o/--output must come before --print-default-data-file on the command line.',
  },
  {
    type: 'writer',
    name: ['eol'],
    valueType: 'crlf|lf|native',
    description:
      'Manually specify line endings: crlf (Windows), lf (macOS/Linux/UNIX), or native (line endings appropriate to the OS on which pandoc is being run). The default is native.',
  },
  {
    type: 'writer',
    name: ['dpi'],
    valueType: 'number',
    description:
      'Specify the default dpi (dots per inch) value for conversion from pixels to inch/centimeters and vice versa. (Technically, the correct term would be ppi: pixels per inch.) The default is 96dpi. When images contain information about dpi internally, the encoded value is used instead of the default specified by this option.',
  },
  {
    type: 'writer',
    name: ['wrap'],
    valueType: 'auto|none|preserve',
    description:
      'Determine how text is wrapped in the output (the source code, not the rendered version). With auto (the default), pandoc will attempt to wrap lines to the column width specified by --columns (default 72). With none, pandoc will not wrap lines at all. With preserve, pandoc will attempt to preserve the wrapping from the source document (that is, where there are nonsemantic newlines in the source, there will be nonsemantic newlines in the output as well). In ipynb output, this option affects wrapping of the contents of Markdown cells.',
  },
  {
    type: 'writer',
    name: ['columns'],
    valueType: 'number',
    description:
      'Specify length of lines in characters. This affects text wrapping in the generated source code (see --wrap). It also affects calculation of column widths for plain text tables (see Tables).',
  },
  {
    type: 'writer',
    name: ['toc', 'table-of-contents'],
    valueType: 'boolean',
    description: [
      'Include an automatically generated table of contents (or, in the case of latex, context, docx, odt, opendocument, rst, or ms, an instruction to create one) in the output document. This option has no effect unless -s/--standalone is used, and it has no effect on man, docbook4, docbook5, or jats output.',
      'Note that if you are producing a PDF via ms, the table of contents will appear at the beginning of the document, before the title. If you would prefer it to be at the end of the document, use the option --pdf-engine-opt=--no-toc-relocation.',
    ],
  },
  {
    type: 'writer',
    name: ['toc-depth'],
    valueType: 'number',
    description:
      'Specify the number of section levels to include in the table of contents. The default is 3 (which means that level-1, 2, and 3 headings will be listed in the contents).',
  },
  {
    type: 'writer',
    name: ['lof', 'list-of-figures'],
    valueType: 'boolean',
    description:
      'Include an automatically generated list of figures (or, in some formats, an instruction to create one) in the output document. This option has no effect unless -s/--standalone is used, and it only has an effect on latex, context, and docx output.',
    formats: ['latex', 'context', 'docx'],
  },
  {
    type: 'writer',
    name: ['lot', 'list-of-tables'],
    valueType: 'boolean',
    description:
      'Include an automatically generated list of tables (or, in some formats, an instruction to create one) in the output document. This option has no effect unless -s/--standalone is used, and it only has an effect on latex, context, and docx output.',
    formats: ['latex', 'context', 'docx'],
  },
  {
    type: 'writer',
    name: ['strip-comments'],
    valueType: 'boolean',
    description:
      'Strip out HTML comments in the Markdown or Textile source, rather than passing them on to Markdown, Textile or HTML output as raw HTML. This does not apply to HTML comments inside raw HTML blocks when the markdown_in_html_blocks extension is not set.',
    formats: ['markdown', 'textile'],
  },
  {
    type: 'writer',
    name: ['no-highlight'],
    valueType: 'flag',
    description:
      'Disables syntax highlighting for code blocks and inlines, even when a language attribute is given.',
  },
  {
    type: 'writer',
    name: ['highlight-style'],
    valueType: 'STYLE|FILE',
    description: [
      'Specifies the coloring style to be used in highlighted source code. Options are pygments (the default), kate, monochrome, breezeDark, espresso, zenburn, haddock, and tango. For more information on syntax highlighting in pandoc, see Syntax highlighting. See also --list-highlight-styles.',
      'Instead of a STYLE name, a JSON file with extension .theme may be supplied. This will be parsed as a KDE syntax highlighting theme and (if valid) used as the highlighting style.',
      'To generate the JSON version of an existing style, use --print-highlight-style.',
    ],
  },
  {
    type: 'writer',
    name: ['print-highlight-style'],
    valueType: 'STYLE|FILE',
    description:
      'Prints a JSON version of a highlighting style, which can be modified, saved with a .theme extension, and used with --highlight-style. This option may be used with -o/--output to redirect output to a file, but -o/--output must come before --print-highlight-style on the command line.',
    notForConversion: true,
  },
  {
    type: 'writer',
    name: ['syntax-definition'],
    valueType: 'FILE',
    description:
      'Instructs pandoc to load a KDE XML syntax definition file, which will be used for syntax highlighting of appropriately marked code blocks. This can be used to add support for new languages or to use altered syntax definitions for existing languages. This option may be repeated to add multiple syntax definitions.',
  },
  {
    type: 'writer',
    name: ['H', 'include-in-header'],
    valueType: 'FILE|URL',
    description:
      'Include contents of FILE, verbatim, at the end of the header. This can be used, for example, to include special CSS or JavaScript in HTML documents. This option can be used repeatedly to include multiple files in the header. They will be included in the order specified. Implies --standalone.',
  },
  {
    type: 'writer',
    name: ['B', 'include-before-body'],
    valueType: 'FILE|URL',
    description:
      'Include contents of FILE, verbatim, at the beginning of the document body (e.g. after the <body> tag in HTML, or the \\begin{document} command in LaTeX). This can be used to include navigation bars or banners in HTML documents. This option can be used repeatedly to include multiple files. They will be included in the order specified. Implies --standalone. Note that if the output format is odt, this file must be in OpenDocument XML format suitable for insertion into the body of the document, and if the output is docx, this file must be in appropriate OpenXML format.',
    multiple: true,
  },
  {
    type: 'writer',
    name: ['A', 'include-after-body'],
    valueType: 'FILE|URL',
    description:
      'Include contents of FILE, verbatim, at the end of the document body (before the </body> tag in HTML, or the \\end{document} command in LaTeX). This option can be used repeatedly to include multiple files. They will be included in the order specified. Implies --standalone. Note that if the output format is odt, this file must be in OpenDocument XML format suitable for insertion into the body of the document, and if the output is docx, this file must be in appropriate OpenXML format.',
    multiple: true,
  },
  {
    type: 'writer',
    name: ['resource-path'],
    valueType: 'SEARCHPATH',
    description:
      'List of paths to search for images and other resources. The paths should be separated by ":" on Linux, UNIX, and macOS systems, and by ";" on Windows. If --resource-path is not specified, the default resource path is the working directory. Note that, if --resource-path is specified, the working directory must be explicitly listed or it will not be searched. For example: --resource-path=.:test will search the working directory and the test subdirectory, in that order. This option can be used repeatedly. Search path components that come later on the command line will be searched before those that come earlier, so --resource-path foo:bar --resource-path baz:bim is equivalent to --resource-path baz:bim:foo:bar. Note that this option only has an effect when pandoc itself needs to find an image (e.g., in producing a PDF or docx, or when --embed-resources is used.) It will not cause image paths to be rewritten in other cases (e.g., when pandoc is generating LaTeX or HTML).',
    multiple: true,
  },
  {
    type: 'writer',
    name: ['request-header'],
    valueType: 'NAME_VAL',
    description:
      'Set the request header NAME to the value VAL when making HTTP requests (for example, when a URL is given on the command line, or when resources used in a document must be downloaded). If you’re behind a proxy, you also need to set the environment variable http_proxy to http://....',
    multiple: true,
  },
  {
    type: 'writer',
    name: ['no-check-certificate'],
    valueType: 'boolean',
    description:
      'Disable the certificate verification to allow access to unsecure HTTP resources (for example when the certificate is no longer valid or self signed).',
  },
  {
    type: 'writer',
    name: ['embed-resources'],
    valueType: 'boolean',
    descriptionUrl: 'option--embed-resources[',
    formats: [...ALL_HTML],
  },
  {
    type: 'writer',
    name: ['link-images'],
    valueType: 'boolean',
    descriptionUrl: 'option--link-images[',
    formats: ['odt'],
  },
  {
    type: 'writer',
    name: ['html-q-tags'],
    valueType: 'boolean',
    descriptionUrl: 'option--html-q-tags[',
    formats: [...ALL_HTML],
  },
  {
    type: 'writer',
    name: ['ascii'],
    valueType: 'boolean',
    descriptionUrl: 'option--ascii[',
    formats: [...ALL_XML, ...ALL_HTML, ...ALL_MARKDOWN, ...ALL_ROFF, 'latex'],
  },
  {
    type: 'writer',
    name: ['reference-links['],
    valueType: 'boolean',
    descriptionUrl: 'option--reference-links[',
    formats: [...ALL_MARKDOWN, 'rst'],
  },
  {
    type: 'writer',
    name: ['reference-location'],
    valueType: 'block|section|document',
    descriptionUrl: 'option--reference-location',
    formats: [...ALL_MARKDOWN, 'muse', ...ALL_HTML, 'epub', ...ALL_HTML_SLIDES],
  },
  {
    type: 'writer',
    name: ['figure-caption-position'],
    valueType: 'above|below',
    descriptionUrl: 'option--figure-caption-position',
    formats: [...ALL_HTML, 'latex', 'docx', 'opendocument', 'odt', 'typst'],
  },
  {
    type: 'writer',
    name: ['table-caption-position'],
    valueType: 'above|below',
    descriptionUrl: 'option--table-caption-position',
    formats: [...ALL_HTML, 'latex', 'docx', 'opendocument', 'odt', 'typst'],
  },
  {
    type: 'writer',
    name: ['markdown-headings='],
    valueType: 'setext|atx',
    descriptionUrl: 'option--markdown-headings',
    formats: [...ALL_MARKDOWN, 'ipynb'],
  },
  {
    type: 'writer',
    name: ['list-tables'],
    valueType: 'boolean',
    descriptionUrl: 'option--list-tables[',
    formats: ['rst'],
  },
  {
    type: 'writer',
    name: ['top-level-division'],
    valueType: 'default|section|chapter|part',
    descriptionUrl: 'option--top-level-division',
    formats: ['latex', 'context', ...ALL_DOCBOOK, 'tei'],
  },
  {
    type: 'writer',
    name: ['N', 'number-sections'],
    valueType: 'boolean',
    descriptionUrl: 'option--number-sections',
    formats: ['latex', 'context', ...ALL_HTML, 'docx', 'ms', ...ALL_EPUB],
  },
  {
    type: 'writer',
    name: ['number-offset'],
    valueType: 'NUMBER[,NUMBER,…]',
    descriptionUrl: 'option--number-offset',
    formats: [...ALL_HTML, 'docx'],
  },
  {
    type: 'writer',
    name: ['listings'],
    valueType: 'boolean',
    descriptionUrl: 'option--listings[',
    formats: ['latex'],
  },
  {
    type: 'writer',
    name: ['i', 'incremental'],
    valueType: 'boolean',
    descriptionUrl: 'option--incremental[',
    formats: [...ALL_SLIDES],
  },
  {
    type: 'writer',
    name: ['slide-level'],
    valueType: 'number',
    descriptionUrl: 'option--slide-level',
    formats: [...ALL_SLIDES],
  },
  {
    type: 'writer',
    name: ['section-divs'],
    valueType: 'boolean',
    descriptionUrl: 'option--section-divs[',
    formats: [...ALL_HTML],
  },
  {
    type: 'writer',
    name: ['email-obfuscation'],
    valueType: 'none|javascript|references',
    descriptionUrl: 'option--email-obfuscation',
    formats: [...ALL_HTML],
  },
  {
    type: 'writer',
    name: ['id-prefix'],
    valueType: 'STRING',
    descriptionUrl: 'option--id-prefix',
    formats: [...ALL_HTML, ...ALL_DOCBOOK, ...ALL_MARKDOWN, 'haddock'],
  },
  {
    type: 'writer',
    name: ['T', 'title-prefix'],
    valueType: 'STRING',
    descriptionUrl: 'option--title-prefix',
    formats: [...ALL_HTML],
  },
  {
    type: 'writer',
    name: ['c', 'css'],
    valueType: 'URL',
    descriptionUrl: 'option--css',
    formats: [...ALL_HTML, ...ALL_EPUB],
  },
  {
    type: 'writer',
    name: ['reference-doc'],
    valueType: 'FILE|URL',
    descriptionUrl: 'option--reference-doc',
    formats: ['docx', 'odt', 'pptx'],
  },
  {
    type: 'writer',
    name: ['split-level'],
    valueType: 'number',
    descriptionUrl: 'option--split-level',
    formats: [...ALL_HTML, ...ALL_EPUB],
  },
  {
    type: 'writer',
    name: ['chunk-template'],
    valueType: 'PATHTEMPLATE',
    descriptionUrl: 'option--chunk-template',
    formats: [...ALL_HTML],
  },
  {
    type: 'writer',
    name: ['epub-cover-image'],
    valueType: 'FILE',
    descriptionUrl: 'option--epub-cover-image',
    formats: [...ALL_EPUB],
  },
  {
    type: 'writer',
    name: ['epub-title-page'],
    valueType: 'boolean',
    descriptionUrl: 'option--epub-title-page',
    formats: [...ALL_EPUB],
  },
  {
    type: 'writer',
    name: ['epub-metadata'],
    valueType: 'FILE',
    descriptionUrl: 'option--epub-metadata',
    formats: [...ALL_EPUB],
  },
  {
    type: 'writer',
    name: ['epub-embed-font'],
    valueType: 'FILE',
    descriptionUrl: 'option--epub-embed-font',
    formats: [...ALL_EPUB],
  },
  {
    type: 'writer',
    name: ['epub-subdirectory'],
    valueType: 'DIRECTORY',
    descriptionUrl: 'option--epub-subdirectory',
    formats: [...ALL_EPUB],
  },
  {
    type: 'writer',
    name: ['ipynb-output'],
    valueType: 'all|none|best',
    descriptionUrl: 'option--ipynb-output',
    formats: ['ipynb'],
  },
  {
    type: 'writer',
    name: ['pdf-engine'],
    valueType: 'PROGRAM',
    descriptionUrl: 'option--pdf-engine',
    formats: ['pdf', 'latex', 'context', ...ALL_HTML, 'ms', 'typst'],
  },
  {
    type: 'writer',
    name: ['pdf-engine-opt'],
    valueType: 'PROGRAM',
    descriptionUrl: 'option--pdf-engine-opt',
    formats: ['pdf', 'latex', 'context', ...ALL_HTML, 'ms', 'typst'],
  },
];
