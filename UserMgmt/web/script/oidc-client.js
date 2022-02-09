/**
 * This is a very simple javascript based oauth client (public client). The main idea is to show steps that are executed between initiating an
 * authorization flow and receiving an issued access_token.
 *
 * Do not use this code for anything else than 'evaluation purposes'!
 *
 * We hope this helps understanding the basics of oauth flows (in this case, the authorization_code flow).
 *
 * LoginID, February 2022
 */

/**
 * This client will handle four cases:
 *
 * 1. Initialization, the first time this scripts loads
 * 2. Handling a redirect response. The authorization server has responded either with an error or with an authorization code
 * 3. Exchanging the code for a token response
 * 4. Receiving the token response, clearing the current state
 *
 * The state object is a JSON object having this structure:
 *
 * key = null or a UUID
 * value = {"state":"...", "nonce":"...", "next":"...", "code_verifier": "..."}
 *
 * - state = empty string or a UUID
 * - nonce = empty string or a UUID, created with the authorization request
 * - next = empty string or /token, the next endpoint to call
 * - code_verifier = empty string or PKCE code_verifier
 */

// always write the top part of the UI
// add any other content into the div 'divOidcResponse'
document.write('<body>' +
    '<div class="container" id="content"><h2>LoginID OpenID Connect Democlient!</h2>\n' +
    '    <p>This is a demo client which connects to <strong>LoginID</strong>s OpenID Connect service</a>.</p>\n' +
    '    <p>This client represents a <strong>Single Page App (SPA)</strong> that a developer may build.</p>' +
    '    <hr/><div id="divOidcResponse"></div>' +
    '</div></body>');

/**
 * The configuration for our client
 */
class ClientConfiguration {

    constructor() {
        this.client_id = '@@oidc_public_client_id@@';
        this.authorization_endpoint = 'https://oauth2.qa.loginid.io/oauth2/auth';
        this.token_endpoint = 'https://oauth2.qa.loginid.io/oauth2/token';
        this.scope = 'openid';
        this.responseType = 'code';
        this.grant_type = 'authorization_code';
        this.redirect_uri = '@@oidc_public_client_redirect@@';
    }

    getClientId() {
        return this.client_id;
    }

    getRedirectUri() {
        return this.redirect_uri;
    }

    getScope() {
        return this.scope;
    }

    getResponseType() {
        return this.responseType;
    }

    getGrantType() {
        return this.grant_type;
    }

    getAuthorizationEndpoint() {
        return this.authorization_endpoint;
    }

    getTokenEndpoint() {
        return this.token_endpoint;
    }
}

// Check if this client has been enabled
let config = new ClientConfiguration();
if (config.getClientId().includes('@')) {
    printMissingConfig();
} else if (window.location.search.length > 0) {
    // assumption:
    // - there is only a URL search component (query parameters) if an authorization flow is active

    let params = window.location.search.substr(1).split('&');

    let title = '';
    let output = '';

    let hasError = false;
    let hasCode = false;

    for (let i = 0; i < params.length; i++) {
        let key = params[i].split('=')[0];
        let value = decodeURI(params[i].split('=')[1]);
        output = output + '<strong>' + key + '</strong>: ' + value + '</br>';
        console.log('key: ' + key);
        if (!hasError) {
            hasError = key === 'error';
            console.log('hasError');
        }
        if (!hasCode) {
            hasCode = key === 'code';
            console.log('hasCode');
        }
    }

    /*
    /* this section is very specific. Other servers may respond with more or less parameters
     */
    console.log('hasError: ' + hasError + ', hasCode: ' + hasCode);
    if (hasError) { // error: (state & error & error_description)
        title = 'Error!';
    } else if (hasCode) { // success: code response (state & code & iss)
        title = 'Success!<br/>An authorization_code was received!<br/><small>(shown only for demo purposes!)</small>';
        output = output + '<button type="submit" class="btn btn-primary" onclick="return exchangeCode(\'' + params[0] + '\',\'' + params[1] + '\');">Exchange code for token response</button>';
    } else {
        // unknown: no valid parameter combination found
        title = 'Hmmm ... something unexpected: an unknown parameter combination:'
        output = window.location.href;
    }
    printFlowResponse(title, output);
}
// if not, simply print the 'get started' page
else {
    printFirstPage();
}

