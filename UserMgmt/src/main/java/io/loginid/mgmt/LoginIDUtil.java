/**
 * LoginID-Tutorial
 * <p>
 * This code is meant for educational purposes. It is provided as-is and is not expected to be used in production systems.
 * - Use this code at your own risk!
 * - Use this code to get a better understanding for FIDO2 enabled authentication and authorization flows.
 * <p>
 * For more information, please visit http://loginid.io.
 * <p>
 * LoginID, February 2022
 */
package io.loginid.mgmt;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.loginid.mgmt.model.CredentialForUI;
import io.loginid.sdk.java.LoginIdManagement;
import io.loginid.sdk.java.api.AuthenticateApi;
import io.loginid.sdk.java.api.TransactionsApi;
import io.loginid.sdk.java.invokers.ApiClient;
import io.loginid.sdk.java.model.*;
import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.HttpClientBuilder;
import org.apache.http.util.EntityUtils;
import org.jose4j.jwa.AlgorithmConstraints;
import org.jose4j.jwk.JsonWebKeySet;
import org.jose4j.jws.AlgorithmIdentifiers;
import org.jose4j.jwt.JwtClaims;
import org.jose4j.jwt.consumer.JwtConsumer;
import org.jose4j.jwt.consumer.JwtConsumerBuilder;
import org.jose4j.keys.resolvers.JwksVerificationKeyResolver;
import org.jose4j.keys.resolvers.VerificationKeyResolver;

import java.io.IOException;
import java.security.Key;
import java.security.KeyFactory;
import java.security.spec.X509EncodedKeySpec;
import java.util.*;
import java.util.logging.Logger;

/**
 * A class using LoginIDs java SDK for several tasks.
 */
public class LoginIDUtil {

    private final Logger LOGGER = Logger.getLogger(String.valueOf(LoginIDUtil.class));

    public enum CODE_TYPE {

        CREDENTIAL("add_credential"),
        TEMPORARY("temporary_authentication");

        private String value;

        CODE_TYPE(String value) {
            this.value = value;
        }


        @Override
        public String toString() {
            return value;
        }
    }

    private LoginIdManagement mgmt;
    private Properties props;
    private JsonObject oidcConfig;
    private String oidcClientId;

    public LoginIDUtil() {
        try {
            props = new Properties();

            props.put("CLIENT_ID_BACKEND", System.getenv("BACKENDCLIENTID"));
            props.put("API_PRIVATE_KEY", System.getenv("APIPRIVATEKEY").replaceAll("[\\\\]n", ""));
            props.put("BASE_URL", System.getenv("BASEURL"));
            props.put("CLIENT_ID_WEB", System.getenv("WEBCLIENTID"));

            mgmt = new LoginIdManagement(
                    props.getProperty("CLIENT_ID_BACKEND"),
                    props.getProperty("API_PRIVATE_KEY"),
                    props.getProperty("BASE_URL")
            );

            oidcClientId = System.getenv("OIDC_PUBLIC_CLIENT_ID");
            if (oidcClientId != null) {
                String oidcConfigEndpoint = System.getenv("OIDC_CONFIG_ENDPOINT");
                if (oidcConfigEndpoint != null) {
                    try {
                        oidcConfig = get(oidcConfigEndpoint);
                    } catch (Exception e) {
                        LOGGER.severe(String.format("The OpenID configuration could not be retrieved: %s", e.getMessage()));
                    }
                } else {
                    LOGGER.info("The OpenID configuration endpoint is no configured");
                }
            } else {
                LOGGER.info("The OpenID clientId is no configured");
            }

        } catch (Exception e) {
            LOGGER.severe(e.getMessage());
            LOGGER.severe("None or missing environment variables found. Please configure expected environment variables!");
        }
    }

    public String getBaseUrl() {
        return props.getProperty("BASE_URL");
    }

    public String getWebClientId() {
        return props.getProperty("CLIENT_ID_WEB");
    }

    /**
     * Credentials refer to FIDO2 credentials that are used
     * @param authorizationHeader The header that contains the JWT credential
     * @return
     * @throws Exception
     */
    public List<CredentialForUI> getCredentials(String authorizationHeader) throws Exception {
        String username = getUsername(authorizationHeader);
        if (checkParam(username)) {
            UUID userId = mgmt.getUserId(username);
            CredentialsResponse credentials = mgmt.getCredentials(userId.toString());
            List<CredentialForUI> creds = new ArrayList<>();
            for (CredentialFull cred : credentials.getCredentials()) {
                CredentialForUI c4ui = new CredentialForUI();
                c4ui.setId(cred.getUuid().toString());
                c4ui.setType(cred.getType());
                c4ui.setStatus(cred.getStatus() == null ? "" : cred.getStatus().getValue());
                c4ui.setName(cred.getName());
                creds.add(c4ui);
            }
            return creds;
        } else {
            throw new IllegalArgumentException("Missing or invalid username");
        }

    }

