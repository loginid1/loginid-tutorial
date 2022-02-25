/************************************/
/* Helper functions to call backends */
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

function getTabContent(pageName) {
    $.ajax({
        type: 'GET',
        url: pageName,
        dataType: 'html',
        async: true,
        success: function (data) {
            document.getElementById('tabContent').innerHTML = data;
        },
        error: function (data) {
            document.getElementById('tabContent').innerHTML = data;
        }
    });
}

function checkSession() {
    let token = sessionStorage.getItem('token');
    let username = 'logged out';
    if (token) {
        username = JSON.parse(atob(token.split(".")[1])).udata;  // native JWT
        if(!username) {
            username = JSON.parse(atob(token.split(".")[1])).sub; // oidc id_token
        }
    }
    let oidcResponse = sessionStorage.getItem('oidcresponse');
    if(oidcResponse) {
        sessionStorage.removeItem('oidcresponse');
        printFlowResponse('<code class="language-json">' + JSON.stringify(JSON.parse(oidcResponse), null, 2) + '</code>');
    }
    document.getElementById('idCurrentUser').innerText = username;
}

function updateSession(token, username) {
    sessionStorage.setItem("token", token);
    let userField = document.getElementById('idCurrentUser');
    if(userField) {
        userField.innerText = username
    }
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