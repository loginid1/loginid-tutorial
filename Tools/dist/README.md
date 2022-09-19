# ClientSecretGenerator

To leverage a confidential OpenID Connect client a developer has to generate the client_secret based on a private key, expressed as JWT.
To make this easier we have developed a simple tool that is helping to generate that.

The tool can be used as follows:

```java -jar ClientSecretGenerator.jar {iss} {exp} {sub} {aud} {/absolute/path/to/private_key.pem}```

- **{iss}**: the client_id
- **{exp}**: the number of days for which the secret should be valid for (1-60)
- **{sub}**: the client_id
- **{aud}**: the OpenID Connect base URL
- **{path-to-private-key}**: absolute path to the private key that is used as API credential 

The tool can be found in the **./dist** directory.

## Building the tool

To build the tool Make and Maven are required. Clone this project and run this command:

- ```make build_all```
- ```cd ./dist```
- ```java -jar ClientSecretGenerator.jar ...```

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
    
We hope this helps you to get ahead with your development faster!