# Project configuration editor

The project configuration editor is a full-screen dialog for editing the
configuration stored in a project. It is opened from the project controls.
The vertical tab list on the left selects a pane; the selected pane is shown
on the right. The tab list can be scrolled, and its arrows appear when the
list does not fit.

Many collection panes can show both values defined by the project and values
inherited from the selected configurations. Inherited rows show their source.
They are read-only unless the pane provides an edit action; the
![eye-off icon](media/projectconf/eye-off.jpg) remove-inherited toggle records
an override that hides the inherited item. Local rows can normally be edited,
copied, reordered, or deleted. Changes are drafts until the dialog is saved.

## Dialog actions

At the bottom of the main dialog:

- **Cancel** closes the editor and discards all changes.
- **Check** builds the project and opens a preview dialog containing the
  serialized project configuration. **Cancel** in that dialog returns to the
  editor; **Save** commits the previewed project.
- **Save** validates and saves immediately without showing the serialized
  preview.

![cancel icon](media/projectconf/cancel.jpg)
![check icon](media/projectconf/check.jpg)
![save icon](media/projectconf/save.jpg)

Invalid JSON in a JSON field prevents either save action. The field is marked
with its error, and the corresponding tab is selected. Empty values are
omitted from the saved configuration. Paths to custom CSS are made relative
to the project when possible.

## General

- **Name** is the project name.
- **Description** is optional multiline text.
- **Root document** displays the project's root document. It is read-only in
  the field; use the ![open icon](media/projectconf/open.jpg) choose-document
  button to select a document in the project folder. Selecting a document
  outside that folder is rejected.

The root-document picker starts in the project directory (or beside the
current root document) and updates the value only after a file is selected.

## Project configurations

This pane determines which reusable configurations are inherited by the
project and in what order. The selected list is draggable, so dropping a
configuration at another position changes precedence. Click
![remove icon](media/projectconf/remove.jpg) to remove a selected
configuration.

The available list shows configuration names and descriptions. Click
![add icon](media/projectconf/add.jpg), or double-click a row, to add one.
Already selected configurations are disabled and cannot be added twice. If no
configurations are available, the list says so.

## File formats

- **Working format** chooses the default format used when opening documents.
  The adjacent **Format extensions** dropdown exposes extensions supported by
  that format; selecting them appends the corresponding `+extension` values.
- **Copy format** works the same way for **Save a copy**.
- **Main formats** controls the formats displayed prominently in format
  selectors. Use its editor to add, remove, and reorder format entries.
- **Document template** chooses the template used for new documents. The
  dropdown lists templates found in the project's configurations and displays
  their source. Use ![open icon](media/projectconf/open.jpg) to browse for a
  template, or clear the field to remove it.

Formats supplied by converters can also appear in the format dropdowns. The
format-extension control is disabled or empty when no extensions are
available.

## Automatic delimiters

The pane edits delimiter pairs used for automatic quotations. Each row has an
opening and closing field for **Double quote** and **Single quote**, plus any
additional delimiter names already present.

**Language presets** is a dropdown containing English, Italian, German,
French, Spanish, and Portuguese. Choosing a preset replaces the displayed
pairs; individual fields can then be edited.

## Custom styles

The list contains custom style definitions. Use **New style** to open the
style editor. Each local row can be edited, copied, or deleted; inherited
styles can be hidden with the remove-inherited toggle. The editor validates
that a name is present and unique, and provides:

- **Name**
- **Applies to**, describing the node kinds to which the style applies
- **Heading levels**, when the style applies to headings
- **Deprecated for**, for styles superseded by another style
- The style's CSS properties editor

The CSS properties editor starts with **Add CSS property**. Its dropdown adds
available properties; each selected property has an input and a
![remove icon](media/projectconf/remove.jpg) remove button. Color and border
properties open color or line-style controls. Font family, text transform,
font weight, font style, and font variant have value pickers. Text decoration
has line, color, style, and thickness controls. A custom property name can be
entered in a small dialog and applied or cancelled.

