package io.loginid;

import io.loginid.mgmt.LoginIDUtil;
import io.loginid.mgmt.model.CredentialForUI;

import java.util.List;

public class Main {

    public static void main(String[] args) {

        try {
            LoginIDUtil loginIDUtil = new LoginIDUtil();
            List<CredentialForUI> ja = loginIDUtil.getCredentials("sascha@example.com");
            System.out.println(ja);
            System.out.println(loginIDUtil.updateCredentialName("sascha@example.com", ja.get(0).getId(), "New Cred Name"));
        } catch (Exception e) {
            e.printStackTrace();
        }

    }
}