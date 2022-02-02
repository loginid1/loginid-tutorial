/**
 * LoginID-Demo
 *
 * This code is meant for educational purposes. It is provided as-is and is not expected to be used in production systems.
 * - Use this code at your own risk!
 * - Use this code to get a better understanding for FIDO2 enabled authentication and authorization flows.
 *
 * For more information, please visit http://loginid.io.
 *
 * LoginID, January 2022
 */

const SERVICE='@@service_location@@';
const SERVICE_KONG='@@kong_location@@';

/********************************************/
/* Functions that leverage LoginIDs Web SDK */
/********************************************/

/**
 * Uses the Web SDK to register a user using a FIDO2 authenticator.
 * Used by menu: Features - Authenticate
 * @param dw An instance of the LoginID Web SDK
 */
async function registerUser(dw) {
    try {
        let user = document.getElementById('idSignInName').value;

        // the call prompts a user to authenticate using a FIDO2 authenticator
        // the result contains a JSON message which includes a 'jwt' which represents the registered user
        let useRoaming = document.getElementById('idUseRoaming').checked;
        let result = await dw.registerWithFido2(user, {roaming_authenticator: useRoaming});

        updateSession(result.jwt, user);
        getMsg(SERVICE + "/users/session", result.jwt);
    } catch (err) {
        document.getElementById('divResponse').innerHTML = "<strong>" + err.message + "</strong>"
    }
}

/**
 * Uses the Web SDK to authenticate a user using a FIDO2 authenticator.
 * Used by menu: Features - Authenticate
 * @param dw An instance of the LoginID Web SDK
 */
async function signInUser(dw) {

    let user = document.getElementById('idSignInName').value;
    if(!user) {
        alert('Please provide a username');
        return;
    }
    try {

        // the call prompts a user to authenticate using a FIDO2 authenticator
        // the result contains a JSON message which includes a 'jwt' which represents the authenticated user
        let useRoaming = document.getElementById('idUseRoaming').checked;
        let result = await dw.authenticateWithFido2(user, {roaming_authenticator: useRoaming});

        updateSession(result.jwt, user);
        getMsg(SERVICE + "/users/session", result.jwt);
    } catch (err) {

        // err occurs if the user has not yet registered the username or the device
        if ("user_not_found" === err.code) {
            document.getElementById('divResponse').innerHTML =
                "<strong>You have not registered yet, would you like to do that now?</strong>" +
                "<button type=\"button\" onclick=\"return registerUser(dw)\">Yes, Register</button>"
        }
    }
}

/**
 * Uses the Web SDK to add a FIDO2 authenticator.
 * Used by menu: Additional Devices - Request Adding Authenticator
 * @param dw An instance of the LoginID Web SDK
 */
async function addAuthenticator(dw) {

    let user = document.getElementById('idReqAuthCodeUsernameConfirm').value;
    let code = document.getElementById('idAuthCodeConfirm').value;
    if( !(user && code)) {
        alert('Please make sure a username and an authorization code are displayed!');
        return;
    }
    try {

        // authenticates a user based on the username and the authorized code
        // the result contains a JSON message which includes a 'jwt' which represents the authenticated user
        let result = await dw.addFido2CredentialWithCode(user, code);

        updateSession(result.jwt, user);
        getMsg(SERVICE + "/users/session", result.jwt);
    } catch (err) {
        document.getElementById('divResponse').innerHTML = "<strong>" + err.message + "</strong>"
    }
}

/**
 * Uses the Web SDK to sign a transaction using the FIDO2 key of the current user. This function is called after receiving a response from 'initiateTransaction'
 * Used by menu: Features - Create Transaction Confirmation
 * @param dw An instance of the LoginID Web SDK
 */
async function confirmTransaction(dw) {

    try {

        let transactionId = document.getElementById('transactionId').value;
        let username = document.getElementById('idCurrentUser').innerText

        if( !(transactionId && username) ) {
            alert('Please make sure that you are logged in and that a transactionId is displayed!');
            return;
        }

        // the call prompts a user to authenticate using a FIDO2 authenticator. This is when the transaction gets signed
        // the result contains a JSON message which includes a 'jwt' which represents the confirmed transaction
        let result = await dw.confirmTransaction(username, transactionId);

        let jwtHeader = JSON.parse(atob(result.jwt.split(".")[0]));
        let jwtPayload = JSON.parse(atob(result.jwt.split(".")[1]));

        result['jwt_header'] = jwtHeader;
        result['jwt_payload'] = jwtPayload;

        printFlowResponse('<code class="language-json">' + JSON.stringify(result, null, 2) + '</code>');
    } catch (err) {
        document.getElementById('divResponse').innerHTML = "<strong>" + err.message + "</strong>"
    }
}

/*************************************/
/* Functions that leverage a backend */
/*************************************/

/**
 * Awaits the authorization of an authorization code to access an account temporarily.
 * Used by menu: Additional Devices - Request Temporary Access
 * @param targetUrl Points to the simulated backend which calls LoginID
 */
