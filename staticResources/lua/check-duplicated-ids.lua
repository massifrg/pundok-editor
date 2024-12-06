--[[
    check-duplicated-ids.lua: A [Pandoc filter](https://pandoc.org/lua-filters.html)
                   to check the presence of duplicated ids in a document.
    Copyright:     (c) 2024 M. Farinella
    License:       MIT - see LICENSE file for details
]]

-- load type annotations from common files (just for development under VS Code/Codium)
---@module 'pandoc-types-annotations'

local table_insert = table.insert
local identifiers = {}
local id_count = {}

local DUPLICATED_ID_CLASS = "duplicated-id"

local Header = pandoc.Header
local Div = pandoc.Div
local CodeBlock = pandoc.CodeBlock
local Table = pandoc.Table
local TableFoot = pandoc.TableFoot
local TableHead = pandoc.TableHead
local Row = pandoc.Row
local Cell = pandoc.Cell
local Figure = pandoc.Figure
local Span = pandoc.Span
local Code = pandoc.Code
local Link = pandoc.Link
local Image = pandoc.Image
local Attr = pandoc.Attr

---Collect the identifier of an element
---@param elem WithAttr
local function collect_id(elem)
  if not elem then
    return
  end
  local id = elem.identifier
  if id and id ~= "" then
    table_insert(identifiers, id)
    if id_count[id] then
      id_count[id] = id_count[id] + 1
    else
      id_count[id] = 1
    end
  end
end

---Collect identifiers in table rows.
---@param rows Row[]
local function collect_ids_in_rows(rows)
  for i = 1, #rows do
    local row = rows[i]
    collect_id(row)
    local cells = row.cells
    for j = 1, #cells do
      collect_id(cells[j])
    end
  end
end

---Collect identifiers in a table.
---@param table Table
local function collect_ids_in_table(table)
  collect_id(table)
  collect_id(table.head)
  collect_ids_in_rows(table.head.rows)
  local bodies = table.bodies
  for i = 1, #bodies do
    local body = bodies[i]
    collect_id(body)
    collect_ids_in_rows(body.head)
    collect_ids_in_rows(body.body)
  end
  collect_id(table.foot)
  collect_ids_in_rows(table.foot.rows)
end

---First pass to collect all identifiers
---@type Filter
local collect_identifiers = {
  Header = collect_id,
  Div = collect_id,
  CodeBlock = collect_id,
  Table = collect_ids_in_table,
  Figure = collect_id,
  Span = collect_id,
  Code = collect_id,
  Link = collect_id,
  Image = collect_id
}

---Adds a class to an Attr, if not already present.
---@param attr Attr
---@param className string The class to be added.
---@return Attr modified_attr copy of attr with the class eventually added.
local function add_class(attr, className)
  local classes = attr.classes
  local new_classes = {}
  for i = 1, #classes do
    if classes[i] ~= className then
      table_insert(new_classes, classes[i])
    end
  end
  table_insert(new_classes, className)
  return Attr(attr.identifier, new_classes, attr.attributes)
end


---Marks an Attr as having a duplicated id by adding the `DUPLICATED_ID_CLASS` class.
---@param attr Attr
---@return Attr marked_attr a copy of attr, with the `DUPLICATED_ID_CLASS` class added.
local function add_dup_id_class(attr)
  return add_class(attr, DUPLICATED_ID_CLASS)
end

---Removes a class from an Attr, if present.
---@param attr Attr
---@param className string The class to be removed.
---@return Attr modified_attr
local function remove_class(attr, className)
  local classes = attr.classes
  local new_classes = {}
  for i = 1, #classes do
    if classes[i] ~= className then
      table_insert(new_classes, classes[i])
    end
  end
  return Attr(attr.identifier, new_classes, attr.attributes)
end

---Removes the `DUPLICATED_ID_CLASS` class from `attr`.
---@param attr Attr
---@return Attr
local function remove_dup_id_class(attr)
  return remove_class(attr, DUPLICATED_ID_CLASS)
end

---Checks whether a class is present in an Attr
---@param attr Attr
---@param className string
---@return boolean
local function hasClass(attr, className)
  local classes = attr.classes
  for i = 1, #classes do
    if classes[i] == className then
      return true
    end
  end
  return false
end

---Return a Header with `DUPLICATED_ID_CLASS` class added if its identifier is duplicated,
---a Header without the `DUPLICATED_ID_CLASS` if its identifier is no more duplicated,
---or `nil` if its identifier was not duplicated and still is not.
---@param header Header
---@return Header |nil
local function mark_duplicated_id_for_header(header)
  if id_count[header.identifier] > 1 then
    return Header(header.level, header.content, add_dup_id_class(header.attr))
  elseif hasClass(header.attr, DUPLICATED_ID_CLASS) then
    return Header(header.level, header.content, remove_dup_id_class(header.attr))
  end
end

---Return a Div with `DUPLICATED_ID_CLASS` class added if its identifier is duplicated,
---a Div without the `DUPLICATED_ID_CLASS` if its identifier is no more duplicated,
---or `nil` if its identifier was not duplicated and still is not.
---@param div Div
---@return Div|nil
local function mark_duplicated_id_for_div(div)
  if id_count[div.identifier] > 1 then
    return Div(div.content, add_dup_id_class(div.attr))
  elseif hasClass(div.attr, DUPLICATED_ID_CLASS) then
    return Div(div.content, remove_dup_id_class(div.attr))
  end
end

---Return a CodeBlock with `DUPLICATED_ID_CLASS` class added if its identifier is duplicated,
---a CodeBlock without the `DUPLICATED_ID_CLASS` if its identifier is no more duplicated,
---or `nil` if its identifier was not duplicated and still is not.
---@param codeblock CodeBlock
---@return CodeBlock|nil
local function mark_duplicated_id_for_codeblock(codeblock)
  if id_count[codeblock.identifier] > 1 then
    return CodeBlock(codeblock.content, add_dup_id_class(codeblock.attr))
  elseif hasClass(codeblock.attr, DUPLICATED_ID_CLASS) then
    return CodeBlock(codeblock.content, remove_dup_id_class(codeblock.attr))
  end
end

---Return a table Cell with `DUPLICATED_ID_CLASS` class added if its identifier is duplicated,
---a table Cell without the `DUPLICATED_ID_CLASS` if its identifier is no more duplicated,
---or `nil` if its identifier was not duplicated and still is not.
---@param cell Cell
---@return Cell|nil
local function mark_duplicated_id_for_cell(cell)
  if id_count[cell.identifier] > 1 then
    return Cell(
      cell.contents,
      cell.alignment,
      cell.row_span,
      cell.col_span,
      add_dup_id_class(cell.attr)
    )
  elseif hasClass(cell.attr, DUPLICATED_ID_CLASS) then
    return Cell(
      cell.contents,
      cell.alignment,
      cell.row_span,
      cell.col_span,
      remove_dup_id_class(cell.attr)
    )
  end
end

---Return a table Row with `DUPLICATED_ID_CLASS` class added if its identifier is duplicated,
---a table Row without the `DUPLICATED_ID_CLASS` if its identifier is no more duplicated;
---return `nil` if its identifier was not duplicated and still is not, and if this goes for
---each of its cells as well.
---If any of its cells has changed its "duplicated identifier" status
---(it has a duplicated id, or it had the DUPLICATED_ID_CLASS, but its id is no more duplicated),
---then return an updated table Row.
---@param row Row
---@return Row|nil
local function mark_duplicated_id_for_row(row)
  local modified = false
  local new_cells = {}
  local cells = row.cells
  for i = 1, #cells do
    local cell = cells[i]
    local updated_cell = mark_duplicated_id_for_cell(cell)
    if updated_cell then
      modified = true
    end
    table_insert(new_cells, updated_cell or cell)
  end

  local attr = row.attr
  if id_count[row.identifier] > 1 then
    attr = add_dup_id_class(attr)
    modified = true
  elseif hasClass(attr, DUPLICATED_ID_CLASS) then
    attr = remove_dup_id_class(attr)
    modified = true
  end

  if modified then
    return Row(new_cells, attr)
  end
end

---Run `mark_duplicated_id_for_row` on every row, and return `nil` only if
---no row changed its "duplicated identifier" status.
---@param rows Row[]
---@return Row[]|nil
local function mark_duplicated_id_for_rows(rows)
  local modified = false
  local new_rows = {}
  for i = 1, #rows do
    local row = rows[i]
    local updated_row = mark_duplicated_id_for_row(row)
    if updated_row then
      modified = true
    end
    table_insert(new_rows, updated_row or row)
  end
  if modified then
    return new_rows
  end
end

---Return an updated Table when the table itself or any of its items (head, bodies, foot,
---rows and cells) changed its "duplicated identifier" status, otherwise return `nil`.
---@param ptable Table
---@return Table|nil
local function mark_duplicated_id_for_table(ptable)
  local modified = false

  local head = ptable.head
  if head then
    local updated_rows = mark_duplicated_id_for_rows(head.rows)
    if updated_rows then
      modified = true
    end
    if id_count[head.identifier] > 1 then
      head = TableHead(updated_rows or head.rows, add_dup_id_class(head.attr))
      modified = true
    elseif hasClass(head.attr, DUPLICATED_ID_CLASS) then
      head.attr = remove_dup_id_class(head.attr)
      modified = true
    end
  end

  local foot = ptable.foot
  if foot then
    local updated_rows = mark_duplicated_id_for_rows(foot.rows)
    if updated_rows then
      modified = true
    end
    if id_count[foot.identifier] > 1 then
      foot = TableFoot(updated_rows or foot.rows, add_dup_id_class(foot.attr))
      modified = true
    elseif hasClass(foot.attr, DUPLICATED_ID_CLASS) then
      foot.attr = remove_dup_id_class(foot.attr)
      modified = true
    end
  end

  local bodies = ptable.bodies
  local new_bodies = {}
  for i = 1, #bodies do
    local body = bodies[i]
    local updated_head_rows = mark_duplicated_id_for_rows(body.head)
    local updated_body_rows = mark_duplicated_id_for_rows(body.body)
    if updated_body_rows or updated_head_rows then
      modified = true
    end
    local attr = body.attr
    if id_count[body.identifier] > 1 then
      attr = add_dup_id_class(attr)
      modified = true
    elseif hasClass(attr, DUPLICATED_ID_CLASS) then
      attr = remove_dup_id_class(attr)
      modified = true
    end
    table_insert(new_bodies,
      {
        attr = attr,
        head = updated_head_rows or body.head,
        body = updated_body_rows or body.body,
        row_head_columns = body.row_head_columns
      }
    )
  end
  local attr = ptable.attr
  if id_count[ptable.identifier] > 1 then
    attr = add_dup_id_class(ptable.attr)
    modified = true
  elseif hasClass(attr, DUPLICATED_ID_CLASS) then
    attr = remove_dup_id_class(attr)
    modified = true
  end

  if modified then
    return Table(ptable.caption, ptable.colspecs, head, new_bodies, foot, attr)
  end
end

---Return a Figure with `DUPLICATED_ID_CLASS` class added if its identifier is duplicated,
---a Figure without the `DUPLICATED_ID_CLASS` if its identifier is no more duplicated,
---or `nil` if its identifier was not duplicated and still is not.
---@param figure Figure
---@return Figure|nil
local function mark_duplicated_id_for_figure(figure)
  if id_count[figure.identifier] > 1 then
    return Figure(figure.content, figure.caption, add_dup_id_class(figure.attr))
  elseif hasClass(figure.attr, DUPLICATED_ID_CLASS) then
    return Figure(figure.content, figure.caption, remove_dup_id_class(figure.attr))
  end
end

---Return a Span with `DUPLICATED_ID_CLASS` class added if its identifier is duplicated,
---a Span without the `DUPLICATED_ID_CLASS` if its identifier is no more duplicated,
---or `nil` if its identifier was not duplicated and still is not.
---@param span Span
---@return Span|nil
local function mark_duplicated_id_for_span(span)
  if id_count[span.identifier] > 1 then
    return Span(span.content, add_dup_id_class(span.attr))
  elseif hasClass(span.attr, DUPLICATED_ID_CLASS) then
    return Span(span.content, remove_dup_id_class(span.attr))
  end
end

---Return a Code with `DUPLICATED_ID_CLASS` class added if its identifier is duplicated,
---a Code without the `DUPLICATED_ID_CLASS` if its identifier is no more duplicated,
---or `nil` if its identifier was not duplicated and still is not.
---@param code Code
---@return Code|nil
local function mark_duplicated_id_for_code(code)
  if id_count[code.identifier] > 1 then
    return Code(code.content, add_dup_id_class(code.attr))
  elseif hasClass(code.attr, DUPLICATED_ID_CLASS) then
    return Code(code.content, remove_dup_id_class(code.attr))
  end
end

---Return a Link with `DUPLICATED_ID_CLASS` class added if its identifier is duplicated,
---a Link without the `DUPLICATED_ID_CLASS` if its identifier is no more duplicated,
---or `nil` if its identifier was not duplicated and still is not.
---@param link Link
---@return Link|nil
local function mark_duplicated_id_for_link(link)
  if id_count[link.identifier] > 1 then
    return Link(link.content, link.target, link.title, add_dup_id_class(link.attr))
  elseif hasClass(link.attr, DUPLICATED_ID_CLASS) then
    return Link(link.content, link.target, link.title, remove_dup_id_class(link.attr))
  end
end

---Return an Image with `DUPLICATED_ID_CLASS` class added if its identifier is duplicated,
---an Image without the `DUPLICATED_ID_CLASS` if its identifier is no more duplicated,
---or `nil` if its identifier was not duplicated and still is not.
---@param image Image
---@return Image|nil
local function mark_duplicated_id_for_image(image)
  if id_count[image.identifier] > 1 then
    return Image(image.caption, image.src, image.title, add_dup_id_class(image.attr))
  elseif hasClass(image.attr, DUPLICATED_ID_CLASS) then
    return Image(image.content, image.src, image.title, remove_dup_id_class(image.attr))
  end
end

---Second pass to mark duplicated identifiers
---@type Filter
local mark_items_with_duplicated_id = {
  Header = mark_duplicated_id_for_header,
  Div = mark_duplicated_id_for_div,
  CodeBlock = mark_duplicated_id_for_codeblock,
  Table = mark_duplicated_id_for_table,
  Figure = mark_duplicated_id_for_figure,
  Span = mark_duplicated_id_for_span,
  Code = mark_duplicated_id_for_code,
  Link = mark_duplicated_id_for_link,
  Image = mark_duplicated_id_for_image
}

return { collect_identifiers, mark_items_with_duplicated_id }
