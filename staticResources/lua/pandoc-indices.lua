--[[
    pandoc-indices.lua: Lua code to manage indices in Pandoc through conventional elements.
    Copyright:          (c) 2024 M. Farinella
    License:            MIT - see LICENSE file for details
    Usage:              See README.md for details
]]

---Functions to export indices with Pandoc.

-- Classes and attributes of a Pandoc Div representing an index.
-- The class that discriminates between a normal Div and an index.
local INDEX_CLASS = "index"
---The attribute specifying the index name (it's "index" when it's absent).
local INDEX_NAME_ATTR = "index-name"
---The default value for the attribute "index-name".
local INDEX_NAME_DEFAULT = "index"
---The attribute specifying the class of Span elements representing a reference to a term of an index.
local INDEX_REF_CLASS_ATTR = "ref-class"
---The default value of the class that discriminates between a normal Span and an index reference.
local INDEX_REF_CLASS_DEFAULT = "index-ref"
---The attribute specifying where the reference is put respect to the indexed words (before or after)
---e.g. in LaTeX: "term\index{term}" or "\index{term}term"
local INDEX_REF_WHERE_ATTR = "put-index-ref"
---The value of INDEX_REF_WHERE_ATTR when the references are put before the word to be indexed.
local INDEX_REF_BEFORE = "before"
---The value of INDEX_REF_WHERE_ATTR when the references are put after the word to be indexed.
local INDEX_REF_AFTER = "after"
---@alias IndexRefWhere "before"|"after"
---The default value of INDEX_REF_WHERE_ATTR.
---@type IndexRefWhere
local INDEX_REF_WHERE_DEFAULT = INDEX_REF_AFTER
local INDEX_TERM_CLASS = "index-term"
local INDEX_SORT_KEY_ATTR = "sort-key"

local string_find = string.find
local string_gsub = string.gsub
local string_len = string.len
local string_sub = string.sub
local table_concat = table.concat
local table_insert = table.insert
local pandoc = pandoc
local pandoc_List = pandoc.List
local pandoc_Pandoc = pandoc.Pandoc
local pandoc_RawInline = pandoc.RawInline
local pandoc_write = pandoc.write
local utf8len = pandoc.text.len
local utf8lower = pandoc.text.lower
local utf8sub = pandoc.text.sub

-- beginning of functions for logging
---@module 'logging'

---Write a warning message to the standard error.
local function logging_info(i)
  io.stderr:write('(I) pandoc-indices: ' .. i .. '\n')
end
---Write an informative message to the standard error.
local function logging_warning(w)
  io.stderr:write('(W) pandoc-indices: ' .. w .. '\n')
end
---Write an error message to the standard error.
local function logging_error(e)
  io.stderr:write('(W) pandoc-indices: ' .. e .. '\n')
end
local logging
if pcall(require, "logging") then
  logging = require("logging")
end
if logging then
  logging_info = logging.info
  logging_warning = logging.warning
  logging_error = logging.error
end
-- end of functions for logging

---@alias IndexName string The name of an index.

---@class Index    An index in a document.
---@field name     string The name of the index, e.g. "index", "names", etc.
---@field refClass string The .
---@field refWhere IndexRefWhere Where the reference is put.
---@field prefix   string A prefix of the index.

---@class IndexTerm A term inside an Index.
---@field id      string  The term identifier.
---@field sortKey string  The key to sort the term with.
---@field text    string  The content of the term as a string without styles.
---@field blocks  Block[] The content of the term as Pandoc Blocks.

---@class IndexRef A reference to an `IndexTerm` in the text.
---@field indexName string The name of the index.
---@field idref     string The id of the corresponding `IndexTerm`.

---@class DocumentIndices
---@field indices Index[]
---@field terms   table<IndexName,IndexTerm[]>

---@type Index[] An array of indices defined in a document.
local indices = {}
---@type string The current index during parsing.
local current_index_name
---@type table<IndexName,IndexTerm[]> An associative array index name => index terms.
local terms = {}

