# Pundok Editor 0.17.0

This release includes the changes made since version 0.16.0.

## Document editing and workflow

- **Insert document** replaces the former include-document action. A document
  can now be appended, prepended, or inserted at a placeholder in the middle of
  a paragraph (that will be split, unless the placeholder is at the beginning or
  at the end).
- Opening an included document can start it in a new editor window (or a new
  browser tab, for the network version)
- Operations that would discard unsaved changes now offer to save the document
  first.
- Document loading, saving, opening, and project management were reorganized for
  more consistent behavior.
- Save as loads the project configuration from its destination directory, like
  Save. Save copy and rendering retain the current project configuration, and
  overwrite checks are performed before replacing files.
- The editor history starts after a document has been loaded, rather than with
  the initial empty document.
- Action labels, tooltips, context-menu translations, selection actions, and
  document transformations were improved.

## PDF preview and source navigation

- The PDF viewer can display multiple pages at once, including two-page spreads
  with the first page on the left or right.
- PDF bookmarks now preserve viewer layout and navigation state, and rendered
  bookmarks are refreshed when a document is saved.
- Rendering started from the PDF viewer is reflected in the main editor, with
  clearer rendering controls and the ability to stop an ongoing rendering.
- Added automatic re-rendering when saving a document included by the document
  currently shown in the PDF viewer.
- Improved PDF page loading, rasterization, scrolling, dragging, zoom reset,
  page counts, current-page handling, and refresh behavior.

### PDF preview with ConTeXt+SyncTeX support

- Restored PDF preview with SyncTeX support in ConTeXt, but this works only when
  typesetting Pandoc XML with ConTeXt and using a Lua function that adds SyncTeX
  information in the Lua table representing the document DOM in ConTeXt.
- A paragraph in the editor can be opened at its corresponding location in the
  latest PDF when SyncTeX information is available.
- Double-clicking a page in the PDF viewer opens the corresponding source
  location, including when the clicked page is part of a spread.

## Projects, Git, and startup options

- A project can be placed under Git management from the editor.
- The Git changes dialog can discard changes and remove untracked files.
- Merge-conflict handling and default branch detection were improved.
- Added checks for required and recommended external software.
- Added `-n` / `--no-check` to skip software and project-update checks.
- Added `-w` / `--new-window` and a main-menu command for opening another editor
  window (this is also used inside the editor to open a document in a new
  window).

## Configuration and documentation

- Added automatically generated documentation for the project configuration
  dialog and related editor controls.
- Custom configuration items can be renamed, and the CSS properties editor was
  improved.
- Pandoc custom reader and writer paths are completed correctly, and the
  resource path now includes resources from the whole project and its
  configurations.

## Fixes

- Fixed note insertion, inline endings before notes, note styling, and indexing
  with an empty selection.
- Fixed URI decoding for bookmarks and prevented non-PDF files from being
  previewed in the PDF viewer.
- Fixed Windows path separators when determining a project's root document.
- Fixed local backend IPC invocation, window titles for new documents, and
  production-mode process handling.
- Improved button refreshes after loading and saving documents, save-message
  placement (from top to bottom, not to overlay menubar), and behavior when
  loading a shorter PDF (when the current page is beyond the new, shorter PDF in
  the preview).
