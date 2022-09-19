package io.loginid.tools;

import org.jose4j.json.internal.json_simple.JSONObject;
import org.jose4j.jws.AlgorithmIdentifiers;
import org.jose4j.jws.JsonWebSignature;

import java.io.File;
import java.nio.charset.Charset;
import java.nio.file.Files;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;

public class ClientSecretGenerator {

    public static void main(String[] args) {
        ClientSecretGenerator csg = new ClientSecretGenerator();
        System.out.println(csg.createSecret(args));
    }

    /**
     * Create a JWT used as client_secret
     *
     * @args [0]:iss, [1]:exp, [2]:sub, [3]:aud, [4]:absolute-path-to-key
     * return null if something went wrong, a JSON document otherwise
     */
    String createSecret(String[] args) {

        if (args.length != 5) {
            System.err.println("Usage: java -jar ClientSecretGenerator.jar iss exp sub aud path-to-private-key");
            System.err.println("iss: the client_id");
            System.err.println("exp: the number of days for which the secret should be valid for (1-60)");
            System.err.println("sub: the client_id");
            System.err.println("aud: the OpenID Connect base URL");
            System.err.println("path-to-private-key: absolute path to the private key that is used as API credential");
            return null;
        }

        int iat = Integer.parseInt(String.valueOf(new Date().getTime()).substring(0, 10));
        int exp = 0;
        try {
            exp = Integer.parseInt(args[1]);
            if (exp < 1 || exp > 60) {
                throw new IllegalArgumentException();
            }
            exp = iat + (exp * 86400);
        } catch (Exception e) {
            System.err.println("The exp value could not be parsed to an integer value or it is not between 1-60 (days)");
            return null;
        }

        JSONObject payload = new JSONObject();
        payload.put("iss", args[0]);
        payload.put("exp", exp);
        payload.put("sub", args[2]);
        payload.put("iat", iat);
        payload.put("jti", UUID.randomUUID().toString());
        payload.put("aud", args[3]);

        try {
            String clientSecret = generateJwt(args[4], payload);
            JSONObject output = new JSONObject();
            output.put("payload", payload);
            output.put("client_secret", clientSecret);
            return output.toJSONString();
        } catch (Exception e) {
            System.err.println("The client_secret could not be generated: " + e.getMessage());
            e.printStackTrace();
            return null;
        }
    }

    private String generateJwt(String pathToKey, JSONObject payload) throws Exception {
        JsonWebSignature jws = new JsonWebSignature();
        jws.setPayload(payload.toJSONString());
        jws.setAlgorithmHeaderValue(AlgorithmIdentifiers.ECDSA_USING_P256_CURVE_AND_SHA256);
        jws.setKeyIdHeaderValue(UUID.randomUUID().toString());
        PrivateKey privateKey = getPrivateKey(pathToKey);
        jws.setKey(privateKey);
        return jws.getCompactSerialization();
    }

    private PrivateKey getPrivateKey(String filename) throws Exception {
        KeyFactory keyFactory = KeyFactory.getInstance("EC");
        String privateKeyContent = new String(Files.readAllBytes(new File(filename).toPath()), Charset.defaultCharset());
        privateKeyContent = privateKeyContent.replaceAll("\\n", "").replace("-----BEGIN PRIVATE KEY-----", "").replace("-----END PRIVATE KEY-----", "");
        PKCS8EncodedKeySpec keySpecPKCS8 = new PKCS8EncodedKeySpec(Base64.getDecoder().decode(privateKeyContent));
        return keyFactory.generatePrivate(keySpecPKCS8);
    }
}