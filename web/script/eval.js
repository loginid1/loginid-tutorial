async function registerUser(dw) {
    try {
        let result = await dw.registerWithFido2(document.getElementById('idSignInName').value);
        postMsg("/users", "credential="+result.jwt);
        document.getElementById('divResponses').innerHTML = "<strong>Thanks for registering, " + result.user.username + "!</strong>"
    } catch (err) {
        document.getElementById('divResponses').innerHTML = "<strong>" + err.message + "</strong>"
        alert(JSON.stringify(err));
    }
}

async function signInUser(dw) {
    let result;
    let username = document.getElementById('idSignInName').value;
    try {
        result = await dw.authenticateWithFido2(username);
        postMsg("/users", "credential="+result.jwt);
        document.getElementById('divResponses').innerHTML = "<strong>Thanks for authenticating, " + result.user.username + "!</strong>"
    } catch (err) {
        if ("user_not_found" === err.code) {
            document.getElementById('divResponses').innerHTML =
                "<strong>You have not been registered yet, would you like to do that now?</strong>" +
                "<button type=\"button\" onclick=\"return registerUser(dw)\">Yes, Register</button>"
        }
    }
}

async function findUser(dw) {
    let username = document.getElementById('idUsername').value;
    try {
        result = await dw.authenticateWithFido2(username);
        postMsg("/users", "credential="+result.jwt);
        document.getElementById('divResponses').innerHTML = "<strong>Thanks for authenticating, " + result.user.username + "!</strong>"
    } catch (err) {
        if ("user_not_found" === err.code) {
            document.getElementById('divResponses').innerHTML =
                "<strong>You have not been registered yet, would you like to do that now?</strong>" +
                "<button type=\"button\" onclick=\"return registerUser(dw, username)\">Yes, Register</button>"
        }
    }
}

function postMsg(targetUrl, msg) {
    $.ajax({
        type: 'POST',
        url: targetUrl,
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

// Cookies code taken from here: https://www.w3schools.com/js/js_cookies.asp

function setCookie(cname, cvalue, exdays) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    let expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
    let name = cname + "=";
    let ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function checkCookie() {
    let user = getCookie("username");
    if (user != "") {
        alert("Welcome again " + user);
    } else {
        user = prompt("Please enter your name:", "");
        if (user != "" && user != null) {
            setCookie("username", user, 365);
        }
    }
}