    public CredentialForUI updateCredentialName(String authorizationHeader, String credentialId, String newCredentialName) throws Exception {
        String username = getUsername(authorizationHeader);
        if (checkParam(username) && checkParam(credentialId) && checkParam(newCredentialName)) {
            UUID userId = mgmt.getUserId(username);
            CredentialsChangeResponse cred = mgmt.renameCredential(userId.toString(), credentialId, newCredentialName);
            CredentialForUI c4ui = new CredentialForUI();
            c4ui.setId(cred.getCredential().getUuid().toString());
            c4ui.setType(cred.getCredential().getType());
            c4ui.setStatus(cred.getCredential().getStatus().getValue());
            c4ui.setName(cred.getCredential().getName());
            return c4ui;
        } else {
            throw new IllegalArgumentException("One of these is missing or invalid: username, credential ID, credential name");
        }
    }

    public CredentialForUI deleteCredential(String authorizationHeader, String credentialId) throws Exception {
        String username = getUsername(authorizationHeader);
        if (checkParam(username) && checkParam(credentialId)) {
            UUID userId = mgmt.getUserId(username);
            CredentialsChangeResponse cred = mgmt.revokeCredential(userId.toString(), credentialId);
            CredentialForUI c4ui = new CredentialForUI();
            c4ui.setId(cred.getCredential().getUuid().toString());
            c4ui.setType(cred.getCredential().getType());
            c4ui.setStatus(cred.getCredential().getStatus().getValue());
            c4ui.setName(cred.getCredential().getName());
            return c4ui;
        } else {
            throw new IllegalArgumentException("One of these is missing or invalid: username, credential ID");
        }
    }

    public String requestAuthCodeAuthenticator(String username, LoginIDUtil.CODE_TYPE type) throws Exception {
        if (checkParam(username)) {
            UUID userId = mgmt.getUserId(username);
            CodesCodeTypeGenerateResponse generateResponse = mgmt.generateCode(userId.toString(), "short", type.toString(), false);
            String code = generateResponse.getCode();
            return String.format("{\"code\":\"%s\", \"username\":\"%s\"}", code, username);
        } else {
            throw new IllegalArgumentException("Missing or invalid username");
        }
    }

    public String authorizeAuthCode(String authorizationHeader, String code, LoginIDUtil.CODE_TYPE type) throws Exception {
        String username = getUsername(authorizationHeader);
        if (checkParam(username) && checkParam(code)) {
            UUID userId = mgmt.getUserId(username);
            CodesCodeTypeAuthorizeResponse authorizeResponse = mgmt.authorizeCode(userId.toString(), code, "short", type.toString());
            boolean granted = authorizeResponse.isIsAuthorized();
            return String.format("{\"status\":\"%s\"}", granted ? "authorized" : "failed");
        } else {
            throw new IllegalArgumentException("Missing or invalid username or authorization code");
        }
    }

    public String waitForAuthorizeAuthCode(String username, String code) throws Exception {
        if (checkParam(username) && checkParam(code)) {
            String jwt = "";
            AuthenticateApi authenticateApi = new AuthenticateApi();
            ApiClient apiClient = authenticateApi.getApiClient();
            apiClient.setReadTimeout(30000);
            apiClient.setBasePath(getBaseUrl());
            AuthenticateCodeWaitBody authenticateCodeWaitBody = new AuthenticateCodeWaitBody();
            authenticateCodeWaitBody.setClientId(getWebClientId());
            authenticateCodeWaitBody.setUsername(username);
            AuthenticatecodewaitAuthenticationCode authenticatecodewaitAuthenticationCode = new AuthenticatecodewaitAuthenticationCode();
            authenticatecodewaitAuthenticationCode.setCode(code);
            authenticatecodewaitAuthenticationCode.setType(AuthenticatecodewaitAuthenticationCode.TypeEnum.fromValue("short"));
            authenticateCodeWaitBody.setAuthenticationCode(authenticatecodewaitAuthenticationCode);
            AuthenticationResponse authenticationResponse = authenticateApi.authenticateCodeWaitPost(authenticateCodeWaitBody, (UUID) null);
            boolean granted = authenticationResponse.isIsAuthenticated();
            if (granted) {
                jwt = authenticationResponse.getJwt();
            }
            return String.format("{\"status\":\"%s\", \"jwt\":\"%s\"}", granted ? "authorized" : "failed", jwt);
        } else {
            throw new IllegalArgumentException("Missing or invalid username or authorization code");
        }
    }

