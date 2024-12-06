--- A Pandoc filter to recursively include sub-documents.

---@module "pandoc-types-annotations"

--- This filter's version
local FILTER_VERSION = "0.4.4"

--- The class for `Div` elements to see their contents replaced by the ones
-- of the sources specified with @{INCLUDE_SRC_ATTR} and @{INCLUDE_FORMAT_ATTR}.
local INCLUDE_DOC_CLASS = "include-doc"
--- The class to add to `Div` elements that specify a sub-document inclusion,
-- when the inclusion succeeds.
local INCLUDE_INCLUDED_CLASS = "included"
--- The attribute for inclusion `Div`s that specifies the format of the document to be included.
local INCLUDE_FORMAT_ATTR = "include-format"
--- The attribute for inclusion `Div`s that specifies the source of the document to be included.
local INCLUDE_SRC_ATTR = "include-src"
--- The attribute that carries the SHA-1 of the imported contents, when the inclusion succeeds.
local INCLUDE_SHA1_ATTR = "include-sha1"
--- The attribute with the identifier that this filter assigns to an imported document.
-- It's equal to the sub-key of @{INCLUDE_DOC_SUB_META_KEY} that contains the sub-document metadata
-- in the resulting document.
local INCLUDE_ID_ATTR = "included-id"
--- The metadata key (in the resulting doc) that stores the id of the root document contents
local ROOT_ID_META_KEY = "root_id"
--- You can ovverride the root id with --metadata root-id=...
local OVERRIDE_ROOT_ID_META_KEY = "root-id"
--- The metadata key (in the resulting doc) that stores the format of the root document contents
local ROOT_FORMAT_META_KEY = "root_format"
--- The metadata key (in the resulting doc) that stores the source of the root document contents
local ROOT_SRC_META_KEY = "root_src"
--- The metadata key (in the resulting doc) that stores the SHA1 of the root document contents
local ROOT_SHA1_META_KEY = "root_sha1"

local PANDOC_STATE = PANDOC_STATE
local pandoc = pandoc
local pandoc_path = pandoc.path
local FORMAT = FORMAT

local table_insert = table.insert

-- add the directory of this script to the lua path to load logging.lua
local script_dir = pandoc_path.directory(PANDOC_SCRIPT_FILE)
package.path = package.path .. ";" .. script_dir .. '/?.lua;' .. script_dir .. '/?/init.lua'
local logging = require("logging")
local logging_info = logging.info
local logging_warning = logging.warning
local logging_error = logging.error

---Check whether a Pandoc item with an `Attr` has a class.
---@param elem WithAttr The `Block` or `Inline` with an `Attr`.
---@param class string The class to look for among the ones in `Attr`'s classes.
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

---Check whether a `Div` is meant to include contents from an external source
---@param div Div The `Div` block to check.
---@return boolean is_inclusion_div
---@return string|nil source # The source (URI or path) of the included document.
---@return string|nil format # The format of the included document, when specified.
---@return boolean|nil # `true` when INCLUDE_DOC_CLASS is found.
local function isInclusionDiv(div, log)
  if not div.tag == "Div" then
    return false
  end
  local src = div.attributes[INCLUDE_SRC_ATTR]
  local has_include_doc_class = hasClass(div, INCLUDE_DOC_CLASS)
  if src then
    if log then
      logging_info('Div has a "' .. INCLUDE_SRC_ATTR .. '" attribute, but no "' .. INCLUDE_DOC_CLASS .. '" class')
    end
    local format = div.attributes[INCLUDE_FORMAT_ATTR] or pandoc.format.from_path(src)
    if format then
      return true, src, format, has_include_doc_class
    elseif log then
      logging_warning('format not found for source "' .. src .. '"')
    end
  elseif log and has_include_doc_class then
    logging_warning('Div has "' .. INCLUDE_DOC_CLASS .. '" class, but no valid "' .. INCLUDE_SRC_ATTR .. '" attribute')
  end
  return false
end

---@class Container
---@field id string
---@field src string
---@field format string
---@field sha1 string
---@field children Container[]

local filters = { inclusion_tree_filter = nil }
local base = {}
local current_container = base ---@type Container

local function storeAndExplore(div, filter_name)
  if not current_container.children then
    current_container.children = {}
  end
  local attributes = div.attributes
  local container = {
    id = attributes[INCLUDE_ID_ATTR],
    src = attributes[INCLUDE_SRC_ATTR],
    format = attributes[INCLUDE_FORMAT_ATTR],
    sha1 = attributes[INCLUDE_SHA1_ATTR],
  }
  table_insert(current_container.children, container)
  local saved_current_container = current_container
  current_container = container
  div:walk(filters[filter_name])
  current_container = saved_current_container
end

---The filter that does the actual inclusion through `Div` elements with a particular class.
---@type Filter
local inclusion_tree_filter = {
  traverse = 'topdown',

  Div = function(div)
    if isInclusionDiv(div) then
      storeAndExplore(div, "inclusion_tree_filter")
      return pandoc.List()
    end
  end
}

filters.inclusion_tree_filter = inclusion_tree_filter

function Writer(doc, opts)
  doc:walk(inclusion_tree_filter)
  local meta = doc.meta
  local src = tostring(meta[ROOT_SRC_META_KEY] or PANDOC_STATE.source_url)
  local override_root_id = meta[OVERRIDE_ROOT_ID_META_KEY]
  base.id = override_root_id and tostring(override_root_id) or tostring(meta[ROOT_ID_META_KEY])
  base.src = src
  base.format = tostring(meta[ROOT_FORMAT_META_KEY] or pandoc.format.from_path(src) or FORMAT)
  base.sha1 = tostring(meta[ROOT_SHA1_META_KEY])
  return pandoc.json.encode(base)
end

function Template()
  local t = pandoc.template.default 'plain'
  return t
end

return { inclusion_tree_filter }
