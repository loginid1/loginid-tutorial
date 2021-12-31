-- JWT verification module
-- Adapted version of x25/luajwt for Kong
--
-- @see https://github.com/x25/luajwt

local cjson  = require 'cjson'
local openssl_hmac = require "resty.openssl.hmac"
local openssl_pkey = require "resty.openssl.pkey"
local openssl_digest = require "resty.openssl.digest"
local HTTP_caller = require "kong.plugins.loginid.login_id_caller"
local asn_sequence = require "kong.plugins.loginid.asn_sequence"
local Cache_handler = require "kong.plugins.loginid.cache_handler"

local encode_base64 = ngx.encode_base64
local decode_base64 = ngx.decode_base64
local assert = assert
local sub = string.sub

local alg_sign = {
  ['HS256'] = function(data, key) return openssl_hmac.new(key, "sha256"):final(data) end,
  ['HS384'] = function(data, key) return openssl_hmac.new(key, "sha384"):final(data) end,
  ['HS512'] = function(data, key) return openssl_hmac.new(key, "sha512"):final(data) end,
  ['ES256'] = function(data, key)
    local pkey = openssl_pkey.new(key)
    local digest = openssl_digest.new("sha256")
    assert(digest:update(data))
    local signature = assert(pkey:sign(digest))

    local derSequence = asn_sequence.parse_simple_sequence(signature)
    local r = asn_sequence.unsign_integer(derSequence[1], 32)
    local s = asn_sequence.unsign_integer(derSequence[2], 32)
    assert(#r == 32)
    assert(#s == 32)
    return r .. s
  end,
}

local alg_verify = {
	['HS256'] = function(data, signature, key) return signature == alg_sign.HS256(data, key) end,
  ['HS384'] = function(data, signature, key) return signature == alg_sign.HS384(data, key) end,
  ['HS512'] = function(data, signature, key) return signature == alg_sign.HS512(data, key) end,
  ['ES256'] = function(data, signature, key)
    local pkey, _ = openssl_pkey.new(key)
    assert(pkey, "Consumer Public Key is Invalid")
    assert(#signature == 64, "Signature must be 64 bytes.")
    local asn = {}
    asn[1] = asn_sequence.resign_integer(sub(signature, 1, 32))
    asn[2] = asn_sequence.resign_integer(sub(signature, 33, 64))
    local signatureAsn = asn_sequence.create_simple_sequence(asn)
    local digest = openssl_digest.new("sha256")
    assert(digest:update(data))
    return pkey:verify(signatureAsn, digest)
  end,
}

local function b64_encode(input)
	local result = encode_base64(input)

	result = result:gsub('+','-'):gsub('/','_'):gsub('=','')

	return result
end

local function b64_decode(input)
--	input = input:gsub('\n', ''):gsub(' ', '')

	local reminder = #input % 4

	if reminder > 0 then
		local padlen = 4 - reminder
		input = input .. string.rep('=', padlen)
	end

	input = input:gsub('-','+'):gsub('_','/')

	return decode_base64(input)
end

local function tokenize(str, div, len)
	local result, pos = {}, 0

	for st, sp in function() return str:find(div, pos, true) end do

		result[#result + 1] = str:sub(pos, st-1)
		pos = sp + 1

		len = len - 1

		if len <= 1 then
			break
		end
	end

	result[#result + 1] = str:sub(pos)

	return result
end

local M = {}

M.__index = M

function M:encode(data, key, alg)
	if type(data) ~= 'table' then return false, { status = 401, message = "Argument #1 must be table" } end
	if type(key) ~= 'string' then return false, { status = 401, message = "Argument #2 must be string" } end

	alg = alg or "HS256"

	if not alg_sign[alg] then
		return false, { status = 401, message = "Algorithm not supported" }
	end

	local header = { typ='JWT', alg=alg }

	local segments = {
		b64_encode(cjson.encode(header)),
		b64_encode(cjson.encode(data))
	}

	local signing_input = table.concat(segments, ".")

	local signature = alg_sign[alg](signing_input, key)

	segments[#segments+1] = b64_encode(signature)

	return table.concat(segments, ".")
end


local function compare_cached_token(token)
  local token_hash = openssl_hmac.new("PuM213oIn46DjiDBYrSDQFlQfki4N8h5", "sha256"):final(token)

  local token_verified = Cache_handler:get_value(token_hash)
  if token_verified then
    return true, nil
  end

  return false, token_hash
end


local function check_cache_and_get_key(plugin_conf, kid, use_cache)

  if use_cache then
    local cached_key = Cache_handler:get_value(kid)

    if cached_key ~= nil then
      return true, cached_key, use_cache
    end
  end

  local success, key = HTTP_caller:get_public_key(plugin_conf.login_id_public_key_url, kid)

  if success then
    Cache_handler:set_value(kid, key, 1800)
  end

  return success, key, false
end


local function verify_signature(header, plugin_conf, headerb64, bodyb64, signature, use_cache)
  local success, results, use_cached = check_cache_and_get_key(plugin_conf, header.kid, use_cache)

  if not success then
    return false, { status = 401, message = results }
  end

  local key = results

  if not alg_verify[header.alg](headerb64 .. "." .. bodyb64, signature, key) then

    if use_cached then
      return verify_signature(header, plugin_conf, headerb64, bodyb64, signature, false)
    end

    return false, { status = 401, message = "Invalid signature" }
  end

  return true, nil
end


local function verify_token_content(header, body, plugin_conf)

	if not header.typ or header.typ ~= "JWT" then
		return false, { status = 401, message = "Invalid typ" }
	end

	if not header.alg or header.alg ~= plugin_conf.algorithm or type(header.alg) ~= "string" then
		return false, { status = 401, message = "Invalid alg" }
	end

	if not alg_verify[header.alg] then
		return false, { status = 401, message = "Algorithm not supported" }
	end

	if plugin_conf.namespace_id and (body.nid == nil or body.nid ~= plugin_conf.namespace_id) then
		return false, { status = 401, message = "Invalid namespace id" }
	end

	if body.aud == nil or body.aud ~= plugin_conf.audience then
		return false, { status = 401, message = "Invalid audience" }
	end

	if plugin_conf.acr and (body.acr == nil or body.acr ~= plugin_conf.acr) then
		return false, { status = 401, message = "Invalid acr" }
	end

	if body.iss == nil or body.iss ~= plugin_conf.issuer then
		return false, { status = 401, message = "Invalid issuer" }
	end

	if body.iat == nil or plugin_conf.maximum_age < os.time() - body.iat then
		return false, { status = 401, message = "Token expired" }
	end

	if header.kid == nil then
		return false, { status = 401, message = "kid not provided" }
	end

  return true, nil
end


function M:decode_and_validate(data, plugin_conf)

	if type(data) ~= 'string' then return false, { status = 401, message = "Argument #1 must be string" } end

	local token = tokenize(data, '.', 3)

	if #token ~= 3 then
		return false, { status = 401, message = "Invalid token" }
	end

	local headerb64, bodyb64, sigb64 = token[1], token[2], token[3]

	local ok, header, body, sig = pcall(function ()

		return	cjson.decode(b64_decode(headerb64)),
			cjson.decode(b64_decode(bodyb64)),
			b64_decode(sigb64)
	end)

	if not ok then
		return false, { status = 401, message = "Invalid json" }
	end

  local verified_content, err = verify_token_content(header, body, plugin_conf)

  if not verified_content then
    return false, err
  end

  local already_verified, token_hash = compare_cached_token(data)

  if already_verified then
    return true, nil
  end

  local signature_verified, sig_err = verify_signature(header, plugin_conf, headerb64, bodyb64, sig, true)

  if not signature_verified then
    return false, sig_err
  end

  Cache_handler:set_value(token_hash, true, plugin_conf.maximum_age)

  return true, nil
end

return M