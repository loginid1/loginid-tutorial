package io.loginid.web;

import com.google.gson.JsonElement;
import com.google.gson.JsonParser;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.loginid.mgmt.LoginIDUtil;
import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.HttpClientBuilder;
import org.apache.http.util.EntityUtils;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.security.Key;
import java.security.KeyFactory;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

public class UserMgmt extends HttpServlet {

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {

        // To keep it simple, handle unauthenticated requests first simply to avoid multiple servlets

        try {
            if (request.getServletPath().endsWith("/users/reqauthenticator")) {
                String username = request.getParameter("username");
                response.setContentType("application/json");
                response.setStatus(200);
                response.getWriter().printf(new LoginIDUtil().requestAuthCodeAuthenticator(username));
                return;
            }
        } catch (Exception e) {
            e.printStackTrace();
            response.setContentType("application/json");
            response.setStatus(400);
            response.getWriter().printf("{\"error\":\"invalid_request\", \"error_description\":\"%s\"}", e.getMessage());
            return;
        }

        // as of here require an authenticated user (JWT)

        Jws<Claims> jws = null;
        String udata = null;

        try {
            jws = requireJwt(request);
        } catch (Exception e) {
            response.setContentType("application/json");
            response.setStatus(401);
            return;
        }

        try {
            udata = (String) jws.getBody().get("udata");
            if (request.getServletPath().endsWith("/users/grantauthenticator")) {
                String code = request.getParameter("code");
                response.setContentType("application/json");
                response.setStatus(200);
                response.getWriter().printf(new LoginIDUtil().authorizeAuthCodeAuthenticator(udata, code));
            }
        } catch (Exception e) {
            e.printStackTrace();
            response.setContentType("application/json");
            response.setStatus(400);
            response.getWriter().printf("{\"error\":\"invalid_request\", \"error_description\":\"%s\"}", e.getMessage());
        }
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {

        Jws<Claims> jws = null;
        String udata = null;

        try {
            jws = requireJwt(request);
        } catch (Exception e) {
            response.setContentType("application/json");
            response.setStatus(401);
            return;
        }
        try {
            udata = (String) jws.getBody().get("udata");
            if (request.getServletPath().endsWith("/users/session")) {
                response.setContentType("application/json");
                response.setStatus(200);
                response.getWriter().printf("{\"user\":\"%s\"}", udata);
            } else if (request.getServletPath().endsWith("/users/credentials")) {
                response.setContentType("application/json");
                response.setStatus(200);
                response.getWriter().printf(new LoginIDUtil().getCredentials(udata).toString());
            } else {
                response.setContentType("application/json");
                response.setStatus(400);
                response.getWriter().println("{\"error\":\"invalid_request\", \"error_description\": \"you are looking for something that does not exist\"}");
            }
        } catch (Exception e) {
            e.printStackTrace();
            response.setContentType("application/json");
            response.setStatus(400);
            response.getWriter().printf("{\"error\":\"invalid_request\", \"error_description\":\"%s\"}", e.getMessage());
        }
    }

    private Jws<Claims> requireJwt(HttpServletRequest request) throws Exception {
        String authJwt = request.getHeader("authorization");
        if (authJwt != null) {
            try {
                authJwt = authJwt.split("[ ]")[1].trim(); // this may end up in an error ... exception
                JsonElement jwtHeader = new JsonParser().parse(new String(Base64.getDecoder().decode(authJwt.split("[.]")[0])));
                return Jwts.parserBuilder()
                        .setSigningKey(
                                lookupVerificationKey(
                                        jwtHeader.getAsJsonObject().get("kid").getAsString()))
                        .requireIssuer("loginid.io")
                        .build()
                        .parseClaimsJws(authJwt);
            } catch (Exception e) {
                e.printStackTrace();
                throw e;
            }
        } else {
            throw new IllegalArgumentException("Missing or invalid authorization header");
        }
    }

    private Key lookupVerificationKey(String keyId) throws Exception {

        HttpGet req = new HttpGet(String.format("%s/certs?kid=%s", System.getenv("BASE_URL"), keyId));
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
}