## Custom classes

**New class** opens an editor with **Name**, **Description**, and **Applies
to**. Local classes can be edited, copied, or deleted. Names are required and
must be unique. Inherited classes show their provenance and can be hidden
with the remove-inherited toggle.

## Custom attributes

**New attribute** opens an editor with **Name**, **Description**, **Applies
to**, **Suggested values**, **Fixed values**, and **Default value**.
Suggested values describe possible input; fixed values constrain the allowed
values. Use **Add value** and the row remove controls to manage value lists.
When fixed values are present, the default must be one of them. Names are
required and must be unique. Local definitions support edit, copy, and delete;
inherited definitions can be hidden.

## Custom metadata

**New metadata** opens an editor with **Name**, **Description**, **Type**, and
**Default value**. Local definitions support edit, copy, and delete, while
inherited definitions show their source and can be hidden. Names must be
unique.

## Note styles

**New note style** opens an editor for a note type. It contains **Note type**,
**Default**, marker conversion settings, predefined or custom marker choices,
**Custom markers (space separated)**, **Marker before**, **Marker after**,
**Background color**, and **Text color**. Existing local note styles can be
edited, copied, or deleted. Inherited note styles can be hidden.

## Custom CSS

The list is in stylesheet order. Click **Add CSS file** to open the document
picker and add a stylesheet; click a row to load its preview. Drag local rows
to reorder them and use ![remove icon](media/projectconf/remove.jpg) to
remove one. Inherited files are marked with a lock, show their source, and
can be hidden with the remove-inherited toggle.

The right-hand **CSS preview** uses a code editor. While it loads, an
activity indicator is shown; a read error is displayed below the preview
instead of being silently ignored.

## Indices

**New index** opens an index-definition editor. It includes **Index name**,
**Reference class**, whether to **Place index reference** **Before** or
**After**, an SVG icon (which can be chosen from a file), an icon character,
and a color preview. **Allow ranges**, **Allow empty references**, and **Only
empty references** control which references are accepted. The index name and
reference class are required and index names must be unique. The chosen SVG
must contain a path with a `d` attribute.

Local indices support edit, copy, and delete. Inherited indices show their
source and can be hidden.

## Input converters

**New input converter** opens an editor with **Name**, **Description**,
**Type**, **Default**, **File extensions**, and converter-specific settings.
Pandoc converters provide **Format**, **Format extensions**, and **Pandoc
options**. A custom reader can be selected as the input format. Command
converters provide **Command** and **Command arguments**; JSON options can
also be edited where applicable.

The custom-reader picker browses for a Lua reader. Pandoc options are managed
in a nested editor: add an option, enable or disable it, edit its key/value
pairs, add or remove pairs, and apply or cancel the option dialog. Local
converters support edit, copy, and delete; inherited converters can be hidden.
Names are required and unique.

## Output converters

**New output converter** opens an editor with:

- **Type**, **Name**, **Description**, and **Default**
- **Long rendering**, **Output extension**, **Do not ask for the output file**,
  **Result file**, and **Open result with**
- **Icon**, with a file picker for an SVG icon
- Type-specific **Format**, **Format extensions**, **Custom writer**,
  **Command**, and **Command arguments**
- Pandoc filters and their parameters where the selected converter supports
  them

The custom-writer picker selects a Lua writer. The resource selector lists
filters, writers, and readers found in the project, inherited configurations,
or common editor resources, and identifies each source. A resource preview
dialog can show the selected Lua resource. Filter lists provide
![add icon](media/projectconf/add.jpg) **Add filter**, edit, and remove
actions; filter parameters can be added or removed as variables or metadata.

Local converters support edit, copy, and delete. Inherited converters can be
hidden. Converter names are required and unique. The nested editor uses
**Cancel** and **Apply**; Apply is disabled until the draft is valid.

