async function registerUser(dw) {
    try {
        let result = await dw.registerWithFido2(document.getElementById('idSignInName').value);
        sessionStorage.setItem("token", result.jwt);
        getMsg("http://localhost:8080/users/session", result.jwt);
    } catch (err) {
        document.getElementById('divResponse').innerHTML = "<strong>" + err.message + "</strong>"
    }
}

async function signInUser(dw) {
    let result;
    let username = document.getElementById('idSignInName').value;
    try {
        result = await dw.authenticateWithFido2(username);
        sessionStorage.setItem("token", result.jwt);
        getMsg("http://localhost:8080/users/session", result.jwt);
    } catch (err) {
        if ("user_not_found" === err.code) {
            document.getElementById('divResponse').innerHTML =
                "<strong>You have not registered yet, would you like to do that now?</strong>" +
                "<button type=\"button\" onclick=\"return registerUser(dw)\">Yes, Register</button>"
        }
    }
}

async function addAuthenticator(dw) {
    let result;
    let username = document.getElementById('idSignInName').value;
    let code = document.getElementById('idAuthCode').value;
    try {
        result = await dw.addFido2CredentialWithCode(username, code);
        sessionStorage.setItem("token", result.jwt);
        getMsg("http://localhost:8080/users/session", result.jwt);
    } catch (err) {
        document.getElementById('divResponse').innerHTML = "<strong>" + err.message + "</strong>"
    }
}

function requestAuthCodeAuthenticator(targetUrl) {
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
                printFlowResponse('<code class="language-json">' + JSON.stringify(data, null, 2) + '</code>');
            },
            400: function (data) {
                printFlowResponse('<code class="language-json">' + JSON.stringify(data, null, 2) + '</code>');
            }
        }
    });
}

function grantAuthCodeAuthenticator(targetUrl) {
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
                sessionStorage.removeItem("token");
                let error = JSON.parse('{"error":"invalid_request", "error_description":"Unknown user! Choose Authentication from the upper menu to authenticate"}');
                printFlowResponse('<code class="language-json">' + JSON.stringify(error, null, 2) + '</code>');
            }
        }
    });
}

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
                sessionStorage.removeItem("token");
                printFlowResponse('<code class="language-json">' + JSON.stringify(data, null, 2) + '</code>');
            },
            401: function (data) {
                sessionStorage.removeItem("token");
                let error = JSON.parse('{"error":"invalid_request", "error_description":"Unknown user! Choose Authentication from the upper menu to authenticate"}');
                printFlowResponse('<code class="language-json">' + JSON.stringify(error, null, 2) + '</code>');
            },
            404: function (data) {
                sessionStorage.removeItem("token");
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

function printFlowResponse(output) {
    document.getElementById('divResponse').innerHTML = '<pre>' + output + '</pre>';
    Prism.highlightAll(false, null);
}