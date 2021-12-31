local Resty_httpc = require "resty.http"
local Json  = require 'cjson'

local http_caller = {}

function http_caller:get_public_key(public_key_url, kid)
  local httpc = Resty_httpc.new()

  local response = httpc:request_uri(public_key_url .. "?kid=" .. kid, {
      method = "GET"
  })

  if response.status ~= 200 then
    local decoded_body = Json.decode(response.body)
    return false, decoded_body.message
  end

  return true, response.body

end

return http_caller