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

## Cloning this project

This project uses the LoginID-Java-SDK which is used as a git submodule. When cloning this project, use this command:

- `git clone --recurse-submodules https://gitlab.com/sascha17/kong-demo.git`

To continue, cd into `./kong-demo`.

If you ran git clone without `--recurse-submodules` or if you are not working in the main branch, run the following now:

- `git submodule init`
- `git submodule update`

Your project now includes the submodule that contains the java SDK but only as a *read* version, so to say.

**Tip:** More information on git submodules can be found [here](https://git-scm.com/book/en/v2/Git-Tools-Submodules).

## Preparing the demo

To make it work you have to register a **Web App** and **Backend/API** credential at LoginIDs dashboard.

**NOTE:** Do NOT attach an API credential to the Web App but to the Backend/API configuration! 

To include the backend api credentials in this setup, copy the file `.env_template` and paste it as `.env`.

Configure `.env` now, please look inside that file for instructions!

Once that is done, update the following files:

- `./web/index.html`
  - replace `{web-sdk-client_id}` with your Web App client_id
  - replace `{base_url}` with your base_url (use **https://directweb.usw1.loginid.io** if unsure)
  - i.e.: from **{web-sdk-client_id}** to **pW2Gl...pGI_Q**
- `./docker-build/add-ons/kong/kong.yml`
  - replace `{web-sdk-client_id}` with your Web App client_id (two locations)
  - replace `{base_url}` with your base_url (use **https://directweb.usw1.loginid.io** if unsure) (two locations)
  - i.e.: from **{web-sdk-client_id}** to **pW2Gl...pGI_Q**
  - update other values if needed

## Building the demo

### Prepare the build

The whole system is docker based. To build it these tools are needed:

- docker
- docker-compose
- Make // if Make is not available, run the commands found within `Makefile` manually in your terminal

### Build the containers

If all those are available, do this:

- once:
  - `make build_tooling`  // this will build a container that includes java jdk11, maven and the compiled LoginID java SDK. This only needs to be executed for the first time or after an update of the java SDK!
- always:
  - for Mac: `make build`  // this compiles code and builds the docker images
  - for Windows: `make build_win` // run this if you are on a Windows machine
    - please look into **Makefile** for details if you do not want to use Make or if failures occur

## Running the demo

After building the project you are ready to launch the system:

- `docker-compose up`  // this launches the system. Use `docker-compose -f docker-compose-dev.yml up` to use debugging enabled containers 
- `http://localhost`  // open a browser at that location and enjoy the app
  - these ports will be used: **80, 8001, 8080, 8090, 8444**

Once you are done, terminate the containers by running:

- `docker-compose down`

**Tip:** if you run into trouble when launching docker because it complains about conflicting containers already running, use this command to stop and remove them:

- `docker stop $(docker ps -aq)`
- `docker rm $(docker ps -aq)`

## Demo details

The application uses the LoginID issued JWT as its session token and when authenticating users against the user management API. 
For this demo the JWT is stored in the session store of the browser.

Try out the different menus to learn more about LoginID features!

## Kong Plugin configuration

The Kong plugin configuration can be updated in this file:
 
- `./docker-build/add-ons/kong/kong.yml`

Find the section called: **plugins - loginid**

The following values may be configured:

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