---Check whether a Pandoc item with an Attr has a class.
---@param elem WithAttr The Block or Inline with an Attr.
---@param class string      The class to look for among the ones in Attr's classes.
---@return boolean
local function hasClass(elem, class)
  if elem and elem.attr and elem.attr.classes then
    local classes = elem.attr.classes
    for i = 1, #classes do
      if classes[i] == class then
        return true
      end
    end
  end
  return false
end

---Search for an Index that satisfies a predicate.
---@param indexes   Index[] An array of indices.
---@param predicate fun(index: Index): boolean
---@return Index|nil
local function findIndexWith(indexes, predicate)
  for i = 1, #indexes do
    local index = indexes[i]
    if predicate(index) == true then
      return index
    end
  end
  return nil
end

---Search for an Index with a specific name.
---@param name IndexName The name of the index you are looking for.
---@return Index|nil
local function findIndexWithName(name)
  return findIndexWith(indices, function(i) return i.name == name end)
end

---Verify if a Span is an index reference.
---If it's an index reference returns true and the Index.
---@param indexes Index[] The known index of a document.
---@param span    Span  A Pandoc Span.
---@return boolean
---@return Index|nil
local function isIndexRef(indexes, span)
  local index = findIndexWith(
    indexes,
    function(i)
      return hasClass(span, i.refClass)
    end
  )
  if index then
    return true, index
  end
  return false
end

---Checks whether a `Div` is meant to define an index.
---@param div Div A Pandoc Div.
---@return boolean
local function isIndexDiv(div)
  return hasClass(div, INDEX_CLASS)
end

---Get an index object corresponding to the `Div`, if it's an index `Div`.
---@param div Div   The `Div` block that could be an index `Div`.
---@param log boolean Produce a log message as side effect.
---@return Index|nil
local function indexFromDiv(div, log)
  if isIndexDiv(div) then
    if log then
      logging_info('Div has the "' .. INDEX_CLASS .. '" class, so I guess it\'s an index definition')
    end
    local attrs = div.attributes
    local name = attrs[INDEX_NAME_ATTR] or INDEX_NAME_DEFAULT
    ---@type "after"|"before"
    local refWhere = attrs[INDEX_REF_WHERE_ATTR] or INDEX_REF_WHERE_DEFAULT
    local refClass = attrs[INDEX_REF_CLASS_ATTR] or INDEX_REF_CLASS_DEFAULT
    local prefix = name

    local index = findIndexWithName(name)
    if index then
      logging_warning('Index with name "' .. name .. '" already defined, ignoring the new definition.')
    else
      index = {
        name = name,
        refClass = refClass,
        refWhere = refWhere,
        prefix = prefix
      }
      table_insert(indices, index)
    end
    return index
  end
  return nil
end

---Get an index term object, if it's an index term `Div`.
---@param div Div A Pandoc `Div`.
---@return IndexName|nil # the name of the index.
---@return string|nil    # the identifier of the term.
---@return string|nil    # the sort key of the term.
---@return Block[]|nil   # the content `Block`s of the `Div`.
local function indexTermFromDiv(div)
  if hasClass(div, INDEX_TERM_CLASS) then
    local attrs = div.attributes
    local id = div.identifier
    local index_name = attrs[INDEX_NAME_ATTR] or current_index_name
    local sort_key = attrs[INDEX_SORT_KEY_ATTR]
    return index_name, id, sort_key, div.content
  end
end

--- BEGINNING OF CODE TO COMPUTE SORT KEYS
local MIN_SORT_KEY_LENGTH = 10 -- min length of a computed sort key
local MAX_SORT_KEY_LENGTH = 40 -- max length of a computed sort key
local NON_LETTER_CHAR = "_"    -- all non letter chars are converted to this one

