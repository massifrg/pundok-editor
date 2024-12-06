--[[
    indices2json.lua: A [Pandoc writer](https://pandoc.org/custom-writers.html)
                      to extract the indices of a document in JSON format. 
    Copyright:        (c) 2024 M. Farinella
    License:          MIT - see LICENSE file for details
    Usage:            See README.md for details
]]

-- load type annotations from common file (just for development under VS Code/Codium)
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

---@diagnostic disable-next-line: undefined-global
addPathsToLuaPath({ pandoc.path.directory(PANDOC_SCRIPT_FILE) })
local pandocIndices = require('pandoc-indices')

function Writer(doc, opts)
  local data = pandocIndices.collectIndices(doc)
  return pandoc.json.encode(data)
end

function Template()
  local t = pandoc.template.default 'plain'
  return t
end
