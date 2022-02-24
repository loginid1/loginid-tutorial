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