-- a synthetic table to describe the translation of accented characters
-- included: latin base, supplement, extended A, B, C, extended+, IPA, phonetic exts, extra phonetic exts
-- not included: cyrillic, combining chars, subscript and superscript forms
local ACCENTED_TRANSLATION = {
  { to = "a", oneof = "àáâãäåāăąǎǟǡǻȁȃȧḁẚạảấầẩẫậắằẳẵặⱥ" },
  { to = "b", oneof = "ƀƃɓḃḅḇ" },
  { to = "c", oneof = "çćĉċčƈȼɕḉ" },
  { to = "d", oneof = "ďđƌȡɖɗᵭᶁḋḍḏḑḓ" },
  { to = "e", oneof = "èéêëēĕėęěȅȇȩɇᶒḕḗḙḛḝẹẻẽếềểễệⱸ" },
  { to = "f", oneof = "ƒᵮᶂḟ" },
  { to = "g", oneof = "ĝğġģǥǧǵɠᶃḡ" },
  { to = "h", oneof = "ĥħȟɦḣḥḧḩḫẖ" },
  { to = "i", oneof = "ìíîïĩīĭįıǐȉȋɨᵢᶖḭḯỉị" },
  { to = "j", oneof = "ĵǰɉʝ" },
  { to = "k", oneof = "ķĸƙǩᶄḱḳḵⱪ" },
  { to = "l", oneof = "ĺļľŀłƚȴɫɬɭᶅḷḹḻḽⱡ" },
  { to = "m", oneof = "ɱᵯᶆḿṁṃ" },
  { to = "n", oneof = "ñńņňŉƞǹȵɲɳᵰᶇṅṇṉṋ" },
  { to = "o", oneof = "òóôõöøōŏőơǒǫǭǿȍȏȫȭȯȱṍṏṑṓọỏốồổỗộớờởỡợⱺ" },
  { to = "q", oneof = "ɋʠ" },
  { to = "r", oneof = "ŕŗřȑȓɍɼɽɾᵣᵲᵳᶉṙṛṝṟ" },
  { to = "s", oneof = "śŝşšſșȿʂᵴᶊṡṣṥṧṩ" },
  { to = "t", oneof = "ţťŧƫƭțȶʈᵵṫṭṯṱẗⱦ" },
  { to = "u", oneof = "ùúûüũūŭůűųưǔǖǘǚǜȕȗʉᵤᶙṳṵṷṹṻụủứừửữự" },
  { to = "v", oneof = "ʋᵥᶌṽṿⱱⱴ" },
  { to = "w", oneof = "ŵẁẃẅẇẉẘⱳ" },
  { to = "x", oneof = "ᶍẋẍ" },
  { to = "y", oneof = "ýÿŷƴȳɏẏẙỳỵỷỹỿ" },
  { to = "z", oneof = "źżžƶȥɀʐʑᵶᶎẑẓẕⱬ" },
  { to = "ae", oneof = "æǣǽ" },
  { to = "dz", oneof = "ǆǳ" },
  { to = "ij", oneof = "ĳ" },
  { to = "lj", oneof = "ǉ" },
  { to = "ll", oneof = "ỻ" },
  { to = "nj", oneof = "ǌ" },
  { to = "oe", oneof = "œ" },
  { to = "ss", oneof = "ß" },
}

---@type table<string,string>
local UTF8_TO_UNACCENTED = nil -- a table for accented => not accented translation

---Computes the values of `UTF8_TO_UNACCENTED` from the descriptions in `ACCENTED_TRANSLATION`
local function computeUtf8ToUnaccented()
  UTF8_TO_UNACCENTED = {}
  for i = 1, #ACCENTED_TRANSLATION do
    local acc = ACCENTED_TRANSLATION[i]
    local to, oneof = acc.to, acc.oneof
    local utfchar
    for j = 1, utf8len(oneof) do
      utfchar = utf8sub(oneof, j, j)
      UTF8_TO_UNACCENTED[utfchar] = to
    end
  end
end