async function waiForTemporaryAccess(path) {
    let user = document.getElementById('idReqAuthCodeUsername').value;
    let code = document.getElementById('idAuthCodeConfirm').value;
    let msg = 'username=' + encodeURI(user) + '&code=' + encodeURI(code);
    $.ajax({
        type: 'POST',
        url: SERVICE + path,
        data: msg,
        dataType: 'json',
        contentType: 'application/x-www-form-urlencoded',
        async: true,
        statusCode: {
            200: function (data) {
                updateSession(data.jwt, user);
                getMsg(SERVICE + "/users/session", data.jwt);
            }
        },
        error: function (data) {
            console.error(data);
            let error = JSON.parse('{"error":"invalid_request", "error_description":"something went terribly wrong! Check the console!"}');
            printFlowResponse('<code class="language-json">' + JSON.stringify(error, null, 2) + '</code>');
        }
    });
}

/**
 * Initiates a transaction confirmation by requesting a transactionId via the clients backend.
 * Used by menu: Features - Create Transaction Confirmation
 * @param targetUrl Points to the simulated backend which calls LoginID
 */
function initiateTransaction(path) {
    let msg = document.getElementById('txtPayload').value;
    if(!msg) {
        alert('Please provide a payload!');
        return;
    }
    $.ajax({
        type: 'POST',
        url: SERVICE + path,
        data: msg,
        dataType: 'json',
        contentType: 'text/plain',
        async: true,
        headers: {"Authorization": "Bearer " + sessionStorage.getItem("token")},
        statusCode: {
            200: function (data) {
                document.getElementById('transactionId').setAttribute('value', data.transactionId);
                printFlowResponse('<code class="language-json">' + JSON.stringify(data, null, 2) + '</code>');
            },
            400: function (data) {
                printFlowResponse('<code class="language-json">' + JSON.stringify(data, null, 2) + '</code>');
            },
            401: function (data) {
                deleteSession();
                let error = JSON.parse('{"error":"invalid_request", "error_description":"Unknown user! Choose Authentication from the upper Features menu to login"}');
                printFlowResponse('<code class="language-json">' + JSON.stringify(error, null, 2) + '</code>');
            }
        }
    });
}

/**
 * Requests an authorization code to either add an authenticator or ask for access on a non-FIDO2 supported device.
 * Used by menu: Additional Devices - Request Add Authenticator / Request Temporary Access
 * @param targetUrl Points to the simulated backend which calls LoginID
 * @param confirmUsername 'true' for Add Authenticator. Simply places the username into a second text field
 */
function requestAuthCode(path, confirmUsername) {
    let username = document.getElementById('idReqAuthCodeUsername').value;
    if(!username) {
        alert('Please provide a username!');
        return;
    }
    let msg = 'username=' + encodeURI(username);
    $.ajax({
        type: 'POST',
        url: SERVICE + path,
        data: msg,
        dataType: 'json',
        contentType: 'application/x-www-form-urlencoded',
        async: true,
        statusCode: {
            200: function (data) {
                let field = document.getElementById('idAuthCodeConfirm')
                field.value = data.code;
                if (confirmUsername) {  // add authenticator
                    document.getElementById('idReqAuthCodeUsernameConfirm').value = data.username;
                } else {
                    // start waiting for the code authorization on the other device
                    waiForTemporaryAccess('/users/waittemporary', false);
                }
                printFlowResponse('<code class="language-json">' + JSON.stringify(data, null, 2) + '</code>');
            },
            400: function (data) {
                printFlowResponse('<code class="language-json">' + JSON.stringify(data, null, 2) + '</code>');
            }
        }
    });
}

/**
 * Sets a new name for an existing credential.
 * Used by menu: Features - Manage Authenticators (Devices)
 * @param targetUrl Points to the simulated backend which calls LoginID
 */
function updateCredentialName(path) {
    let credentialId = encodeURI(document.getElementById('idCredentialId').value);
    let credentialName = encodeURI(document.getElementById('idNewCredentialName').value);
    if(!credentialId || !credentialName) {
        alert('Please provide an ID and a name!');
        return;
    }
    let msg = 'credentialId=' + credentialId + '&credentialName=' + credentialName;
    $.ajax({
        type: 'POST',
        url: SERVICE + path,
        data: msg,
        dataType: 'json',
        contentType: 'application/x-www-form-urlencoded',
        async: true,
        headers: {"Authorization": "Bearer " + sessionStorage.getItem("token")},
        statusCode: {
            200: function (data) {
                printFlowResponse('<code class="language-json">' + JSON.stringify(data, null, 2) + '</code>');
            },
            400: function (data) {
                printFlowResponse('<code class="language-json">' + JSON.stringify(data, null, 2) + '</code>');
            }
        }
    });
}

/**
 * Named 'delete' but actually 'revokes' an existing credential.
 * Used by menu: Features - Manage Authenticators (Devices)
 * @param targetUrl Points to the simulated backend which calls LoginID
 */