/**
 * OAuth
 *
 * Initiate the authorization_code flow. This is called with a click of a button by the user
 */
async function authorize() {

    let loginHint = document.getElementById('login_hint').value;
    if (loginHint !== null && loginHint.length <= 24) {
        loginHint = '&login_hint=' + encodeURI(loginHint);
    } else {
        loginHint = '';
    }

    let state = generate_random_string(32);
    let nonce = generate_random_string(32);  // this will appear within the id_token, issued by the provider

    let code_verifier
    let code_challenge
    let isHttp = true;
    if (isHttp) {
        // Instead of generating values, the demo for 'http' uses hardcoded values
        // Browsers do not generate a sha256 value outside of https
        code_verifier = 'abcdefghijklmnopqrstuvwxyz123456';
        code_challenge = '9tUn5tAYZUgRNPKXiL4q_n_DxwLhpV186vrF81GZ6Nw';
    } else {
        code_verifier = generate_random_string(32);
        code_challenge = await pkceChallengeFromVerifier(code_verifier);
    }

    let config = new ClientConfiguration();
    let authorizeUrl = config.getAuthorizationEndpoint() + '?'
        + 'client_id=' + encodeURI(config.getClientId())
        + '&redirect_uri=' + encodeURI(config.getRedirectUri())
        + '&scope=' + encodeURI(config.getScope())
        + '&response_type=' + encodeURI(config.getResponseType())
        + '&nonce=' + encodeURI(nonce)
        + '&code_challenge=' + encodeURI(code_challenge)
        + '&code_challenge_method=S256'
        + '&state=' + encodeURI(state)
        + loginHint;

    setSpaState(state, '{"state":"' + state + '", "nonce":"' + nonce + '", "next":"' + config.getTokenEndpoint() + '", "code_verifier":"' + code_verifier + '"}');

    window.location = authorizeUrl;
}

/**
 * OAuth
 *
 * This is called after the authorization server has issued an authorization code.
 *
 * This is only successful if CORS is enabled for the /token endpoint
 *
 * @param one, either "state=value" or "code=codeValue"
 * @param two, either "state=value" or "code=codeValue"
 */
function exchangeCode(one, two) {

    let code = '';
    let givenStateParameter = '';
    let stateInStorage = '';

    let keyValueOne = one.split('=');
    let keyValueTwo = two.split('=');

    if ('state' === keyValueOne[0]) {
        code = keyValueTwo[1];
        givenStateParameter = keyValueOne[1];
    } else {
        code = keyValueOne[1];
        givenStateParameter = keyValueTwo[1];
    }

    // compare the given state value to the one found as part of the session state in sessionStorage
    stateInStorage = getSpaState(givenStateParameter);
    if (stateInStorage == null) {
        clearSpaState();
        printFlowResponse('Error!', 'The given session is either expired or invalid!' + getMessageFooter());
    } else {
        stateInStorage = JSON.parse(stateInStorage);
        if (stateInStorage['state'] !== givenStateParameter) {
            clearSpaState();
            printFlowResponse('Error!', 'The given session is invalid!');
        } else {
            // Later, we need to check if this is found within the token response (id_token).
            // If not, the given response was not meant for us
            let nonce = stateInStorage['nonce'];

            // Grab the next endpoint
            let next = stateInStorage['next'];

            clearSpaState();

            let config = new ClientConfiguration();
            let reqMsg = 'client_id=' + encodeURI(config.getClientId())
                + '&redirect_uri=' + encodeURI(config.getRedirectUri())
                + '&grant_type=' + encodeURI(config.getGrantType())
                + '&code_verifier=' + encodeURI(stateInStorage['code_verifier'])
                + '&code=' + encodeURI(code);

            postMsg(next, nonce, reqMsg);
        }
    }
}