## Automations

Click **New automation** to open a dropdown with:

- **Search and replace**
- **Elements selection**
- **Document transformation via Pandoc filter**

Each automation has **Name** and a multiline **Description**. Click a local
row to edit it or use ![copy icon](media/projectconf/copy.jpg) to create a
copy. Inherited automations can be edited as a project draft or hidden with
the remove-inherited toggle. The editor has **Cancel**, **Delete**, and
**Apply**; Apply requires a non-empty name.

For **Search and replace**, configure the search text, optional replacement,
and the search-only switch. Search-only mode exposes actions on found items;
replacement mode exposes actions on replaced items. The case-insensitive,
regular-expression, whole-word, and cycle switches and the marks filter have
the same meanings as the Search and replace dialog.

For **Elements selection**, enter a CSS selector. The merge-adjacent-marks
switch and search-only switch control selection behavior; replacement and
found/replaced-item actions are available according to that mode.

For **Pandoc filter**, add and edit filters and choose **With filter result**:
**Replace document**, **Append to document**, or **Prepend to document**.

## Raw elements

The top controls set **Default raw format** and the format used by **Show raw
elements**. The latter filters the entries displayed below. Two inner tabs
separate **Raw Inlines** and **Raw Blocks**.

Each inner pane has **Sort**, which orders entries by format, first content,
and second content; clicking it again reverses the order. Use
![add icon](media/projectconf/add.jpg) **Add raw inline** or **Add raw block**
to create an entry. Entries are compact buttons labelled with their content;
an inherited entry also shows its source. Click one to edit it.

The raw-element editor dialog contains **Format**, **Title**, **First
content**, and **Second content**. Inline content uses single-line fields;
block content uses multiline fields. Inherited entries are read-only. Use
![copy icon](media/projectconf/copy.jpg) to create a local copy or
![delete icon](media/projectconf/delete.jpg) to delete a local entry.

## Inheritance and editing behavior

Inheritance is computed from the selected project configurations in their
displayed order. A local item with the same identity overrides its inherited
counterpart. For styles, classes, attributes, metadata, converters, and CSS,
the identity is its name; note styles use note type, indices use index name,
and raw elements use format plus content. Removing an inherited item does not
alter the source configuration: it adds the item to the project's removal
list, which is saved in the project configuration.

Nested editors use **Apply** to update the draft in the main dialog and
**Cancel** to abandon only that nested edit. The main dialog's **Cancel**
still discards every unapplied project change.

## Subdialogs and popups

The following dialogs are opened from the panes above. They are separate
drafts: closing one with **Cancel** leaves the parent pane unchanged.

### Custom style dialog

**New style**, **Edit**, **Create a copy**, and the corresponding inherited-row
copy action open the custom-style dialog. Its title identifies whether the
dialog is creating or editing a style.

- **Name** is required and must not duplicate another style.
- **Applies to** is a multi-select of supported document elements. Selected
  values appear as removable chips.
- When a heading target is selected, **Heading levels** appears with checkboxes
  for the applicable levels.
- The embedded CSS properties editor manages the style declaration and shows a
  live specimen.
- **Deprecated for** is a multi-select of replacement elements/styles.

**Apply** is disabled until the name is valid; **Cancel** closes the dialog
without changing the list. Deleting a local style happens from the list's
![remove icon](media/projectconf/remove.jpg) button, not inside this dialog.

### Custom class dialog

The custom-class dialog contains **Name**, multiline **Description**, and the
multi-select **Applies to** field. It also embeds a complete custom-attribute
list for attributes belonging to the class. The embedded list has its own
**New attribute** and row edit/copy/delete controls, so an attribute editor
can be opened while the class dialog remains open.

**Apply** requires a non-empty name. **Cancel** abandons both class edits and
any attribute changes made inside this class draft.

### Custom attribute dialog

The custom-attribute dialog contains:

