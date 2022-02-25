/***********************************************************/
/* Functions that leverage LoginIDs OpenID Connect support */

/***********************************************************/

/**
 * The configuration for our client
 */
class ClientConfiguration {

    constructor() {
        this.client_id = OIDC_CLIENT_ID;
        this.scope = OIDC_SCOPE;
        this.redirect_uri = OIDC_REDIRECT_URI;
        this.responseType = 'code';
        this.grant_type = 'authorization_code';
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

    async getAuthorizationEndpoint() {
        let authorizationEndpoint = sessionStorage.getItem('authorization_endpoint');
        if (authorizationEndpoint === null) {
            let config = await $.get(OIDC_CONFIG_ENDPOINT);
            sessionStorage.setItem('authorization_endpoint', config.authorization_endpoint);
            sessionStorage.setItem('token_endpoint', config.token_endpoint);
            return config.authorization_endpoint;
        } else {
            return authorizationEndpoint;
        }
    }

    getTokenEndpoint() {
        return sessionStorage.getItem('token_endpoint');
    }
}

// Check if this client has been enabled
let config = new ClientConfiguration();
if (config.getClientId().includes('@')) {
    printFlowResponse('This OpenID Connect client has not been configured! Please register a public client_id and configure the client to enable it.');
} else if (window.location.search.length > 0) {

    let params = window.location.search.substr(1).split('&');
    let callbackResult = params[0].split('=')[1];
    if('success' === callbackResult) {
        exchangeCode(params[1].split('=')[1], params[2].split('=')[1]);
    } else {
        let error = {error: params[1].split('=')[1], error_description: decodeURIComponent(params[2].split('=')[1])};
        sessionStorage.setItem('oidcresponse', JSON.stringify(error));
        window.location = 'index.html';
    }
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
        // Instead of generating sha256 values, the demo for 'http' uses hardcoded values.
        // Browsers do not generate a sha256 value outside of https.
        code_verifier = 'abcdefghijklmnopqrstuvwxyz123456';
        code_challenge = '9tUn5tAYZUgRNPKXiL4q_n_DxwLhpV186vrF81GZ6Nw';
    } else {
        code_verifier = generate_random_string(32);
        code_challenge = await pkceChallengeFromVerifier(code_verifier);
    }

    let client = new ClientConfiguration();
    let authorizationEndpoint = await client.getAuthorizationEndpoint();
    let tokenEndpoint = client.getTokenEndpoint();
    let authorizeUrl = authorizationEndpoint + '?'
        + 'client_id=' + encodeURI(client.getClientId())
        + '&redirect_uri=' + encodeURI(client.getRedirectUri())
        + '&scope=' + encodeURI(client.getScope())
        + '&response_type=' + encodeURI(client.getResponseType())
        + '&nonce=' + encodeURI(nonce)
        + '&code_challenge=' + encodeURI(code_challenge)
        + '&code_challenge_method=S256'
        + '&state=' + encodeURI(state)
        + loginHint;

    setSpaState(state, '{"state":"' + state + '", "nonce":"' + nonce + '", "next":"' + tokenEndpoint + '", "code_verifier":"' + code_verifier + '"}');

    window.location = authorizeUrl;
}

/**
 * OAuth
 *
 * Exchange the received authorization code for a token response
 */
function exchangeCode(code, givenState) {

    let stateInStorage = '';

    // compare the given state value to the one found as part of the session state in sessionStorage
    stateInStorage = getSpaState(givenState);
    if (stateInStorage == null) {
        clearSpaState();
        printFlowResponse('Error!', 'The given session is either expired or invalid!');
    } else {
        stateInStorage = JSON.parse(stateInStorage);
        if (stateInStorage['state'] !== givenState) {
            clearSpaState();
            printFlowResponse('Error!', 'The given session is invalid!');
        } else {
            // Later, we need to check if this is found within the token response (id_token or provider, Loginbuddys response).
            // If not, the riven response was not meant for us
            let nonce = stateInStorage['nonce'];

            // Grab the next endpoint (/token in the case)
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
            updateSession(data.id_token, JSON.parse(atob(data.id_token.split(".")[1])).sub);
            sessionStorage.setItem('oidcresponse', JSON.stringify(data));
            window.location = 'index.html';
        },
        error: function (data) {
            deleteSession();
            window.location = 'index.html';
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
    return '<code class="language-json">' + JSON.stringify(data, null, 2) + '</code>';
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