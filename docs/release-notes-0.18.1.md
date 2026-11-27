# Pundok Editor 0.18.1

This release includes the changes made since version 0.17.0.

## Search and replace

- Search and replace now has clearer `Ctrl-F` and `Ctrl-H` behavior: `Ctrl-F`
  opens search-only mode, while `Ctrl-H` opens replacement mode.
- Added validation for regular expressions and CSS selectors.
- Added a progress dialog for long `replace all` operations, with controls to
  cancel or stop the operation. Canceling restores the document state from
  before the operation.
- CSS selection and text search now keep separate action lists.
- Search history remembers CSS searches and search settings without retaining
  non-serializable reactive values.
- Improved search filters, CSS selection, shortcut handling, and search-dialog
  behavior.

## CSS selection and document editing

- CSS-like selection now supports the `:cs` custom-style pseudo-class.
- CSS selectors accept equivalent camel-case and kebab-case attribute names,
  case-insensitive element names, and Pandoc, HTML, and ProseMirror names.
- Actions applied to selected classes or attributes are propagated correctly to
  child elements.
- Improved conversion of index terms, raw blocks, notes, custom styles, and
  node or mark attributes.
- The attributes editor remembers its last-used tab for each node or mark.
- Added and improved keyboard shortcuts, including shortcut filtering in the
  shortcut help window, and direct access to custom-style editing.

## PDF preview and source navigation

- Rendering bookmarks now include timestamps and improved document and project
  information.
- Added page ranges to project structure information and improved bookmark
  sorting and display.
- Switching between related renderings preserves the current page position
  proportionally.
- Improved PDF viewer zoom controls, page handling, and error messages for
  renderings without SyncTeX support.
- Added a backend SyncTeX service and improved source navigation from PDF pages
  and editor paragraphs.
- Fixed notes, page ranges, and bookmark behavior in several rendering and
  navigation edge cases.

## Projects, paths, and configurations

- Refactored project and document path handling across the desktop and web
  backends.
- Open and save dialogs can use resources from another configuration.
- Files and resources can be opened from a project using a foreign reader,
  writer, or format.
- Improved inherited configuration paths and changed missing or invalid
  inherited configurations to non-blocking warnings.
- Improved project configuration paths, resource lookup, and server-side path
  handling.
- Added documentation for path management and project configuration behavior.

## Pandoc and transformations

- Added types and user interface support for parametric transformations.
- Transformation parameters can be configured to be requested every time or
  only once, with values remembered for subsequent uses.
- Added a structured editor for JSON transformation parameters, with a text
  editing mode, searching, and tree navigation.
- JSON transformation parameters now support nested objects, arrays, strings,
  numbers, booleans, and `null`.
- Variables and metadata can be passed to Pandoc filters with improved typing.
- Improved Pandoc resource-path handling and support for resources inherited
  from projects and configurations.
- Pandoc XML format is now among the default formats.

## Server, backend, and platform support

- Improved the shared backend contracts and their Electron and web-server
  adapters.
- Improved browser/server project, document, resource, rendering, and event
  handling.
- Improved IPC value serialization for reactive renderer data.
- Updated package metadata, build configuration, generated documentation, and
  TypeScript 7 migration documentation.
- Updated application icons and improved compiled-app behavior.

## Fixes

- Fixed opening the updates dialog from the initial project dialog.
- Fixed saving, loading, project switching, document persistence, and
  secondary-editor interactions in several edge cases.
- Fixed empty selections, note insertion and styling, index-term class cleanup,
  raw-element defaults, and document conversion actions.
- Fixed path handling on Windows and improved file and folder operations.
- Fixed various UI refresh, tooltip, notification, internationalization, and
  asynchronous-loading issues.
