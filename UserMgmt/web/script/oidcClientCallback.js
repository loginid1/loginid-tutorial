let params = window.location.search.substr(1).split('&');

let code;
let state;
let iss;
let error='&error=invalid_response';
let error_description='&error_description=unexpected+redirect+response'

let counter = 0;
for (let i = 0; i < params.length; i++) {
    // let's not accept too many parameters. There is no reason to expect more than three or four
    if (counter >= 10) {
        code='';
        break;
    }
    let key = params[i].split('=')[0];
    if('code' === key) {
        code = '&'+params[i];
    } else if ('state' === key) {
        state = '&'+params[i];
    } else if ('iss' === key) {
        iss = '&'+params[i];
    } else if ('error' === key) {
        error = '&'+params[i];
    } else if ('error_description' === key) {
        error_description = '&'+params[i];
    }
    counter++;
}
if(code) {
    window.location = 'index.html?callback=success' + code + state + iss;
} else {
    window.location = 'index.html?callback=failure' + error + error_description;
}