- **Name**, multiline **Description**, and multi-select **Applies to**
- A **Suggested values / Fixed values** switch
- A value-entry field and ![add icon](media/projectconf/add.jpg) button;
  pressing Enter has the same effect
- Removable chips for the current suggestion or fixed-value list
- **Default value**

Names are required and unique. When **Fixed values** is selected, the default
must be one of the listed values and the dialog shows an error otherwise.
**Apply** remains disabled while the name is invalid or the default is
invalid.

### Custom metadata dialog

The metadata dialog contains **Name**, multiline **Description**, a **Type**
dropdown, and an autogrowing **Default value** field. The type dropdown
selects the metadata value kind (for example `MetaBool` or `MetaString`) and
the default is checked against that type. A blank name disables **Apply**;
invalid defaults are shown beside the field. **Cancel** discards the draft.

### Note-style dialog

The note-style dialog contains **Note type** and a **Default** checkbox. The
marker section has two radio choices:

- **Predefined conversion** reveals a **Marker conversion** dropdown.
- **Custom markers** reveals a space-separated marker field.

**Marker before** and **Marker after** specify the text around the note
marker. **Background color** and **Text color** accept CSS color values and
also open a color-picker popup from their color buttons. The dialog previews
the marker summary in the list. **Apply** validates the note type and
uniqueness; **Cancel** closes without applying it.

### Index dialog

The index dialog begins with **Index name** and **Reference class**. The
**Place index reference** radio group chooses **Before** or **After** the
indexed term. A live preview shows the term, placement, icon, and color.

The icon can be supplied as **SVG icon** path data or as an **Icon character**.
The ![choose file icon](media/projectconf/choose-file.jpg) file button opens
the document picker, extracts a path from the selected SVG, and reports an
error if no path with a `d` attribute is found. **Color** has a text field and
a color-picker popup. **Allow ranges**, **Allow empty references**, and
**Only empty references** are independent checkboxes. **Apply** requires both
the index name and reference class; **Cancel** discards the draft.

### Input converter dialog

The input-converter dialog first selects **Type** (**Pandoc** or **Script**),
then edits **Name**, multiline **Description**, **Default**, and
**File extensions**.

For **Pandoc**, the dialog presents two selectable cards:

- **Format** opens the Pandoc format dialog and its format-extension dropdown.
- **Custom reader** opens the Lua resource dialog and displays the selected
  reader.

Pandoc converters also contain the inline **Pandoc filters** and **Pandoc
options** editors. For **Script**, **Command** and **Command arguments**
replace the format/reader choice. **Apply** requires a name and either a
Pandoc format/reader or a script command. **Cancel** closes without updating
the converter list.

### Output converter dialog

The output-converter dialog edits **Type**, **Name**, multiline
**Description**, **Default**, **Long rendering**, **Output extension**, **Do
not ask for the output file**, **Result file**, **Open result with**, and
**Icon**. The icon file button opens the document picker and extracts SVG path
data.

For a **Pandoc** converter, the **Format** card opens the Pandoc format dialog
and the **Custom writer** card opens the Lua resource dialog. The dialog also
contains the inline filters and Pandoc options editors. For a **Script**
converter, it instead contains **Command** and **Command arguments**.
**Apply** requires a name and a valid format/writer or command; **Cancel**
leaves the existing converter unchanged.

### Pandoc format dialog

Clicking a converter's **Format** card opens a format-selection dialog. The
**Format** dropdown is populated from formats available in the selected
input/output direction and may show a loading indicator while the backend
loads additional formats. Once a format is selected, **Format extensions**
appears and allows supported extensions to be selected.

The dialog keeps the previous selection until **Apply** is clicked. **Apply**
is disabled without a format; **Cancel** closes it without changing the
converter draft.

### Pandoc format-extension dropdown

