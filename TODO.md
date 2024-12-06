# A TODO list of features and fixes

- ~~File|Exit button~~

- check for unsaved changes before quitting

- Image inclusion/linking

- ~~reload current document with a different configuration~~

- selection by Mark: not only the text with a Mark, but text with a Mark
  and without another one

- don't ask filename when exporting the same document to the same format

- ~~use PDFViewer embedded in Chrome (done with pdfjs-dist)~~

- ConTeXt integration

- check the pandoc CWD (current working directory) during conversion

- enable/disable markdown input text automations

- CTRL+S in subeditor should save the document in the subeditor, not in the main one

- save current modified configuration in the project file

- copy previous project file in pundok-project.bak

- newDocument should call loadDocument(template), where template is a pandoc JSON file
  (a `mustRename` property is necessary in the document, not to overwrite the template)

- don't raise an error when a save operation is just cancelled

- ~~extend the repeatableCommand to table tools~~

- ~~fix remove span in the contextual menu~~

- fix handling of the file name when adding `include-doc` class in a document not in a project

- ~~recent files (also recent projects)~~

- ~~check configuration loading when opening a document that is part of a project~~

- load project when "save as" creates a file inside a project directory

- ~~reload prosemirror history plugin when loading a different document, to prevent
  switching to the content of the previous document (with the name of the current one)~~

- ~~shortcut key to edit attributes (Alt-a)~~

- limit the names of custom styles in menubar button

- keyboard shortcuts for tables (see also tiptap)

- support for citations

- ~~new attribute with 'name=value' correctly adds attribute setting its value in one shot~~

- check empty plain or paragraphs when converting blocks (convertTo command)

- ~~default RawBlock and RawInline formats (or default Raw format for both) in configuration~~

- defaultCodeFormat in analogy to defaultRawFormat in configuration

- ~~close all notes should also do a refresh~~

- check pandocOptions, correcting e.g. "-L filter.lua" with the complete path

- double click on EmptySpan, e.g. anchor, opens "edit attributes" dialog

- ~~pressing return, while editing id, changes and closes "edit attributes" dialog~~

- metadata "pundok-config" to load the configuration of a file before opening it (only
  for files out of a project)

- automatically update version in startup.json

- split tables (maybe better done in prosemirror-tables-sections)

- convert text to tables and tables to text

- CTRL+F to open search dialog

- default classes for Blocks like Headers, Figure, Div