function deleteCredentialName(path) {
    let credentialId = encodeURI(document.getElementById('idCredentialIdDelete').value);
    if(!credentialId) {
        alert('Please provide an ID!');
        return;
    }
    $.ajax({
        type: 'DELETE',
        url: SERVICE + path + '?credentialId=' + credentialId,
        dataType: 'json',
        async: true,
        headers: {"Authorization": "Bearer " + sessionStorage.getItem("token")},
        statusCode: {
            200: function (data) {
                printFlowResponse('<code class="language-json">' + JSON.stringify(data, null, 2) + '</code>');
            },
            400: function (data) {
                printFlowResponse('<code class="language-json">' + JSON.stringify(data, null, 2) + '</code>');
            }
        }
    });
}

/**
 * Granting an authorization code. Either for adding a device or for granting temporary access
 * Used by menu: Features - Grant Request
 * @param targetUrl Points to the simulated backend which calls LoginID
 */
function grantAuthCode(path) {
    let code = document.getElementById('idAuthCode').value;
    if(!code) {
        alert('Please provide an authorization code!');
        return;
    }
    let msg = 'code=' + encodeURI(code);
    $.ajax({
        type: 'POST',
        url: SERVICE + path,
        data: msg,
        dataType: 'json',
        contentType: 'application/x-www-form-urlencoded',
        async: true,
        headers: {"Authorization": "Bearer " + sessionStorage.getItem("token")},
        statusCode: {
            200: function (data) {
                printFlowResponse('<code class="language-json">' + JSON.stringify(data, null, 2) + '</code>');
            },
            400: function (data) {
                printFlowResponse('<code class="language-json">' + JSON.stringify(data, null, 2) + '</code>');
            },
            401: function (data) {
                deleteSession();
                let error = JSON.parse('{"error":"invalid_request", "error_description":"Unknown user! Choose Authentication from the upper Features menu to login"}');
                printFlowResponse('<code class="language-json">' + JSON.stringify(error, null, 2) + '</code>');
            }
        }
    });
}

/************************************/
/* Helper functions to cal backends */
/************************************/

function directCall(targetUrl) {
    getMsg(targetUrl, null);
}

function protectedCall(path) {
    getMsg(SERVICE + path, sessionStorage.getItem("token"));
}

function protectedCallKong(path) {
    getMsg(SERVICE_KONG + path, sessionStorage.getItem("token"));
}

function getMsg(targetUrl, credential) {
    $.ajax({
        type: 'GET',
        url: targetUrl,
        headers: {"Authorization": "Bearer " + credential},
        dataType: 'json',
        async: true,
        statusCode: {
            200: function (data) {
                printFlowResponse('<code class="language-json">' + JSON.stringify(data, null, 2) + '</code>');
            },
            400: function (data) {
                deleteSession();
                printFlowResponse('<code class="language-json">' + JSON.stringify(data, null, 2) + '</code>');
            },
            401: function (data) {
                deleteSession();
                let error = JSON.parse('{"error":"invalid_request", "error_description":"Unknown user! Choose Authentication from the upper Features menu to login"}');
                printFlowResponse('<code class="language-json">' + JSON.stringify(error, null, 2) + '</code>');
            },
            404: function (data) {
                deleteSession();
                let error = JSON.parse('{"error":"invalid_request", "error_description":"the requested service is unknown. Check the console!"}');
                printFlowResponse('<code class="language-json">' + JSON.stringify(error, null, 2) + '</code>');
            }
        },
        error: function (data) {
            console.error(data);
            let error = JSON.parse('{"error":"invalid_request", "error_description":"something went terribly wrong! Check the console!"}');
            printFlowResponse('<code class="language-json">' + JSON.stringify(error, null, 2) + '</code>');
        }
    });
}

/********************/
/* Helper functions */
/********************/

function getTabContent(pageName, targetId) {
    $.ajax({
        type: 'GET',
        url: pageName,
        dataType: 'html',
        async: true,
        success: function (data) {
            document.getElementById(targetId).innerHTML = data;
        },
        error: function (data) {
            document.getElementById(targetId).innerHTML = data;
        }
    });
}

function checkSession() {
    let token = sessionStorage.getItem('token');
    if (token) {
        let username = JSON.parse(atob(token.split(".")[1])).udata;
        document.getElementById('idCurrentUser').innerText = username;
    } else {
        document.getElementById('idCurrentUser').innerText = 'logged out';
    }
}

function updateSession(token, username) {
    sessionStorage.setItem("token", token);
    document.getElementById('idCurrentUser').innerText = username;
}

function deleteSession() {
    sessionStorage.removeItem('token')
    document.getElementById('idCurrentUser').innerText = 'logged out';
}

function clearApiResponses() {
    document.getElementById('divResponse').innerHTML = 'Nothing to show';
}

function printFlowResponse(output) {
    document.getElementById('divResponse').innerHTML = '<pre>' + output + '</pre>';
    Prism.highlightAll(false, null);
}

async function isFidoSupported(displayInfoItem) {

    // check, if FIDO2 is supported on this device (browser)
    let isFidoSupported = await dw.isFido2Supported();
    let item = document.getElementById(displayInfoItem);
    if(!isFidoSupported) {
        item.innerHTML = '<small>This device (browser) has no built-in support for FIDO! Try a roaming key if available!</small><br/>';
    } else {
        item.innerHTML = '';
    }
}