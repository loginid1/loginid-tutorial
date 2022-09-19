# ClientSecretGenerator

To leverage a confidential OpenID Connect client a developer has to generate the client_secret based on an API credential (private - public key pair), expressed as JWT.
To make this easier we have developed a simple tool that helps to generate that.

## Generating an API credential

When registering an application in LoginIDs dashboard an API Credential can be created by LoginID. However, that option should only be used for testing purposes. To use your 
own private - public key pair you may use these simple openssl commands:

**Note:** LoginID requires a private key that uses ECDSA but in pkcs#8 format!

- `openssl ecparam -name prime256v1 -genkey -noout -out private.ec.key`
- `openssl pkcs8 -topk8 -inform pem -in private.ec.key -outform pem -nocrypt -out private.pem`
- `openssl ec -in private.pem -pubout -out public.pem`

The file *public.pem* is the public key which has to be shared with LoginID when registering an API credential.

The file *private.pem* is your private key which has to be used below as input to generate a JWT based client_secret.

## Generating the client_secret

The tool can be used as follows:

```java -jar ClientSecretGenerator.jar {iss} {exp} {sub} {aud} {/absolute/path/to/private.pem}```

- **{iss}**: the client_id
- **{exp}**: the number of days for which the secret should be valid for (1-60)
- **{sub}**: the client_id
- **{aud}**: the OpenID Connect base URL
- **{path-to-private-key}**: absolute path to the private key that is used as API credential 

The generated JSON output includes the client_secret (JWT) and its payload for your convenience. It will look like this:

```json
    {
      "payload": {
        "sub": "VD4Kz......H_tvoIvKQ",
        "aud": "https://{namespaceid}.idp.playground.loginid.io",
        "iss": "VD4Kz......H_tvoIvKQ",
        "exp": 1663780912,
        "iat": 1663348912,
        "jti": "2132...ff587"
      },
      "client_secret": "the-jwt-based-client-secret"
    }
```

Copy the client_secret and use it with your OpenID Connect client, authenticating via **client_secret_basic** or **client_secret_post**.

## Building the tool yourself

To build the tool *Make* and *Maven* are required. Clone this project and run this command:

- ```make build_all```
- ```cd ./dist```
- ```java -jar ClientSecretGenerator.jar ...```

We hope this helps you to get ahead with your development faster!