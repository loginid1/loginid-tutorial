local Lrucache = require "resty.lrucache"

local cache, err = Lrucache.new(200)  -- allow up to 200 items in the cache
if not cache then
    error("failed to create the cache: " .. (err or "unknown"))
end

local M = {}

function M:set_value(key, value, expire)
  cache:set(key, value, expire)
end


function M:get_value(key)
  local value = cache:get(key)

  return value
end


return M