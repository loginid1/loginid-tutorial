/**
 * LoginID-Demo
 * <p>
 * This code is meant for educational purposes. It is provided as-is and is not expected to be used in production systems.
 * - Use this code at your own risk!
 * - Use this code to get a better understanding for FIDO2 enabled authentication and authorization flows.
 * <p>
 * For more information, please visit http://loginid.io.
 * <p>
 * LoginID, January 2022
 */
package io.loginid.web;

import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.loginid.mgmt.LoginIDUtil;
import io.loginid.sdk.java.invokers.ApiException;
import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.HttpClientBuilder;
import org.apache.http.util.EntityUtils;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.jose4j.jwa.AlgorithmConstraints;
import org.jose4j.jwk.JsonWebKeySet;
import org.jose4j.jws.AlgorithmIdentifiers;
import org.jose4j.jwt.JwtClaims;
import org.jose4j.jwt.consumer.JwtConsumer;
import org.jose4j.jwt.consumer.JwtConsumerBuilder;
import org.jose4j.keys.resolvers.JwksVerificationKeyResolver;
import org.jose4j.keys.resolvers.VerificationKeyResolver;

import java.io.BufferedReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.security.KeyFactory;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.logging.Logger;

public class UserMgmt extends HttpServlet {

    private final Logger LOGGER = Logger.getLogger(String.valueOf(UserMgmt.class));

    private LoginIDUtil util;
    private JsonObject oidcConfig;
    private String oidcClientId;
    private String webClientId;