The compact **Format extensions** control is a dropdown rather than a full
dialog. It lists extensions for the selected Pandoc format, supports multiple
selection, and displays the chosen `+extension` suffixes on the format card.
If the backend reports no extensions, it displays the default/no-extension
message and contributes no suffix.

### Pandoc Lua resource dialog

The Lua resource dialog is used for custom readers, custom writers, and
filters. For a new resource selection it contains:

- A **Strict search** switch. Strict search limits the search to the exact
  resource context; loose search includes the broader configured resource
  locations.
- A resource list grouped visually by provenance: project, inherited
  configuration, or common editor resource.
- A read-only **Resource preview** code editor. Loading is shown with an
  activity indicator and failures appear in an error banner.

Click a resource to select it and update the preview. **Select** is disabled
until a resource is selected; **Cancel** closes without changing the parent
converter. When used to edit a filter that already has a selection, the
dialog switches to parameter-editing mode: the resource path and preview are
shown, and each parameter can be marked **Variable** or **Metadata**, edited
by name and value, added with **Add parameter**, or removed with
![remove icon](media/projectconf/remove.jpg). In that mode **Apply** saves
the parameter draft.

### Pandoc options dialog

**Add**, **Edit**, and the row edit button open the Pandoc-option dialog. The
**Option** dropdown shows the option name and its description. The editor
then changes according to the option specification:

- A boolean option shows an **Enabled** checkbox.
- Text options show a **Value** field.
- File and directory options add a picker button to the value field.
- Key/value options show repeated **Key** and **Value** rows, with
  ![remove icon](media/projectconf/remove.jpg) remove-pair buttons and
  **Add pair**.
- JSON key/value options use the same pair layout without the pair-removal
  restriction imposed by the option specification.

Changing the option can reset its value editor to the appropriate default.
Invalid values produce an inline error. **Apply** writes the option to the
converter draft; **Cancel** closes without doing so. Removing an option from
the list is immediate within the parent converter draft and can still be
discarded by cancelling the converter dialog.

### Pandoc filter dialog

**Add filter** opens the Lua resource dialog in filter-selection mode. Its
resource list, strict/loose search, provenance labels, preview, **Select**,
and **Cancel** behave as described above. Selecting a filter adds it to the
converter's filter list. Clicking an existing filter's edit button reopens the
same dialog in parameter-editing mode, where filter variables and metadata
can be added, changed, or removed. The filter list's remove button only
removes the filter from the current converter draft.

### Raw-element dialog

Clicking a raw inline or raw block button opens the raw-element dialog. It
contains **Format**, **Title**, **First content**, and **Second content**.
Inline content fields are single-line; block content fields are multiline.
Changing **Format** updates the format-specific raw entry. Inherited entries
are read-only and cannot have their format, title, or content changed.

The ![copy icon](media/projectconf/copy.jpg) button makes a local copy of an
inherited or local entry. The ![delete icon](media/projectconf/delete.jpg)
button deletes a local entry. Closing the dialog after editing a local entry
keeps the draft changes in the Raw elements pane; the main dialog still
controls whether they are eventually saved.

### Custom CSS preview

The CSS preview is an embedded code editor rather than an editing dialog.
Selecting a stylesheet loads its contents asynchronously. The preview is
read-only; while loading, an activity indicator covers it, and a load failure
is shown as an error below it. Selecting another stylesheet replaces the
preview.

### CSS property popups

The custom-style dialog's CSS editor uses several small popups:

- **Add CSS property** lists unused standard properties and an **Other** item.
  **Other** opens a custom-property dialog with a required CSS property name;
  **Add** inserts it, while duplicate names show an error.
- Color buttons open a color picker for color, border-color, and text-decoration
  color.
- Border-style buttons open a menu of border styles.
- Font-family, text-transform, font-weight, font-style, and font-variant
  buttons open menus of standard values.
- Text-decoration provides multi-select line values, a style dropdown, a
  color picker, and a thickness popup containing a slider and unit choices.