/**
 * Send a POST request
 * @param targetUrl In our case this is the /token endpoint
 * @param expectedNonce The nonce that should be found in the response. Finding this verifies that the response was made for our client and our session
 * @param msg The message to be send. All parameters need to be URLEncoded
 */
function postMsg(targetUrl, expectedNonce, msg) {
    $.ajax({
        type: 'POST',
        url: targetUrl,
        data: msg,
        dataType: 'json',
        contentType: 'application/x-www-form-urlencoded',
        async: false,
        success: function (data) {
            // validate that 'nonce' is found within the response. Ignoring that for now ...
            printFlowResponse('Success!<br/>This is the token response:', getPostMsgResponse(data, expectedNonce));
        },
        error: function (data) {
            printFlowResponse('Error!<br/>Something went wrong!:', getPostMsgResponse(data));
        }
    });
}

/*
 * As of here you can find helper methods
 */

function getSpaState(key) {
    return sessionStorage.getItem(key);
}

function setSpaState(key, value) {
    sessionStorage.setItem(key, value);
}

function clearSpaState() {
    sessionStorage.clear();
}

function getPostMsgResponse(data, expectedNonce) {
    console.log('expectedNonce: ' + expectedNonce);
    return '<code class="language-json">' + JSON.stringify(data, null, 2) + '</code>' + getMessageFooter();
}

function getMessageFooter() {
    return '<hr/><p>Try again! <a href="oidc.html"><strong>SPA!</strong></a></p>'
}

function printFlowResponse(title, output) {
    document.getElementById('divOidcResponse').innerHTML = '<h3>' + title + '</h3><pre>' + output + '</pre>';
    Prism.highlightAll(false, null);
}

function printFirstPage() {
    let content = '<p>Selecting <strong>Submit</strong> initiates an OpenID Connect authorization code flow. It takes you to LoginID where you can log in.</p>\n' +
        '    <p>The final result will be a LoginID issued id_token.</p>' +
        '    <form>\n' +
        '        <div class="form-group">\n' +
        '            <label for="login_hint">login_hint (optional, forwarded to LoginID to show the support for {login_hint}. Any simulated email address will do)</label>\n' +
        '            <input type="email" id="login_hint" name="login_hint" class="form-control" size="80">\n' +
        '        </div>\n' +
        '        <button type="button" class="btn btn-primary" onclick="return authorize();">Submit</button>\n' +
        '    </form>' +
        '    <hr/>';
    document.getElementById('divOidcResponse').innerHTML = content;
}

function printMissingConfig() {
    let content = '<p>This client has not been configured! Please register a public client_id and configure the client to enable it.</p>';
    document.getElementById('divOidcResponse').innerHTML = content;
}

/**
 * PKCE methods are inspired by  https://github.com/aaronpk/pkce-vanilla-js/blob/master/index.html
 */

//////////////////////////////////////////////////////////////////////
// PKCE HELPER FUNCTIONS

// Calculate the SHA256 hash of the input text.
// Returns a promise that resolves to an ArrayBuffer
function sha256(plain) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest('SHA-256', data);
}

// Base64-urlencodes the input string
function base64urlencode(str) {
    // Convert the ArrayBuffer to string using Uint8 array to conver to what btoa accepts.
    // btoa accepts chars only within ascii 0-255 and base64 encodes them.
    // Then convert the base64 encoded to base64url encoded
    //   (replace + with -, replace / with _, trim trailing =)
    return btoa(String.fromCharCode.apply(null, new Uint8Array(str)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Return the base64-urlencoded sha256 hash for the PKCE challenge
async function pkceChallengeFromVerifier(v) {
    let hashed = await sha256(v);
    return base64urlencode(hashed);
}

/**
 *
 * The random string method was copied from here:
 * https://codehandbook.org/generate-random-string-characters-in-javascript/
 *
 */
function generate_random_string(string_length) {
    let random_string = '';
    let random_ascii;
    let ascii_low = 65;
    let ascii_high = 90
    for (let i = 0; i < string_length; i++) {
        random_ascii = Math.floor((Math.random() * (ascii_high - ascii_low)) + ascii_low);
        random_string += String.fromCharCode(random_ascii)
    }
    return random_string
}