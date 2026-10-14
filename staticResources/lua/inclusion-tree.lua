--- A Pandoc filter to recursively include sub-documents.

---@module "pandoc-types-annotations"

local PANDOC_STATE              = PANDOC_STATE
local pandoc                    = pandoc
local pandoc_path               = pandoc.path
local FORMAT                    = FORMAT
local stringify                 = pandoc.utils.stringify

local table_insert              = table.insert

local script_dir                = pandoc_path.directory(PANDOC_SCRIPT_FILE)
package.path                    = package.path
    .. ";" .. script_dir .. '/?.lua;'
    .. script_dir .. '/?/init.lua'
local log_info                  = pandoc.log.info
local log_warn                  = pandoc.log.warn

local common                    = require("include-common")

local INCLUDE_FORMAT_ATTR       = common.INCLUDE_FORMAT_ATTR
local INCLUDE_SRC_ATTR          = common.INCLUDE_SRC_ATTR
local INCLUDE_SHA1_ATTR         = common.INCLUDE_SHA1_ATTR
local INCLUDE_ID_ATTR           = common.INCLUDE_ID_ATTR
local ROOT_ID_META_KEY          = common.ROOT_ID_META_KEY
local OVERRIDE_ROOT_ID_META_KEY = common.OVERRIDE_ROOT_ID_META_KEY
local ROOT_FORMAT_META_KEY      = common.ROOT_FORMAT_META_KEY
local ROOT_SRC_META_KEY         = common.ROOT_SRC_META_KEY
local ROOT_SHA1_META_KEY        = common.ROOT_SHA1_META_KEY
local isInclusionDiv            = common.isInclusionDiv

---@class Container
---@field id string
---@field src string
---@field format string
---@field sha1 string
---@field children Container[]

local filters                   = { inclusion_tree_filter = nil }
local base                      = {}
local current_container         = base ---@type Container

local function setFirstTitleOfContainer(div, container)
  local first_title = nil
  ---@type Filter
  local first_title_filter = {
    traverse = "topdown",
    Header = function(header)
      if not first_title then
        first_title = stringify(header.content)
      end
    end
  }
  div:walk(first_title_filter)
  if first_title then
    container.title = first_title
  end
end

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
  setFirstTitleOfContainer(div, container)
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
  setFirstTitleOfContainer(pandoc.Div(doc.blocks), base)
  return pandoc.json.encode(base)
end

function Template()
  local t = pandoc.template.default 'plain'
  return t
end

return { inclusion_tree_filter }
