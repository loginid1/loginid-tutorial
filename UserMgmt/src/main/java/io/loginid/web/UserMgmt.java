package io.loginid.web;

import com.google.gson.JsonElement;
import com.google.gson.JsonParser;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
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
        response.setContentType("application/json");
        String authJwt = request.getParameter("credential");
        if (authJwt != null) {
            try {
                JsonElement jwtHeader = new JsonParser().parse(new String(Base64.getDecoder().decode(authJwt.split("[.]")[0])));
                Jws<Claims> jws = Jwts.parserBuilder().setSigningKey(lookupVerificationKey(jwtHeader.getAsJsonObject().get("kid").getAsString())).build().parseClaimsJws(authJwt);

                // TODO: validate claims and do something useful with the given JWT claims!
                // if("logind.io".equalsIgnoreCase(jws.getBody().getIssuer()) && .... ) {
                    response.setStatus(200);
                    response.getWriter().printf("{\"username\":\"%s\"}", jws.getBody().get("udata"));
                // } else {
                //   return error ...
                // }

            } catch (Exception e) {
                e.printStackTrace();
                response.setStatus(400);
                response.getWriter().println("{\"error\":\"invalid_request\", \"error_description\":\"something went badly wrong ... !\"}");
            }
        } else {
            response.setStatus(400);
            response.getWriter().println("{\"error\":\"invalid_request\", \"error_description\":\"no credential (JWT) given\"}");
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