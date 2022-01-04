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

/********************************************/
/* Functions that leverage LoginIDs Web SDK */
/********************************************/

/**
 * Uses the Web SDK to register a user using a FIDO2 authenticator.
 * @param dw An instance of the LoginID Web SDK
 */
async function registerUser(dw) {
    try {
        let user = document.getElementById('idSignInName').value;

        // the call prompts a user to authenticate using a FIDO2 authenticator
        // the result contains a JSON message which includes a 'jwt' which represents the registered user
        let result = await dw.registerWithFido2(user, {roaming_authenticator: true});

        updateSession(result.jwt, user);
        getMsg("http://localhost:8080/users/session", result.jwt);
    } catch (err) {
        document.getElementById('divResponse').innerHTML = "<strong>" + err.message + "</strong>"
    }
}

/**
 * Uses the Web SDK to authenticate a user using a FIDO2 authenticator.
 * @param dw An instance of the LoginID Web SDK
 */
async function signInUser(dw) {
    let result;
    let user = document.getElementById('idSignInName').value;
    try {

        // the call prompts a user to authenticate using a FIDO2 authenticator
        // the result contains a JSON message which includes a 'jwt' which represents the authenticated user
        result = await dw.authenticateWithFido2(user, {roaming_authenticator: true});

        updateSession(result.jwt, user);
        getMsg("http://localhost:8080/users/session", result.jwt);
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
 * @param dw An instance of the LoginID Web SDK
 */
async function addAuthenticator(dw) {
    let result;
    let user = document.getElementById('idReqAuthCodeUsernameConfirm').value;
    let code = document.getElementById('idAuthCodeConfirm').value;
    try {

        // authenticates a user based on the username and the authorized code
        // the result contains a JSON message which includes a 'jwt' which represents the authenticated user
        result = await dw.addFido2CredentialWithCode(user, code);

        updateSession(result.jwt, user);
        getMsg("http://localhost:8080/users/session", result.jwt);
    } catch (err) {
        document.getElementById('divResponse').innerHTML = "<strong>" + err.message + "</strong>"
    }
}

/**
 * Uses the Web SDK to sign a transaction using the FIDO2 key of the current user. This function is called after receiving a response from 'initiateTransaction'
 * @param dw An instance of the LoginID Web SDK
 */
async function confirmTransaction(dw) {
    try {
        let transactionId = document.getElementById('transactionId').value;
        let username = document.getElementById('idCurrentUser').innerText

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
 * @param targetUrl Points to the simulated backend which calls LoginID
 */
async function waiForTemporaryAccess(targetUrl) {
    let user = document.getElementById('idReqAuthCodeUsername').value;
    let code = document.getElementById('idAuthCodeConfirm').value;
    let msg = 'username=' + encodeURI(user) + '&code=' + encodeURI(code);
    $.ajax({
        type: 'POST',
        url: targetUrl,
        data: msg,
        dataType: 'json',
        contentType: 'application/x-www-form-urlencoded',
        async: true,
        statusCode: {
            200: function (data) {
                updateSession(data.jwt, user);
                getMsg("http://localhost:8080/users/session", data.jwt);
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
 * @param targetUrl Points to the simulated backend which calls LoginID
 */
function initiateTransaction(targetUrl) {
    let msg = document.getElementById('txtPayload').value;
    $.ajax({
        type: 'POST',
        url: targetUrl,
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
 * @param targetUrl Points to the simulated backend which calls LoginID
 * @param confirmUsername 'true' for Add Authenticator. Simply places the username into a second text field
 */
function requestAuthCode(targetUrl, confirmUsername) {
    let username = document.getElementById('idReqAuthCodeUsername').value;
    let msg = 'username=' + encodeURI(username);
    $.ajax({
        type: 'POST',
        url: targetUrl,
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
                } else {  // grant temporary, click the field so that we wait for the  granted authorization code
                    field.click();
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
 * @param targetUrl Points to the simulated backend which calls LoginID
 */
function updateCredentialName(targetUrl) {
    let credentialId = encodeURI(document.getElementById('idCredentialId').value);
    let credentialName = encodeURI(document.getElementById('idNewCredentialName').value);
    let msg = 'credentialId=' + credentialId + '&credentialName=' + credentialName;
    $.ajax({
        type: 'POST',
        url: targetUrl,
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
 * @param targetUrl Points to the simulated backend which calls LoginID
 */
function deleteCredentialName(targetUrl) {
    let credentialId = encodeURI(document.getElementById('idCredentialIdDelete').value);
    $.ajax({
        type: 'DELETE',
        url: targetUrl + '?credentialId=' + credentialId,
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
 * @param targetUrl Points to the simulated backend which calls LoginID
 */
function grantAuthCode(targetUrl) {
    let code = document.getElementById('idAuthCode').value;
    let msg = 'code=' + encodeURI(code);
    $.ajax({
        type: 'POST',
        url: targetUrl,
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

function protectedCall(targetUrl) {
    getMsg(targetUrl, sessionStorage.getItem("token"));
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