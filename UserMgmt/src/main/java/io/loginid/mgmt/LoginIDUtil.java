package io.loginid.mgmt;

import io.loginid.mgmt.model.CredentialForUI;
import io.loginid.sdk.java.LoginIdManagement;
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

    private LoginIdManagement mgmt;
    private Properties props;

    public LoginIDUtil() {
        try {
            props = new Properties();
            props.load(new FileReader("/opt/docker/loginid/config"));

            mgmt = new LoginIdManagement(
                    props.getProperty("client_id_backend"),
                    props.getProperty("API_PRIVATE_KEY"),
                    props.getProperty("base_url")
            );
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public String getBaseUrl() {
        return props.getProperty("base_url");
    }

    public List<CredentialForUI> getCredentials(String username) throws Exception {
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
    }

    public CredentialForUI updateCredentialName(String username, String credentialId, String newCredentialName) throws Exception {
        UUID userId = mgmt.getUserId(username);
        CredentialsChangeResponse cred = mgmt.renameCredential(userId.toString(), credentialId, newCredentialName);
        CredentialForUI c4ui = new CredentialForUI();
        c4ui.setId(cred.getCredential().getUuid().toString());
        c4ui.setType(cred.getCredential().getType());
        c4ui.setStatus(cred.getCredential().getStatus().getValue());
        c4ui.setName(cred.getCredential().getName());
        return c4ui;
    }

    public CredentialForUI deleteCredential(String username, String credentialId) throws Exception {
        UUID userId = mgmt.getUserId(username);
        CredentialsChangeResponse cred = mgmt.revokeCredential(userId.toString(), credentialId);
        CredentialForUI c4ui = new CredentialForUI();
        c4ui.setId(cred.getCredential().getUuid().toString());
        c4ui.setType(cred.getCredential().getType());
        c4ui.setStatus(cred.getCredential().getStatus().getValue());
        c4ui.setName(cred.getCredential().getName());
        return c4ui;
    }

    public String requestAuthCodeAuthenticator(String username, LoginIDUtil.CODE_TYPE type) throws Exception {
        UUID userId = mgmt.getUserId(username);
        CodesCodeTypeGenerateResponse generateResponse = mgmt.generateCode(userId.toString(), "short", type.toString(), false);
        String code = generateResponse.getCode();
        return String.format("{\"code\":\"%s\", \"username\":\"%s\"}", code, username);
    }

    public String authorizeAuthCode(String username, String code, LoginIDUtil.CODE_TYPE type) throws Exception {
        UUID userId = mgmt.getUserId(username);
        CodesCodeTypeAuthorizeResponse authorizeResponse = mgmt.authorizeCode(userId.toString(), code, "short", type.toString());
        boolean granted = authorizeResponse.isIsAuthorized();
        return String.format("{\"status\":\"%s\"}", granted ? "authorized" : "failed");
    }

    public String waitForAuthorizeAuthCode(String username, String code) throws Exception {
        String jwt = "";
        AuthenticationResponse authenticationResponse = mgmt.waitCode(username, code, "short");
        boolean granted = authenticationResponse.isIsAuthenticated();
        if (granted) {
            jwt = authenticationResponse.getJwt();
        }
        return String.format("{\"status\":\"%s\", \"jwt\":\"%s\"}", granted ? "authorized" : "failed", jwt);
    }

    public String getTransactionId(String payload, String username, String txClientId) throws Exception {
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
    }
}