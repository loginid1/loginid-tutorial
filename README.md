# LoginID-Demo

This demo simulates a small setup that includes these components:

- **Demo App**:
  - a simple web application that leverages our javascript libraries for FIDO2 based user registration and authentication
  - the app demos several features and flows
  - the app demos the usage of the LoginID provided Kong gateway plugin
- **Kong**:
  - a Docker version of the Kong API Gateway
  - Kong is configured to validate a LoginID issued JWT and return an error if not provided or invalid
  - the demo connects to the public service Cat-Fact, once as an open API call, once protected by Kong
- **User Management**:
  - simulates a simple user management API. It receives a LoginID issued JWT and ... returns the username
  - connects to LoginID to call LoginID APIs that require so called *service token*

The visual version of the setup looks like this:

![alt overview](web/images/managecreds.png)

## Preparing the demo

To make it work you have to register a **Web App** and **Backend/API** credential at LoginIDs dashboard.

**NOTE:** Do NOT attach an API credential to the Web App but to the Backend/API configuration! 

To include the backend api credentials in this setup, copy the file `.env_template` and paste it as `.env`. Afterwards, configure it!

Please look inside that file for instructions!

Once that is done, update the following files:

- `./web/index.html`
  - replace `{web-sdk-client_id}` with your Web App client_id
- `./docker-build/add-ons/kong/kong.yml`
  - replace `{web-sdk-client_id}` with your Web App client_id (two locations)
  - update other values if needed

## Building the demo

The whole system is docker based. To build it these tools are needed:

- maven
- java
- Make  // if you do not have Make, run the commands found within `Makefile` manually
- docker
- docker-compose

If all those are available, do this:

- `make build`  // this compiles code and builds the docker images
- `docker-compose up`  // this launches the system, use `docker-compose -f docker-compose-dev.yml up` to use the debugging enabled user management container
- `http://localhost`  // open a browser at that location and enjoy the app
- when authenticating, choose a username of your choice

The application uses the LoginID issued JWT as its session token and when authenticating users against the user management API. 
For this demo the JWT is stored in the session store of the browser.

## Info: Kong Plugin configuration

For your convenience, these values may be configured for the Kong plugin:

|Parameter|Description|Type|Required|
|---------|-----------|----|--------|
|login_id_base_url|The base URL as given by LoginID|String|X|
|login_id_client_id|The client_id as given by LoginID|String|X|
|login_id_public_key_url|LoginID public key retrieval URL|String|X|
|issuer|Expected issuer of the JWT. This value will be validated against **iss** value in JWT payload. Defaults to **loginid.io**|String|-|
|audience|Expected audience. This value will be validated against **aud** value in JWT payload|String|X|
|maximum_age|Expected max. age in seconds. Default value is 300 seconds. Difference between current time and **
iat** value in JWT payload need to be below this max age|Number|-|
|acr|Expected acr value. This value will be validated if the acr value is configured in the plugin. If not, this value will not be validated|String|-|
|algorithm|Expected signing algorithm. Default value is ES256. This value will be validated against **alg** value in JWT header|String|-|
|namespace_id|Expected namespace ID. This value will be validated against nid value in JWT payload|String|-|