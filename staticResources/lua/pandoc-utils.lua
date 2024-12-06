--[[
Utilities functions for Pandoc Lua filters/readers/writers.
]]--

---@module "pandoc-types-annotations"

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

return {
  addPathsToLuaPath = addPathsToLuaPath,
  hasClass = hasClass,
}