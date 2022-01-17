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
package io.loginid.mgmt;

import io.loginid.mgmt.model.CredentialForUI;
import io.loginid.sdk.java.LoginIdManagement;
import io.loginid.sdk.java.api.AuthenticateApi;
import io.loginid.sdk.java.api.TransactionsApi;
import io.loginid.sdk.java.invokers.ApiClient;
import io.loginid.sdk.java.model.*;

import java.io.FileReader;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;
import java.util.UUID;

public class LoginIDUtil {

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

    private String webClientId;
    private LoginIdManagement mgmt;
    private Properties props;

    public LoginIDUtil() {
        try {
            props = new Properties();
            props.load(new FileReader("/opt/docker/loginid/config"));

            mgmt = new LoginIdManagement(
                    props.getProperty("CLIENT_ID_BACKEND"),
                    props.getProperty("API_PRIVATE_KEY"),
                    props.getProperty("BASE_URL")
            );

            webClientId = props.getProperty("CLIENT_ID_WEB");

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public String getBaseUrl() {
        return props.getProperty("BASE_URL");
    }

    public String getWebClientId() {
        return props.getProperty("CLIENT_ID_WEB");
    }

    public List<CredentialForUI> getCredentials(String username) throws Exception {
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

    public CredentialForUI updateCredentialName(String username, String credentialId, String newCredentialName) throws Exception {
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

    public CredentialForUI deleteCredential(String username, String credentialId) throws Exception {
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
        if(checkParam(username)) {
            UUID userId = mgmt.getUserId(username);
            CodesCodeTypeGenerateResponse generateResponse = mgmt.generateCode(userId.toString(), "short", type.toString(), false);
            String code = generateResponse.getCode();
            return String.format("{\"code\":\"%s\", \"username\":\"%s\"}", code, username);
        } else {
            throw new IllegalArgumentException("Missing or invalid username");
        }
    }

    public String authorizeAuthCode(String username, String code, LoginIDUtil.CODE_TYPE type) throws Exception {
        if(checkParam(username) && checkParam(code)) {
            UUID userId = mgmt.getUserId(username);
            CodesCodeTypeAuthorizeResponse authorizeResponse = mgmt.authorizeCode(userId.toString(), code, "short", type.toString());
            boolean granted = authorizeResponse.isIsAuthorized();
            return String.format("{\"status\":\"%s\"}", granted ? "authorized" : "failed");
        } else {
            throw new IllegalArgumentException("Missing or invalid username or authorization code");
        }
    }

    public String waitForAuthorizeAuthCode(String username, String code) throws Exception {
        if(checkParam(username) && checkParam(code)) {
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
            AuthenticationResponse authenticationResponse = authenticateApi.authenticateCodeWaitPost(authenticateCodeWaitBody, (UUID)null);
            boolean granted = authenticationResponse.isIsAuthenticated();
            if (granted) {
                jwt = authenticationResponse.getJwt();
            }
            return String.format("{\"status\":\"%s\", \"jwt\":\"%s\"}", granted ? "authorized" : "failed", jwt);
        } else {
            throw new IllegalArgumentException("Missing or invalid username or authorization code");
        }
    }

    public String getTransactionId(String payload, String txClientId) throws Exception {
        if(checkParam(payload, 1024) && checkParam(txClientId)) {
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
        }  else {
            throw new IllegalArgumentException("Missing or invalid payload or client ID");
        }
    }

    private boolean checkParam(String param) {
        return checkParam(param, 256);
    }

    private boolean checkParam(String param, int maxLength) {
        return param != null && (param.trim().length() > 0) && (param.trim().length() <= maxLength);
    }
}