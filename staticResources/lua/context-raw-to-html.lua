local pandoc           = pandoc
local tconcat          = table.concat
local tinsert          = table.insert
local ssub             = string.sub

---@diagnostic disable-next-line: undefined-global
local FORMAT           = FORMAT
local isHtml           = ssub(FORMAT, 1, 4) == 'html' or FORMAT == 'chunkedhtml'
---@diagnostic disable-next-line: undefined-global
local variables        = PANDOC_WRITER_OPTIONS.variables
local raw_inline_tag   = variables.raw_inline_tag or 'span'
local raw_block_tag    = variables.raw_block_tag or 'pre'
local raw_inline_class = variables.raw_inline_class or 'context'
local raw_block_class  = variables.raw_block_class or 'context'

local function htmlTags(tag, attributes)
  local chunks = { '<', tag }
  if attributes then
    for name, value in pairs(attributes) do
      tinsert(chunks, ' ')
      tinsert(chunks, name)
      tinsert(chunks, '="')
      tinsert(chunks, value)
      tinsert(chunks, '"')
    end
  end
  tinsert(chunks, '>')
  local open = table.concat(chunks)
  return open, '</' .. tag .. '>'
end

return {
  {
    RawInline = function(raw)
      if isHtml and raw.format == 'context' then
        local attributes = {}
        if raw_inline_class then attributes.class = raw_inline_class end
        local open, close = htmlTags(raw_inline_tag, attributes)
        return pandoc.RawInline('html', open .. raw.text .. close)
      end
    end,
    RawBlock = function(raw)
      if isHtml and raw.format == 'context' then
        local attributes = {}
        if raw_block_class then attributes.class = raw_block_class end
        local open, close = htmlTags(raw_block_tag, attributes)
        return pandoc.RawBlock('html', open .. raw.text .. close)
      end
    end
  }
}
