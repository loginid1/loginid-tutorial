function checkSession() {
    let token = sessionStorage.getItem('token');
    if(token) {
        let username = JSON.parse(atob(token.split(".")[1])).udata;
        document.getElementById('idCurrentUser').innerText = username;
    }
}

function updateSession(token, username) {
    sessionStorage.setItem("token", token);
    document.getElementById('idCurrentUser').innerText = username;
}

function deleteSession() {
    sessionStorage.removeItem('token;')
    document.getElementById('idCurrentUser').innerText = 'you are logged out';
}

async function registerUser(dw) {
    try {
        let user = document.getElementById('idSignInName').value;
        let result = await dw.registerWithFido2(user);
        updateSession(result.jwt, user);
        getMsg("http://localhost:8080/users/session", result.jwt);
    } catch (err) {
        document.getElementById('divResponse').innerHTML = "<strong>" + err.message + "</strong>"
    }
}

async function signInUser(dw) {
    let result;
    let user = document.getElementById('idSignInName').value;
    try {
        result = await dw.authenticateWithFido2(user);
        updateSession(result.jwt, user);
        getMsg("http://localhost:8080/users/session", result.jwt);
    } catch (err) {
        if ("user_not_found" === err.code) {
            document.getElementById('divResponse').innerHTML =
                "<strong>You have not registered yet, would you like to do that now?</strong>" +
                "<button type=\"button\" onclick=\"return registerUser(dw)\">Yes, Register</button>"
        }
    }
}

async function addAuthenticator(dw, idUsernameField, idAuthCodeFieldName) {
    let result;
    let user = document.getElementById(idUsernameField).value;
    let code = document.getElementById(idAuthCodeFieldName).value;
    try {
        result = await dw.addFido2CredentialWithCode(user, code);
        updateSession(result.jwt, user);
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
                document.getElementById('idReqAuthCodeUsernameConfirm').value = data.username;
                document.getElementById('idAuthCodeConfirm').value = data.code;
                printFlowResponse('<code class="language-json">' + JSON.stringify(data, null, 2) + '</code>');
            },
            400: function (data) {
                printFlowResponse('<code class="language-json">' + JSON.stringify(data, null, 2) + '</code>');
            }
        }
    });
}

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
                deleteSession();
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
                deleteSession();
                printFlowResponse('<code class="language-json">' + JSON.stringify(data, null, 2) + '</code>');
            },
            401: function (data) {
                deleteSession();
                let error = JSON.parse('{"error":"invalid_request", "error_description":"Unknown user! Choose Authentication from the upper menu to authenticate"}');
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