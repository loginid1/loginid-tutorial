local JWT_parser = require "kong.plugins.loginid.jwt_parser"

local plugin = {
  PRIORITY = 1000,
  VERSION = "0.1",
}


local function get_token(auth_header)

  local word_counter = 0

  for word in auth_header:gmatch("%S+") do
    if word_counter == 1 then
      return word
    end

    word_counter = word_counter + 1
  end

  return nil

end


local function authenticate(auth_header, plugin_conf)

  if auth_header == nil then
    return false, { status = 401, message = "Unauthorized" }
  end

  local auth_token = get_token(auth_header)

  if auth_token == nil or type(auth_token) ~= "string" then
    return false, { status = 401, message = "Invalid Token" }
  end

  local verified, err = JWT_parser:decode_and_validate(auth_token, plugin_conf)

  if not verified then
    return false, err
  end

  return true, nil
end


function plugin:access(plugin_conf)

  local auth_header = kong.request.get_header("authorization");

  local token_status, err = authenticate(auth_header, plugin_conf)
  if not token_status then
    return kong.response.exit(err.status, { message = err.message })
  end

end


return plugin