    public String getTransactionId(String payload, String authorizationHeader) throws Exception {
        String txClientId = getClaim(authorizationHeader, "aud");
        if (checkParam(payload, 1024) && checkParam(txClientId)) {
            TransactionsApi transactionsApi = new TransactionsApi();

            ApiClient apiClient = transactionsApi.getApiClient();
            apiClient.setBasePath(mgmt.getBaseUrl());

            TxBody txBody = new TxBody();
            txBody.setClientId(txClientId);
            txBody.setTxType("text");
            txBody.setTxPayload(payload);
            String nonce = UUID.randomUUID().toString();
            txBody.setNonce(nonce);

            TxResponse result = transactionsApi.txPost(txBody);
            return String.format("{\"transactionId\":\"%s\", \"nonce\":\"%s\"}", result.getTxId(), nonce);
        } else {
            throw new IllegalArgumentException("Missing or invalid payload or client ID");
        }
    }

    public String getUsername(String authorizationHeader) throws Exception {
        return getClaim(authorizationHeader, "user");
    }

    public String getClaim(String authorizationHeader, String claimName) throws Exception {
        Map<String, String> claims = requireJwt(authorizationHeader);
        return claims.get(claimName);
    }

    private boolean checkParam(String param) {
        return checkParam(param, 256);
    }

    private boolean checkParam(String param, int maxLength) {
        return param != null && (param.trim().length() > 0) && (param.trim().length() <= maxLength);
    }

    /**
     * The request will either contain a jwt, issued via the native LoginID API interface, or via a LoginID OpenID Connect flow.
     *
     * @param authJwt The issued JWT based credential
     * @return A map of claims
     * @throws Exception Whenever something goes wrong with validating the JWT
     */
    private Map<String, String> requireJwt(String authJwt) throws Exception {
        if (authJwt != null) {

            try {

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
                            .requireIssuer("loginid.io").requireAudience(getWebClientId())
                            .build()
                            .parseClaimsJws(authJwt).getBody();
                    result.put("user", (String)claims.get("udata"));
                    result.put("aud", claims.getAudience());
                } else {
                    // handle the id_token issued via the OpenID Connect flow
                    // NOTE: although it is handled here, the id_token is currently not a valid credential for accessing LoginID management APIs
                    JsonObject jwks = get(oidcConfig.get("jwks_uri").getAsString());
                    VerificationKeyResolver resolver = new JwksVerificationKeyResolver(new JsonWebKeySet(jwks.getAsJsonObject().toString()).getJsonWebKeys());
                    JwtConsumer jwtConsumer = new JwtConsumerBuilder()
                            .setRequireExpirationTime()
                            .setAllowedClockSkewInSeconds(0)
                            .setRequireSubject()
                            .setExpectedAudience(oidcClientId)
                            .setExpectedIssuer(oidcConfig.get("issuer").getAsString())
                            .setVerificationKeyResolver(resolver)
                            .setJwsAlgorithmConstraints(
                                    AlgorithmConstraints.ConstraintType.PERMIT,
                                    AlgorithmIdentifiers.ECDSA_USING_P256_CURVE_AND_SHA256
                            )
                            .build();
                    JwtClaims claims = jwtConsumer.processToClaims(authJwt);
                    String email = claims.getStringClaimValue("email");
                    result.put("user", email == null ? claims.getStringClaimValue("sub") : email);
                    result.put("aud", claims.getAudience().get(0));
                }
                return result;
            } catch (Exception e) {
                LOGGER.warning(e.getMessage());
                throw e;
            }
        } else {
            throw new IllegalArgumentException("Missing or invalid authorization header");
        }
    }

    /**
     * Retrieves the public key needed to validate the native JWT
     * @param keyId The keyId of the key that is needed for the signature validation
     * @return The public key
     * @throws Exception Whenever something goes wrong with the retrieving of the key
     */
    private Key lookupVerificationKey(String keyId) throws Exception {

        HttpGet req = new HttpGet(String.format("%s/certs?kid=%s", getBaseUrl(), keyId));
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

    /**
     * A simple helper to GET content (openid configuration, JWKS)
     * @param url
     * @return
     * @throws IOException
     */
    private JsonObject get(String url) throws IOException {
        HttpGet req = new HttpGet(url);
        HttpClient httpClient = HttpClientBuilder.create().build();
        HttpResponse response = httpClient.execute(req);
        return new JsonParser().parse(EntityUtils.toString(response.getEntity())).getAsJsonObject();
    }
}