---Lowercase a UTF8 string and replace most common latin accented characters
---with the corresponding unaccented ASCII char.
---@param text string A UTF8 text.
---@return string
local function lowerAndRemoveAccents(text)
  if not UTF8_TO_UNACCENTED then
    computeUtf8ToUnaccented()
  end
  local unaccented = {}
  local utfchar, unacc
  local locase = utf8lower(text)
  for i = 1, utf8len(locase) do
    utfchar = utf8sub(locase, i, i)
    if string_len(utfchar) == 1 then
      table_insert(unaccented, utfchar)
    else
      ---@diagnostic disable-next-line: need-check-nil
      unacc = UTF8_TO_UNACCENTED[utfchar]
      if unacc then
        table_insert(unaccented, unacc)
      else
        table_insert(unaccented, NON_LETTER_CHAR)
      end
    end
  end
  return table_concat(unaccented)
end

---Computes a sort key from a UTF8 text.
---The sort key will contain only unaccented latin letters, numbers and NON_LETTER_CHAR chars;
---NON_LETTER_CHAR can't be at the beginning or at the end of the sort key;
---there can't be no consecutive NON_LETTER_CHARs.
---@param text string A UTF8 text.
---@return string
local function computeSortKey(text)
  local index = string_find(text, "%(")
  if not index or index > MAX_SORT_KEY_LENGTH then
    index = 0
    local prev_index
    while index and index < MIN_SORT_KEY_LENGTH do
      prev_index = index
      index = string_find(text, " ", index + 1)
    end
    if index and index > MAX_SORT_KEY_LENGTH then
      if prev_index >= MIN_SORT_KEY_LENGTH and prev_index <= MAX_SORT_KEY_LENGTH then
        index = prev_index
      else
        index = nil
      end
    end
    index = index or MAX_SORT_KEY_LENGTH
  end
  local sort_key = string_sub(text, 1, index - 1)
  -- sort_key = string_gsub(sort_key, " +$", "")
  sort_key = lowerAndRemoveAccents(sort_key)
  sort_key = string_gsub(sort_key, "[^0-9a-z]+", NON_LETTER_CHAR)
  sort_key = string_gsub(sort_key, "^" .. NON_LETTER_CHAR .. "+", "")
  sort_key = string_gsub(sort_key, NON_LETTER_CHAR .. "+$", "")
  return sort_key
end

---Add an IndexTerm to the table of the terms of an index.
---@param index_name string      The index name.
---@param id         string      The term identifier.
---@param sort_key   string|nil  The string to use to sort terms.
---@param content    Block[]|nil The content of the term.
local function addIndexTerm(index_name, id, sort_key, content)
  local index_terms = terms[index_name]
  if not index_terms then
    terms[index_name] = {}
    index_terms = terms[index_name]
  end
  local content_as_doc = pandoc_Pandoc(content)
  local sortKey = sort_key
  if not sortKey then
    sortKey = computeSortKey(pandoc_write(pandoc_Pandoc(content), 'plain', { wrap_text = "preserve" }))
    -- logging_info('Text for sort key: "' .. sortKey .. '"')
  end
  local text = pandoc_write(content_as_doc, "plain", { wrap_text = "preserve" })
  table_insert(index_terms, {
    id = id,
    sortKey = sortKey,
    text = text,
    blocks = content_as_doc.blocks
  })
end

---Find an `IndexTerm` with an `id`
---@param docIndices DocumentIndices The indices of a document.
---@param id string The identifier of the `IndexTerm`.
---@param indexName? string The index name; if not given, it searches in every index.
---@return nil|IndexTerm
local function findIndexTerm(docIndices, id, indexName)
  local index_names = {} ---@type string[]
  if indexName then
    table_insert(index_names, indexName)
  else
    for i = 0, #docIndices.indices do
      table_insert(index_names, docIndices.indices[i].name)
    end
  end
  local index_terms
  for i = 0, #index_names do
    index_terms = docIndices.terms[index_names[i]]
    if index_terms then
      for j = 1, #index_terms do
        local term = index_terms[j]
        if term.id == id then
          return term
        end
      end
    end
  end
end