Every selected property has a remove button. The specimen at the top updates
as values change, so the effect of the current CSS can be checked before the
style dialog is applied.

### Automatic-delimiter preset menu

**Language presets** opens a menu, not a dialog. Selecting a language replaces
both delimiter pairs in the parent pane and closes the menu. The opening and
closing fields remain editable afterward; no separate confirmation is shown.

## Appendix: configuration and project data structures

The editor uses two related JSON structures:

- `PundokEditorConfigInit` describes a reusable editor configuration.
- `PundokEditorProject` describes a project and the project-specific
  configuration that complements its inherited configurations.

The editor may expose a runtime `PundokEditorConfig` object as well. It has
the same configuration fields as `PundokEditorConfigInit`, but also contains
computed runtime data such as expanded custom-style instances. That runtime
object is not written back to the project file.

### `PundokEditorConfigInit`

`PundokEditorConfigInit` combines the configuration identity fields,
compatibility fields, and the common project/configuration fields.

#### Identity and compatibility

- **`name`** — the configuration name. It is also the identifier used when a
  project lists a configuration to inherit.
- **`description`** — optional human-readable explanation of the
  configuration's purpose.
- **`version`** — an array of numbers identifying the minimum suitable editor
  version. It is intended for compatibility checks.
- **`isLocal`** — an editor-managed flag indicating a local configuration.

#### Document and format defaults

- **`workingFormat`** — the Pandoc format or input-converter name used to open
  documents by default.
- **`copyFormat`** — the Pandoc format or converter used by **Save a copy**.
- **`mainFormats`** — format names emphasized in format selectors.
- **`documentTemplate`** — the template used when creating a new document.
- **`autoDelimiters`** — a map of delimiter names to opening/closing pairs,
  normally including `DoubleQuote` and `SingleQuote`.

#### Document vocabulary and presentation

- **`customStyles`** — style definitions for paragraphs, spans, headings,
  divisions, and other supported elements. A style can contain an `appliesTo`
  list, heading `levels`, `deprecatedFor` targets, CSS declarations, and
  style-specific classes or attributes.
- **`customClasses`** — named classes for Pandoc nodes or marks that carry an
  `Attr`, optionally restricted by `appliesTo` and optionally containing
  class-specific attributes.
- **`customAttributes`** — named attributes for `Attr`-bearing elements.
  Attributes can define a default, suggestions, a fixed `values` list, and an
  editor type such as string, number, date, or time.
- **`customMetadata`** — named document metadata fields. Each has a Pandoc
  metadata type such as `MetaBool`, `MetaString`, `MetaInlines`,
  `MetaBlocks`, `MetaList`, or `MetaMap`, and may have a default.
- **`noteStyles`** — presentation and marker rules for note types such as
  footnotes and endnotes. One note style may be marked as the default.
- **`customCss`** — stylesheet paths, in the order in which they are loaded.
- **`indices`** — index definitions, including the reference class, placement,
  icon, color, and allowed reference forms.

#### Raw elements and converters

- **`defaultRawFormat`** — the format initially selected when inserting a raw
  inline or raw block.
- **`rawInlines`** — insertable `RawInline` samples. Each sample has a format,
  title, and one or two content parts.
- **`rawBlocks`** — insertable `RawBlock` samples with the same format/title/
  content model, normally using multiline content.
- **`inputConverters`** — definitions for importing documents. A converter
  can use Pandoc or an external script, and can define formats, readers,
  filters, options, extensions, commands, and a default flag.
- **`outputConverters`** — definitions for exporting documents. A converter
  can use Pandoc or an external script, and can define formats, writers,
  filters, options, output behavior, commands, extensions, icons, and a
  default flag.
- **`automations`** — predefined operations such as search-and-replace,
  CSS-element selection, and Pandoc-filter transformations.

