--[[
    odt_index.lua: A [Pandoc filter](https://pandoc.org/lua-filters.html)
                   to export in ODT format with the information to generate an index.
    Copyright:     (c) 2024 M. Farinella
    License:       MIT - see LICENSE file for details
    Usage:         See README.md for details
]]

-- load type annotations from common files (just for development under VS Code/Codium)
---@module 'pandoc-types-annotations'
---@module 'pandoc-indices'

local pandoc_List = pandoc.List
local pandoc_RawInline = pandoc.RawInline

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
local findIndexTerm = pandocIndices.findIndexTerm
local textForXml = pandocIndices.textForXml
local logging_error = pandocIndices.logging_error
local logging_warning = pandocIndices.logging_warning
local logging_info = pandocIndices.logging_info

---@type DocumentIndices
local indices_data = {
  indices = {},
  terms = {}
}

---Check whether a class represents an index reference in the text.
---@param c string The class of a `Span` `Inline`.
---@return boolean `true` if there's an `Index` with that reference class.
---@return Index|nil # The corresponding `Index`, when found.
local function isIndexRefClass(c)
  local indices = indices_data.indices
  for i = 1, #indices do
    local index = indices[i]
    if index.refClass == c then
      return true, index
    end
  end
  return false
end

---Check whether a `Span` is a reference to an `Index` in the text.
---@param span Span
---@return boolean `true` if the `Span` has a class that matches an `Index` reference class.
---@return Index|nil # The corresponding `Index`, when found.
local function isIndexRef(span)
  local classes = span.classes
  if not classes or #classes == 0 then return false end
  for i = 1, #classes do
    local c = classes[i]
    local is_index_ref, index = isIndexRefClass(c)
    if is_index_ref then
      return is_index_ref, index
    end
  end
  return false
end

---@type Filter
local load_indices = {
  Pandoc = function(doc)
    indices_data = pandocIndices.collectIndices(doc)
  end,
}

---@type Filter
local index_references_to_odt_rawinlines = {
  Span = function(span)
    local idref = span.attributes.idref
    if idref then
      local is_index_ref, index = isIndexRef(span)
      if is_index_ref then
        ---@diagnostic disable-next-line: need-check-nil
        local term = findIndexTerm(indices_data, idref, index.name)
        if term then
          logging_info("reference to term " .. idref .. ": " .. term.text)
          local term_text_as_xml = textForXml(term.text, {
            removeSoftHyphens = true,
            removeNewlines = true,
            -- maxLength = 100
          })
          local text = '<text:alphabetical-index-mark'
              .. ' text:string-value="' .. "" .. '"'
              .. ' text:key1="' .. term_text_as_xml .. '"'
              .. '/>'
          local rawinline = pandoc_RawInline('opendocument', text) ---@type RawInline
          return pandoc_List({ span, rawinline })
        else
          logging_warning("Found a reference to an index term with id=\"" ..
            idref .. "\", but I can't find the index term.")
        end
      end
    end
  end,
}

return {
  load_indices,
  index_references_to_odt_rawinlines,
  pandocIndices.expungeIndexTerms
}