    @Override
    public void init() throws ServletException {
        super.init();
        util = new LoginIDUtil();
        webClientId = System.getenv("WEBCLIENTID");
        oidcClientId = System.getenv("OIDC_PUBLIC_CLIENT_ID");
        if (oidcClientId != null) {
            String oidcConfigEndpoint = System.getenv("OIDC_CONFIG_ENDPOINT");
            if (oidcConfigEndpoint != null) {
                try {
                    oidcConfig = get(oidcConfigEndpoint);
                } catch (Exception e) {
                    LOGGER.warning(String.format("The OpenID configuration could not be retrieved: %s", e.getMessage()));
                }
            } else {
                LOGGER.info("The OpenID configuration endpoint is no configured");
            }
        } else {
            LOGGER.info("The OpenID clientId is no configured");
        }

    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {

        // To keep it simple, handle unauthenticated requests first, only to avoid multiple servlets

        try {
            if (request.getServletPath().endsWith("/users/reqauthenticator")) {
                String username = request.getParameter("username");
                response.setContentType("application/json");
                response.setStatus(200);
                response.getWriter().printf(util.requestAuthCodeAuthenticator(username, LoginIDUtil.CODE_TYPE.CREDENTIAL));
                return;
            } else if (request.getServletPath().endsWith("/users/reqtemporary")) {
                String username = request.getParameter("username");
                response.setContentType("application/json");
                response.setStatus(200);
                response.getWriter().printf(util.requestAuthCodeAuthenticator(username, LoginIDUtil.CODE_TYPE.TEMPORARY));
                return;
            } else if (request.getServletPath().endsWith("/users/waittemporary")) {
                String username = request.getParameter("username");
                String code = request.getParameter("code");
                response.setContentType("application/json");
                response.setStatus(200);
                response.getWriter().printf(util.waitForAuthorizeAuthCode(username, code));
                return;
            }
        } catch (Exception e) {
            LOGGER.warning(e.getMessage());
            response.setContentType("application/json");
            response.setStatus(400);
            response.getWriter().printf("{\"error\":\"invalid_request\", \"error_description\":\"%s\"}", e.getMessage());
            return;
        }

        // as of here require an authenticated user (JWT)

        Map<String, String> jws = null;
        String udata = null;

        try {
            jws = requireJwt(request.getHeader("authorization"));
        } catch (Exception e) {
            LOGGER.warning(e.getMessage());
            response.setContentType("application/json");
            response.setStatus(401);
            return;
        }

        try {
            udata = jws.get("user");
            String txClientId = jws.get("aud");
            if (request.getServletPath().endsWith("/users/grantauthenticator")) {
                String code = request.getParameter("code");
                response.setContentType("application/json");
                response.setStatus(200);
                response.getWriter().printf(util.authorizeAuthCode(udata, code, LoginIDUtil.CODE_TYPE.CREDENTIAL));
            } else if (request.getServletPath().endsWith("/users/granttempaccess")) {
                String code = request.getParameter("code");
                response.setContentType("application/json");
                response.setStatus(200);
                response.getWriter().printf(util.authorizeAuthCode(udata, code, LoginIDUtil.CODE_TYPE.TEMPORARY));
            } else if (request.getServletPath().endsWith("/users/credentials")) {
                String credentialId = request.getParameter("credentialId");
                String credentialName = request.getParameter("credentialName");
                response.setContentType("application/json");
                response.setStatus(200);
                response.getWriter().printf(util.updateCredentialName(udata, credentialId, credentialName).toString());
            } else if (request.getServletPath().endsWith("/users/trx")) {
                String payload = readMessageBody(request.getReader());
                response.setContentType("application/json");
                response.setStatus(200);
                response.getWriter().printf(util.getTransactionId(payload, txClientId));
            }
        } catch (Exception e) {
            LOGGER.warning(e.getMessage());
            response.setContentType("application/json");
            response.setStatus(400);
            response.getWriter().printf("{\"error\":\"invalid_request\", \"error_description\":\"%s\"}", e.getMessage());
        }
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {

        Map<String, String> jws = null;
        String udata = null;

        try {
            jws = requireJwt(request.getHeader("authorization"));
        } catch (Exception e) {
            LOGGER.warning(e.getMessage());
            response.setContentType("application/json");
            response.setStatus(401);
            return;
        }
        try {
            udata = jws.get("user");
            if (request.getServletPath().endsWith("/users/session")) {
                response.setContentType("application/json");
                response.setStatus(200);
                response.getWriter().printf("{\"user\":\"%s\"}", udata);
            } else if (request.getServletPath().endsWith("/users/credentials")) {
                response.setContentType("application/json");
                response.setStatus(200);
                response.getWriter().printf(util.getCredentials(udata).toString());
            } else {
                response.setContentType("application/json");
                response.setStatus(400);
                response.getWriter().println("{\"error\":\"invalid_request\", \"error_description\": \"you are looking for something that does not exist\"}");
            }
        } catch (Exception e) {
            LOGGER.warning(e.getMessage());
            response.setContentType("application/json");
            response.setStatus(400);
            response.getWriter().printf("{\"error\":\"invalid_request\", \"error_description\":\"%s\"}", e.getMessage());
        }
    }

    @Override
    protected void doDelete(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {

        Map<String, String> jws = null;
        String udata = null;

        try {
            jws = requireJwt(request.getHeader("authorization"));
        } catch (Exception e) {
            LOGGER.warning(e.getMessage());
            response.setContentType("application/json");
            response.setStatus(401);
            return;
        }
        try {
            udata = jws.get("user");
            if (request.getServletPath().endsWith("/users/credentials")) {
                String credentialId = request.getParameter("credentialId");
                response.setContentType("application/json");
                response.setStatus(200);
                response.getWriter().printf(util.deleteCredential(udata, credentialId).toString());
            } else {
                response.setContentType("application/json");
                response.setStatus(400);
                response.getWriter().println("{\"error\":\"invalid_request\", \"error_description\": \"you are looking for something that does not exist\"}");
            }
        } catch (Exception e) {
            LOGGER.warning(e.getMessage());
            String error = e.getMessage();
            if (e instanceof ApiException) {
                error = ((ApiException) e).getResponseBody();
            }
            response.setContentType("application/json");
            response.setStatus(400);
            JsonObject jo = new JsonObject();
            jo.addProperty("error", "invalid_request");
            jo.addProperty("error_description", error);
            response.getWriter().printf(jo.toString());
        }
    }

    /**
     * The request will either contain a jwt, issued via the native API interface, or via an OpenID Connect flow.
     *
     * @param authJwt
     * @return
     * @throws Exception
     */
    private Map<String, String> requireJwt(String authJwt) throws Exception {
        if (authJwt != null) {

            try {

                // Throughout this tutorial we only care about 'udata' and 'aud' where 'udata' is the username as specified in the natively issued JWT
                // Therefore, we will just return a map that only includes those two values
                Map<String, String> result = new HashMap<>();

                authJwt = authJwt.split("[ ]")[1].trim(); // this may end up in an error ... exception

                JsonElement jwtHeader = new JsonParser().parse(new String(Base64.getDecoder().decode(authJwt.split("[.]")[0])));
                JsonElement jwtPayload = new JsonParser().parse(new String(Base64.getDecoder().decode(authJwt.split("[.]")[1])));

                // check if the issuer is 'loginid.io'. In that case the JWT was issued via the native interface
                if("loginid.io".equals(jwtPayload.getAsJsonObject().get("iss").getAsString())) {
                    Claims claims = Jwts.parserBuilder()
                            .setSigningKey(
                                    lookupVerificationKey(
                                            jwtHeader.getAsJsonObject().get("kid").getAsString()))
                            .requireIssuer("loginid.io").requireAudience(webClientId)
                            .build()
                            .parseClaimsJws(authJwt).getBody();
                    result.put("user", (String)claims.get("udata"));
                    result.put("aud", claims.getAudience());
                } else {
                    JsonObject jwks = get(oidcConfig.get("jwks_uri").getAsString());
                    VerificationKeyResolver resolver = new JwksVerificationKeyResolver(new JsonWebKeySet(jwks.getAsString()).getJsonWebKeys());
                    JwtConsumer jwtConsumer = new JwtConsumerBuilder()
                            .setRequireExpirationTime()
                            .setAllowedClockSkewInSeconds(0)
                            .setRequireSubject()
                            .setExpectedAudience(oidcClientId)
                            .setExpectedIssuer(oidcConfig.get("iss").getAsString())
                            .setVerificationKeyResolver(resolver)
                            .setJwsAlgorithmConstraints(
                                    AlgorithmConstraints.ConstraintType.PERMIT,
                                    AlgorithmIdentifiers.ECDSA_USING_P256_CURVE_AND_SHA256
                            )
                            .build();
                    JwtClaims claims = jwtConsumer.processToClaims(authJwt);
                    result.put("user", claims.getStringClaimValue("sub"));
                    result.put("aud", claims.getAudience().get(0));
                }
                return result;
            } catch (Exception e) {
                throw e;
            }
        } else {
            throw new IllegalArgumentException("Missing or invalid authorization header");
        }
    }

    private Key lookupVerificationKey(String keyId) throws Exception {

        HttpGet req = new HttpGet(String.format("%s/certs?kid=%s", util.getBaseUrl(), keyId));
        HttpClient httpClient = HttpClientBuilder.create().build();
        HttpResponse response = httpClient.execute(req);

        String publicKeyContent = EntityUtils.toString(response.getEntity());

        publicKeyContent = publicKeyContent.replaceAll("\\n", "");
        publicKeyContent = publicKeyContent.replaceAll("-----BEGIN PUBLIC KEY-----", "");
        publicKeyContent = publicKeyContent.replaceAll("-----END PUBLIC KEY-----", "");

        KeyFactory keyFactory = KeyFactory.getInstance("EC");

        X509EncodedKeySpec keySpecX509 = new X509EncodedKeySpec(Base64.getDecoder().decode(publicKeyContent));
        return keyFactory.generatePublic(keySpecX509);

    }

    private JsonObject get(String url) throws IOException {
        HttpGet req = new HttpGet(url);
        HttpClient httpClient = HttpClientBuilder.create().build();
        HttpResponse response = httpClient.execute(req);
        Gson gson = new Gson();
        return (JsonObject) gson.toJsonTree(EntityUtils.toString(response.getEntity()));
    }

    private String readMessageBody(BufferedReader reader) throws IOException {
        StringBuilder sb = new StringBuilder();
        String nextLine = "";
        while ((nextLine = reader.readLine()) != null) {
            sb.append(nextLine);
        }
        return sb.toString().trim();
    }

    /**
     * Not used in the demo, just here as an example
     *
     * @param txHash
     * @param payload
     * @param nonce
     * @param serverNonce
     * @return
     */
    private boolean verifyTxHash(String txHash, String payload, String nonce, String serverNonce) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] encodedhash = digest.digest((payload + nonce + serverNonce).getBytes(StandardCharsets.UTF_8));
            return txHash.equals(new String(Base64.getUrlEncoder().encode(encodedhash)).replace("=", ""));
        } catch (NoSuchAlgorithmException e) {
            // this should never ever happen!
            LOGGER.warning(e.getMessage());
        }
        return false;
    }

}