---@class TextForXmlOptions
---@field maxLength? integer Truncate the text to this length when it exceeds it.
---@field removeNewlines? boolean Remove newlines.
---@field removeSoftHyphens boolean Remove soft hyphen chars.

---Transform the text to go into XML.
---@param text string The text to transform.
---@param options TextForXmlOptions Options for the transformation into XML.
---@return string
local function textForXml(text, options)
  -- remove newlines at the end
  local forxml = text
  if options.removeNewlines then
    forxml = string_gsub(forxml, "[\r\n ]+$", "")
  end
  -- replace ampersands
  forxml = string_gsub(forxml, '&', "&amp;")
  -- replace quotes
  forxml = string_gsub(forxml, '"', "&quot;")
  -- replace soft hyphens
  if options.removeSoftHyphens then
    forxml = string_gsub(forxml, '\xC2\xAD', "")
  end
  -- trim the text
  if options.maxLength then
    forxml = utf8sub(forxml, 1, options.maxLength)
  end
  return forxml
end

---A Pandoc filter that collects all the index terms
---from the `Div`s that have the `INDEX_TERM_CLASS`.
local collect_index_terms = {
  Div = function(div)
    local index_name, id, sort_key, content = indexTermFromDiv(div)
    if index_name and id then
      addIndexTerm(index_name, id, sort_key, content)
    end
  end
}

---A Pandoc filter that collects all the `Div` blocks that define an index
---(i.e. that have the `INDEX_CLASS` class).
local collect_indices = {
  traverse = 'topdown',
  Div = function(div)
    local index = indexFromDiv(div, true)
    if index then
      logging_info(
        'Index "'
        .. index.name
        .. '", refs have class "'
        .. index.refClass
        .. '" and they are put '
        .. index.refWhere
        .. ' the text they wrap'
      )
      local prev_index_name = current_index_name
      current_index_name = index.name
      pandoc.walk_block(div, collect_index_terms)
      current_index_name = prev_index_name
    else
      local index_name, id, sort_key = indexTermFromDiv(div)
      if index_name and id then
        addIndexTerm(index_name, id, sort_key, div.content)
      end
    end
  end
}

---Collect all the indices from a Pandoc document.
---@param doc table A Pandoc document.
---@return DocumentIndices
local function collectIndices(doc)
  indices = {}
  terms = {}
  doc:walk(collect_indices)
  return {
    indices = indices,
    terms = terms
  }
end

---A filter to remove all the `Div`s that represent terms of indices.
---@type Filter
local expungeIndexTerms = {
  Div = function(div)
    if hasClass(div, INDEX_TERM_CLASS) then
      return pandoc.List({})
    end
  end
}

return {
  collectIndices = collectIndices,
  expungeIndexTerms = expungeIndexTerms,
  findIndexWith = findIndexWith,
  findIndexTerm = findIndexTerm,
  hasClass = hasClass,
  isIndexDiv = isIndexDiv,
  isIndexRef = isIndexRef,
  textForXml = textForXml,
  logging_error = logging_error,
  logging_warning = logging_warning,
  logging_info = logging_info,
  INDEX_CLASS = INDEX_CLASS,
  INDEX_NAME_ATTR = INDEX_NAME_ATTR,
  INDEX_NAME_DEFAULT = INDEX_NAME_DEFAULT,
  INDEX_REF_CLASS_ATTR = INDEX_REF_CLASS_ATTR,
  INDEX_REF_CLASS_DEFAULT = INDEX_REF_CLASS_DEFAULT,
  INDEX_REF_WHERE_ATTR = INDEX_REF_WHERE_ATTR,
  INDEX_REF_BEFORE = INDEX_REF_BEFORE,
  INDEX_REF_AFTER = INDEX_REF_AFTER,
  INDEX_REF_WHERE_DEFAULT = INDEX_REF_WHERE_DEFAULT,
  INDEX_TERM_CLASS = INDEX_TERM_CLASS,
  INDEX_SORT_KEY_ATTR = INDEX_SORT_KEY_ATTR,
}
