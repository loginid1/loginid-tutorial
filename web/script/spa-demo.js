var userJwt="";
if (location.href.indexOf('#') >= 0) {
    userJwt = window.location.hash.substr(1).split('=')[1];
}

async function registerUser(dw) {
    try {
        let result = await dw.registerWithFido2(document.getElementById('idSignInName').value);
        postMsg("/users", "credential="+result.jwt);
        document.getElementById('divResponses').innerHTML = "<strong>Thanks for registering, " + result.user.username + "!</strong>"
    } catch (err) {
        document.getElementById('divResponses').innerHTML = "<strong>" + err.message + "</strong>"
    }
}

async function signInUser(dw) {
    let result;
    let username = document.getElementById('idSignInName').value;
    try {
        result = await dw.authenticateWithFido2(username);
        postMsg("/users", "credential="+result.jwt);
        let msg = "<strong>Thanks for authenticating, " + result.user.username + "!</strong>"
        msg = msg + "<p>Click <a href='http://localhost#jwt=" + result.jwt + "'>here</a> to get cat-fatcs!</p>"
        document.getElementById('divResponses').innerHTML = msg;
    } catch (err) {
        if ("user_not_found" === err.code) {
            document.getElementById('divResponses').innerHTML =
                "<strong>You have not been registered yet, would you like to do that now?</strong>" +
                "<button type=\"button\" onclick=\"return registerUser(dw)\">Yes, Register</button>"
        }
    }
}

function directCall(targetUrl) {
    getMsg(targetUrl, null);
}

function protectedCall(targetUrl) {
    getMsg(targetUrl, userJwt);
}

function postMsg(targetUrl, msg) {
    $.ajax({
        type: 'POST',
        url: 'http://localhost:8080' + targetUrl,
        data: msg,
        dataType: 'json',
        contentType: 'application/x-www-form-urlencoded',
        async: false,
        success: function (data) {
            alert(JSON.stringify(data));
        },
        error: function (data) {
            alert(JSON.stringify(data));
        }
    });
}

function getMsg(targetUrl, credential) {
    $.ajax({
        type: 'GET',
        url: targetUrl,
        headers: {"Authorization": "Bearer " + credential},
        dataType: 'json',
        async: false,
        statusCode: {
            200: function (data) {
                printFlowResponse('Success!<br/>This is the service response details:', getPostMsgResponse(data));
            },
            401: function (data) {
                printFlowResponse('Authentication error!<br/>A credential is missing. Details :', getLoginMsgResponse());
            },
            404: function (data) {
                printFlowResponse('Service not found!<br/>Did you deploy kong_config.yml? Details :', getPostMsgResponse(data));
            }
        },
        error: function (data) {
            printFlowResponse('Error!<br/>Something went wrong!:', getPostMsgResponse(data));
        }
    });
}

function getPostMsgResponse(data) {
    return '<code class="language-json">' + JSON.stringify(data, null, 2) + '</code>';
}

function getLoginMsgResponse() {
    window.location = '../authenticate.html';
}

function printFlowResponse(title, output) {
    document.getElementById('divResponse').innerHTML = '<h3>' + title + '</h3><pre>' + output + '</pre>';
    Prism.highlightAll(false, null);
}