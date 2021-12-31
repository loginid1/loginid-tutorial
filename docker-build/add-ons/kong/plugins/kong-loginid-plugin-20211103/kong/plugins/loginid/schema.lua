local typedefs = require "kong.db.schema.typedefs"

-- Grab pluginname from module name
local plugin_name = ({...})[1]:match("^kong%.plugins%.([^%.]+)")

local schema = {
  name = plugin_name,
  fields = {
    -- the 'fields' array is the top-level entry with fields defined by Kong
    { consumer = typedefs.no_consumer },  -- this plugin cannot be configured on a consumer (typical for io.loginid.sdk.java.auth plugins)
    { protocols = typedefs.protocols_http },
    { config = {
        -- The 'config' record is the custom part of the plugin schema
        type = "record",
        fields = {
          -- a standard defined field (typedef), with some customizations
          { login_id_base_url = { type = "string", required = true }, },
          { login_id_client_id = { type = "string", required = true }, },
          { login_id_public_key_url = { type = "string", required = true }, },
          { ttl = { -- self defined field
              type = "integer",
              default = 600,
              required = true,
              gt = 0, }}, -- adding a constraint for the value
          { issuer = { type = "string", required = true, default = "loginid.io" }, },
          { audience = { type = "string", required = true}, },
          { namespace_id = { type = "string"}, },
          { acr = { type = "string"}, },
          { algorithm = {
            type = "string",
            default = "ES256"
          }, },
          { maximum_age = {
            type = "number",
            default = 300
          }, },
          { header_names = {
            type = "set",
            elements = { type = "string" },
            default = { "authorization" },
          }, },
        },
      },
    },
  }
}

return schema
