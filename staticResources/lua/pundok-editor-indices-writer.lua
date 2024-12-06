local tinsert = table.insert
local gsub = string.gsub

local INDEX_CLASS = 'index'
local INDEX_TERM_CLASS = 'index-term'
local INDEX_NAME_ATTR = 'index-name'
local DEFAULT_INDEX_NAME = 'index'

local indices = {}

local currentIndexName

local function hasClass(attr, c)
  local classes = attr.classes or {}
  for i = 1, #classes do
    if classes[i] == c then
      return true
    end
  end
  return false
end

local function logging_info(...)
end
local function logging_warning(w)
  io.stderr:write('(W) include-doc: ' .. w .. '\n')
end
local function logging_error(e)
  io.stderr:write('(E) include-doc: ' .. e .. '\n')
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

local indexTermsFilter = {
  traverse = 'topdown',

  Div = function(div)
    local attr = div.attr
    if hasClass(attr, INDEX_CLASS) then
      currentIndexName = div.attributes[INDEX_NAME_ATTR] or DEFAULT_INDEX_NAME
      logging_info('index found: ' .. currentIndexName)
    elseif hasClass(attr, INDEX_TERM_CLASS) then
      local indexName = div.attributes[INDEX_NAME_ATTR] or currentIndexName
      if not indices[indexName] then
        indices[indexName] = {}
      end
      local index = indices[indexName]
      local id = div.identifier or div.attributes['data-id']
      logging_info('index term found: ' .. indexName .. ", " .. (id or 'NO ID'))
      if id then
        local minidoc = pandoc.Pandoc(div.content)
        local text = pandoc.write(minidoc, 'plain')
        local html = pandoc.write(minidoc, 'html')
        text = gsub(text, '\n+', ' ')
        html = gsub(html, '\n+', ' ')
        tinsert(index, { id = id, text = text, html = html })
      end
    end
  end
}

function Writer(doc, opts)
  doc:walk(indexTermsFilter)
  return pandoc.json.encode(indices)
end

-- function Template()
--   local template = pandoc.template
--   return template.compile(template.default 'plain')
-- end
