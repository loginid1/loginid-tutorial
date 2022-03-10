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
package io.loginid.web;

import com.google.gson.JsonObject;
import io.loginid.mgmt.LoginIDUtil;
import io.loginid.sdk.java.invokers.ApiException;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.BufferedReader;
import java.io.IOException;
import java.util.logging.Logger;

/**
 * A class simulating a backend that receives web requests and communicates with LoginID APIs
 */
public class UserMgmt extends HttpServlet {

    private final Logger LOGGER = Logger.getLogger(String.valueOf(UserMgmt.class));

    private LoginIDUtil util;

    @Override
    public void init() throws ServletException {
        super.init();
        util = new LoginIDUtil();
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
        try {
            if (request.getServletPath().endsWith("/users/grantauthenticator")) {
                String code = request.getParameter("code");
                response.setContentType("application/json");
                response.setStatus(200);
                response.getWriter().printf(util.authorizeAuthCode(request.getHeader("authorization"), code, LoginIDUtil.CODE_TYPE.CREDENTIAL));
            } else if (request.getServletPath().endsWith("/users/granttempaccess")) {
                String code = request.getParameter("code");
                response.setContentType("application/json");
                response.setStatus(200);
                response.getWriter().printf(util.authorizeAuthCode(request.getHeader("authorization"), code, LoginIDUtil.CODE_TYPE.TEMPORARY));
            } else if (request.getServletPath().endsWith("/users/credentials")) {
                String credentialId = request.getParameter("credentialId");
                String credentialName = request.getParameter("credentialName");
                response.setContentType("application/json");
                response.setStatus(200);
                response.getWriter().printf(util.updateCredentialName(request.getHeader("authorization"), credentialId, credentialName).toString());
            } else if (request.getServletPath().endsWith("/users/trx")) {
                String payload = readMessageBody(request.getReader());
                response.setContentType("application/json");
                response.setStatus(200);
                response.getWriter().printf(util.getTransactionId(payload, request.getHeader("authorization")));
            }
        } catch (AuthException e) {
            LOGGER.warning(e.getMessage());
            response.setContentType("application/json");
            response.setStatus(401);
            response.getWriter().printf("{\"error\":\"invalid_request\", \"error_description\":\"%s\"}", e.getMessage());
        } catch (Exception e) {
            LOGGER.warning(e.getMessage());
            response.setContentType("application/json");
            response.setStatus(400);
            response.getWriter().printf("{\"error\":\"invalid_request\", \"error_description\":\"%s\"}", e.getMessage());
        }
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        try {
            if (request.getServletPath().endsWith("/users/session")) {
                response.setContentType("application/json");
                response.setStatus(200);
                response.getWriter().printf("{\"user\":\"%s\"}", util.getUsername(request.getHeader("authorization")));
            } else if (request.getServletPath().endsWith("/users/credentials")) {
                response.setContentType("application/json");
                response.setStatus(200);
                response.getWriter().printf(util.getCredentials(request.getHeader("authorization")).toString());
            } else {
                response.setContentType("application/json");
                response.setStatus(400);
                response.getWriter().println("{\"error\":\"invalid_request\", \"error_description\": \"you are looking for something that does not exist\"}");
            }
        } catch (AuthException e) {
            LOGGER.warning(e.getMessage());
            response.setContentType("application/json");
            response.setStatus(401);
            response.getWriter().printf("{\"error\":\"invalid_request\", \"error_description\":\"%s\"}", e.getMessage());
        } catch (Exception e) {
            LOGGER.warning(e.getMessage());
            response.setContentType("application/json");
            response.setStatus(400);
            response.getWriter().printf("{\"error\":\"invalid_request\", \"error_description\":\"%s\"}", e.getMessage());
        }
    }

    @Override
    protected void doDelete(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        try {
            if (request.getServletPath().endsWith("/users/credentials")) {
                String credentialId = request.getParameter("credentialId");
                response.setContentType("application/json");
                response.setStatus(200);
                response.getWriter().printf(util.deleteCredential(request.getHeader("authorization"), credentialId).toString());
            } else {
                response.setContentType("application/json");
                response.setStatus(400);
                response.getWriter().println("{\"error\":\"invalid_request\", \"error_description\": \"you are looking for something that does not exist\"}");
            }
        } catch (AuthException e) {
            LOGGER.warning(e.getMessage());
            response.setContentType("application/json");
            response.setStatus(401);
            response.getWriter().printf("{\"error\":\"invalid_request\", \"error_description\":\"%s\"}", e.getMessage());
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
     * A simple helper to turn http bodies into a string
     * @param reader
     * @return
     * @throws IOException
     */
    private String readMessageBody(BufferedReader reader) throws IOException {
        StringBuilder sb = new StringBuilder();
        String nextLine = "";
        while ((nextLine = reader.readLine()) != null) {
            sb.append(nextLine);
        }
        return sb.toString().trim();
    }
}