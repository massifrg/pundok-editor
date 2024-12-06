--[[
    icml_with_index.lua: A [Pandoc writer](https://pandoc.org/custom-writers.html)
                         to export an ICML file with the information to generate an index.
    Copyright:           (c) 2024 M. Farinella
    License:             MIT - see LICENSE file for details
    Usage:               See README.md for details
]]

-- load type annotations from common files (just for development under VS Code/Codium)
---@module 'pandoc-indices'

---Add paths to search for Lua code to be loaded with `require`.
---See [here](https://github.com/jgm/pandoc/discussions/9598).
---@param paths string[]
local function addPathsToLuaPath(paths)
  local luapaths = {}
  local path
  for i = 1, #paths do
    path = paths[i]
    if path and type(path) == "string" then
      table.insert(luapaths, path .. "/?.lua")
      table.insert(luapaths, path .. "/?/init.lua")
    end
  end
  package.path = package.path .. ";" .. table.concat(luapaths, ";")
end

addPathsToLuaPath({ pandoc.path.directory(PANDOC_SCRIPT_FILE) })
local pandocIndices = require('pandoc-indices')

---A string used in ICML index topics.
local ICML_TOPICN = "Topicn"
---The max length of the `Name` attribute in an index `Topic` in ICML.
---When it's `nil`, it means "no max length"
local MAX_ICML_TERM_TEXT_LENGTH = nil

local pandoc = pandoc
local string_find = string.find
local string_gsub = string.gsub
local string_sub = string.sub
local table_insert = table.insert
local table_concat = table.concat
local utf8sub = pandoc.text.sub

-- beginning of functions for logging
---@module 'logging'

---Write a warning message to the standard error.
local function logging_info(i)
  io.stderr:write('(I) icml_with_index: ' .. i .. '\n')
end
---Write an informative message to the standard error.
local function logging_warning(w)
  io.stderr:write('(W) icml_with_index: ' .. w .. '\n')
end
---Write an error message to the standard error.
local function logging_error(e)
  io.stderr:write('(W) icml_with_index: ' .. e .. '\n')
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

-- Adding a field to the IndexTerm class for ICML
---@class IndexTerm A term inside an Index.
---@field icml string  Like the text field, but normalized for ICML.

---@type Index[]
local indices = {}
---The content of the index in ICML to be passed in `WriterOptions.variables`
---to [pandoc.write](https://pandoc.org/lua-filters.html#pandoc.write).
---@type string
local index_var = ""
---@type table<IndexName,IndexTerm[]>
local terms = {}

local _isIndexRef = pandocIndices.isIndexRef
local hasClass = pandocIndices.hasClass
local textForXml = pandocIndices.textForXml
local INDEX_NAME_DEFAULT = pandocIndices.INDEX_NAME_DEFAULT
local INDEX_REF_BEFORE = pandocIndices.INDEX_REF_BEFORE
local INDEX_TERM_CLASS = pandocIndices.INDEX_TERM_CLASS

---Verify if a Span is an index reference.
---If it's an index reference returns true and the Index.
---@param span    Span  A Pandoc Span.
---@return boolean
---@return Index|nil
local function isIndexRef(span)
  return _isIndexRef(indices, span)
end

---A table that associates the id of an index term
-- to the array index (offset) in terms[index_name]
---@type table<IndexName, table<string,integer>>
local term_id_to_array_index = {}
---Retrieves an index term that has an id.
---@param index_name IndexName The name of the index.
---@param id         string    The index term identifier.
---@return IndexTerm|nil
local function getIndexTermById(index_name, id)
  local index_terms = terms[index_name] or {}
  if not term_id_to_array_index[index_name] then
    local id_to_array_index = {}
    for t = 1, #index_terms do
      local term = index_terms[t]
      if term.id then
        id_to_array_index[term.id] = t
      end
    end
    term_id_to_array_index[index_name] = id_to_array_index
  end
  local i = term_id_to_array_index[index_name][id]
  if i then
    return index_terms[i]
  end
end

---Normalize the text that goes into an ICML Index.
---@param text string The text to normalize for ICML.
---@return string
local function normalizeIcmlText(text)
  return textForXml(text, {
    removeSoftHyphens = true,
    removeNewlines = true,
    maxLength = MAX_ICML_TERM_TEXT_LENGTH
  })
end

---Produce a reference to an index to be put in an ICML document.
---@param idref        string The identifier of the index term.
---@param index_name   string The name of the index the term belongs to.
---@param index_prefix string The prefix of the index.
local function getIcmlReference(idref, index_name, index_prefix)
  if not idref then
    logging_warning("can't get a reference without an idref")
    return
  end
  local term = getIndexTermById(index_name or INDEX_NAME_DEFAULT, idref)
  if term then
    local self_attr = '' -- ' Self="u301"'
    -- local ref_topic_attr = ' ReferencedTopic="' .. index_prefix .. idref .. '"' -- ' ReferencedTopic="u115Topicnesempio"'
    if not term.icml then
      term.icml = normalizeIcmlText(term.text)
    end
    local ref_topic_attr = ' ReferencedTopic="' ..
        index_prefix .. ICML_TOPICN .. term.icml ..
        '"'            -- ' ReferencedTopic="u115Topicnesempio"'
    local id_attr = '' -- ' Id="1"'
    local text = '<CharacterStyleRange AppliedCharacterStyle="CharacterStyle/$ID/[No character style]">\n'
        .. '  <PageReference'
        .. self_attr
        .. ' PageReferenceType="CurrentPage"'
        .. ref_topic_attr
        .. id_attr
        .. ' />\n'
        .. '</CharacterStyleRange>\n'
    return pandoc.List({ pandoc.RawInline('icml', text) })
  end
  return pandoc.List({})
end

---Create an index topic for ICML.
---@param  prefix string    A prefix for the topic identifier.
---@param  term   IndexTerm A term of the index.
---@return string
local function getIcmlTopic(prefix, term)
  if not term.icml then
    term.icml = normalizeIcmlText(term.text)
  end
  return '<Topic'
      .. ' Self="' .. prefix .. ICML_TOPICN .. term.icml .. '"'
      .. ' SortOrder="' .. (term.sortKey or '') .. '"'
      .. ' Name="' .. term.icml .. '"'
      .. ' />'
end

---A Pandoc filter that inserts the index references in the ICML text.
---@type Filter
local insert_index_references = {
  Span = function(span)
    local is_index_ref, index = isIndexRef(span)
    if is_index_ref then
      local idref = span.attributes.idref
      if idref then
        ---@diagnostic disable-next-line: need-check-nil
        logging_info('Found reference for index "' .. index.name .. '", term with idref=' .. idref)
        local inlines = pandoc.List({})
        ---@diagnostic disable-next-line: need-check-nil
        local ref = getIcmlReference(idref, index.name, index.prefix)
        if ref then
          ---@diagnostic disable-next-line: need-check-nil
          if index.refWhere == INDEX_REF_BEFORE then
            inlines:extend(ref)
            inlines:extend(span.content)
          else
            inlines:extend(span.content)
            inlines:extend(ref)
          end
          return inlines
        end
      else
        ---@diagnostic disable-next-line: need-check-nil
        logging_warning('Found reference for index "' .. index.name .. '" without an idref')
      end
    end
  end
}

---A Pandoc filter that sets the `index` variable to be used in `WriterOptions.variables`.
---It does not change the document.
---@type Filter
local set_index_variable = {
  Pandoc = function(doc)
    local index_lines = {}
    for i = 1, #indices do
      local index = indices[i]
      table_insert(index_lines, '<Index Self="' .. index.prefix .. '">')
      local index_terms = terms[index.name] or {}
      for t = 1, #index_terms do
        local term = index_terms[t]
        table_insert(index_lines, getIcmlTopic(index.prefix, term))
      end
      table_insert(index_lines, '</Index>')
    end
    index_var = table_concat(index_lines, '\n')
    return doc
  end
}

---Pandoc filters to be applied to the document, to produce an ICML with an index.
local indices_filters = { insert_index_references, set_index_variable, pandocIndices.expungeIndexTerms }

---Pandoc writer to produce an ICML document with an index.
function Writer(doc, opts)
  local collected = pandocIndices.collectIndices(doc)
  indices = collected.indices
  terms = collected.terms
  local filtered = doc
  for i = 1, #indices_filters do
    logging_info("applying filter #" .. i)
    local filter = indices_filters[i]
    filtered = filtered:walk(filter)
  end
  -- make a clone of opts and add the index variable
  local options = pandoc.WriterOptions(opts)
  options.variables.index = index_var
  return pandoc.write(filtered, 'icml', options)
end

---Template that inserts the `<Index>` element just before the main `<Story>` in ICML.
function Template()
  local t = pandoc.template.default 'icml'
  local story_start = string_find(t, '  <Story Self="pandoc_story"')
  if story_start then
    t = string_sub(t, 1, story_start - 1) .. '$index$\n  ' .. string_sub(t, story_start)
  end
  return t
end
