/*************************************************/
/* Functions that leverage the tutorials backend */
/*************************************************/

/**
 * Awaits the authorization of an authorization code to access an account temporarily.
 * Used by menu: Additional Devices - Request Temporary Access
 * @param path Points to the backend which calls LoginID
 */
async function waiForTemporaryAccess(path) {
    let user = document.getElementById('idReqAuthCodeTempUsername').value;
    let code = document.getElementById('idAuthCodeTempConfirm').value;
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
 * @param path Points to the backend which calls LoginID
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
 * @param path Points to the backend which calls LoginID
 * @param confirmUsername 'true' for Add Authenticator. Simply places the username into a second text field
 * @param usernameContainerId the container that holds the username
 * @param codeContainerId the container holding the authCode
 */
function requestAuthCode(path, confirmUsername, usernameContainerId, codeContainerId) {
    let username = document.getElementById(usernameContainerId).value;
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
                let field = document.getElementById(codeContainerId)
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
 * @param path Points to the backend which calls LoginID
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
 * @param path Points to the backend which calls LoginID
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
 * @param path Points to the simulated backend which calls LoginID
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