Fields are optional in the initialization type. The runtime
`PundokEditorConfig` supplies defaults for the working format, copy format,
and main formats when those fields are absent. An absent collection behaves
as an empty collection in the relevant editor or merge operation; it is not
the same as an explicit removal entry.

### `PundokEditorProject`

`PundokEditorProject` is the project file's top-level structure:

- **`path`** — the project directory.
- **`name`** — the project name.
- **`description`** — optional project description.
- **`rootDocument`** — the root/master document of the project document tree.
- **`configurations`** — an ordered array of reusable configuration names.
- **`editorConfig`** — project-local configuration values. It is a partial
  `PundokEditorProjectConfig`, so it may contain only the fields that the
  project needs to add or override.
- **`computedConfig`** — an optional runtime result of composing the project
  configuration. It is used while the project is open and is removed before
  serialization; it should not be treated as a hand-edited project field.

`editorConfig` includes all `PundokEditorConfigInit` fields that are useful
for a project, plus **`remove`**. The project editor keeps the project name,
description, root document, selected configuration names, and local editor
configuration together when it saves.

### `remove` and configuration pruning

`remove` is a map from prunable field names to arrays of identifiers. It can
prune:

`autoDelimiters`, `automations`, `customAttributes`, `customClasses`,
`customCss`, `customMetadata`, `customStyles`, `indices`,
`inputConverters`, `mainFormats`, `noteStyles`, and `outputConverters`.

The identifier depends on the field:

| Field | Identifier used by `remove` |
|---|---|
| `autoDelimiters` | delimiter name |
| `automations`, `customAttributes`, `customClasses`, `customMetadata`, `customStyles`, `inputConverters`, `outputConverters` | item `name` |
| `indices` | `indexName` |
| `noteStyles` | `noteType` |
| `customCss`, `mainFormats` | string value |

`remove` does not edit the inherited configuration. It is applied after
composition to the project's computed result. The configuration editor's
remove-inherited toggles create and maintain these identifier lists.

Raw inline and raw block samples are not listed among the prunable fields.
They can be shadowed by a local sample with the same format and content, but
there is no corresponding raw-element removal list in `ConfigurationPruning`.

### How inherited configurations are composed

When a project configuration is computed, the editor:

1. Starts with a configuration initialized from the project's name,
   description, and `editorConfig`.
2. Reads the configurations named in `project.configurations`, in array order.
3. Enriches the current result with each inherited configuration.
4. Applies `editorConfig.remove`.
5. Exposes the resulting `PundokEditorConfig` as `computedConfig`.

For scalar fields, a defined value from the configuration currently being
inherited is selected over the previous value. This applies to
`workingFormat`, `copyFormat`, `mainFormats`, `documentTemplate`, and
`defaultRawFormat`; `autoDelimiters` are merged by delimiter name, with the
inherited value replacing a same-named previous delimiter.

Collection fields use field-specific merging:

- Named collections (`customStyles`, `customClasses`, `customAttributes`,
  `customMetadata`, `inputConverters`, `outputConverters`, and
  `automations`) are matched by `name`.
- Indices are matched by `indexName`.
- Note styles are matched by `noteType`.
- When a match exists, the current/base item is retained over the inherited
  item. Non-matching items are combined.
- CSS paths are concatenated, duplicates are removed, and inherited paths
  remain in the resulting order.
- Raw inline and raw block entries are matched by both `format` and
  `content`. A matching entry keeps the existing entry; its current title
  takes precedence, while the inherited title remains available if the
  current title is empty.
- Input and output converters enforce a single effective default: the last
  converter marked default in the merged sequence is the one left marked
  default.
- Note-style defaults are similarly normalized so that an inherited
  default does not remain alongside the selected overriding default.

The result is therefore not a simple JSON deep merge. A field can be
scalar-selected, object-replaced by identity, concatenated and deduplicated,
or merged according to a special rule. The **Project configurations** order
controls the sequence in which these rules are applied, while `remove`
provides the final project-level pruning step.
