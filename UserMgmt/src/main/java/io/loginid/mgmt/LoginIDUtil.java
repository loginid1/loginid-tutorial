package io.loginid.mgmt;

import io.loginid.mgmt.model.CredentialForUI;
import io.loginid.sdk.java.LoginIdManagement;
import io.loginid.sdk.java.model.CredentialFull;
import io.loginid.sdk.java.model.CredentialsChangeResponse;
import io.loginid.sdk.java.model.CredentialsResponse;

import java.io.FileReader;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;
import java.util.UUID;

public class LoginIDUtil {

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

    public List<CredentialForUI> getCredentials(String username) throws Exception {
        UUID userId = mgmt.getUserId(username);
        CredentialsResponse credentials = mgmt.getCredentials(userId.toString());
        List<CredentialForUI> creds = new ArrayList<>();
        for (CredentialFull cred : credentials.getCredentials()) {
            CredentialForUI c4ui = new CredentialForUI();
            c4ui.setId(cred.getUuid().toString());
            c4ui.setType(cred.getType());
            c4ui.setStatus(cred.getStatus().getValue());
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

    public String requestAuthCodeAuthenticator(String username) throws Exception {
        UUID userId = mgmt.getUserId(username);
        String code = mgmt.generateCode(userId.toString(), "short", "add_credential", true).getCode();
        return String.format("{\"code\":\"%s\"}", code);
    }

    public String authorizeAuthCodeAuthenticator(String username, String code) throws Exception {
        UUID userId = mgmt.getUserId(username);
        boolean granted = mgmt.authorizeCode(userId.toString(), code, "short", "add_credential").isIsAuthorized();
        return String.format("{\"status\":\"%s\"}", granted ? "authorized" : "failed");
    }
}
