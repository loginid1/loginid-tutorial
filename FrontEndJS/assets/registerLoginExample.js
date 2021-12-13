/*
 * Elements
 */
const nameInputFido2 = document.getElementById("name-fido2");
const registerBtnFido2 = document.getElementById("register-fido2");
const authenticateBtnFido2 = document.getElementById("authenticate-fido2");
const nameInputPush = document.getElementById("name-push");
const nameInputAdd = document.getElementById("name-add");
const codeInputPush = document.getElementById("code-push");
const codeInputAdd = document.getElementById("code-add");
const pushBtn = document.getElementById("button-push");
const addBtn = document.getElementById("button-add");

const messageElm = document.getElementById("message");

const dataElem = document.querySelector("data");
const baseUrl = dataElem.dataset.baseUrl;
const clientId = dataElem.dataset.clientId;

const webSDK = new web.default(baseUrl, clientId);

const request = async (url, body) => {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (res.status === 204) {
    return {};
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Bad Request");
  }

  return data;
};

const handlerRegisterFido2 = async () => {
  try {
    const username = nameInputFido2.value;
    const { service_token: serviceToken } = await request(
      "/api/tokens/create",
      {
        type: "auth.register",
        username,
      }
    );
    //validate JWT and create session
    const { jwt, user } = await webSDK.registerWithFido2(username, {
      authorization_token: serviceToken,
    });
    await request("/register", { jwt, user });
    window.location.replace("/dashboard");
  } catch (e) {
    console.log(e);
    alert(e.message);
  }
};

const handlerAuthenticateFido2 = async () => {
  try {
    const username = nameInputFido2.value;
    const { service_token: serviceToken } = await request(
      "/api/tokens/create",
      {
        type: "auth.login",
        username,
      }
    );
    //validate JWT and create session
    const { jwt, user } = await webSDK.authenticateWithFido2(username, {
      authorization_token: serviceToken,
    });
    await request("/login", { jwt, user });
    window.location.replace("/dashboard");
  } catch (e) {
    console.log(e);
    alert(e.message);
  }
};

const handlerPushAuth = async () => {
  try {
    const username = nameInputPush.value;
    const code = codeInputPush.value;
    //1. Authenticate user
    const { service_token: serviceToken } = await request(
      "/api/tokens/create",
      {
        type: "auth.login",
        username,
      }
    );
    await webSDK.authenticateWithFido2(username, {
      authorization_token: serviceToken,
    });

    //2 Authorize code
    await request("/api/codes/push/authorize", { username, code });
  } catch (e) {
    console.log(e);
    alert(e.message);
  }
};

const handlerAddAuth = async () => {
  try {
    const username = nameInputAdd.value;
    const code = codeInputAdd.value;
    //1. Authenticate user
    const { service_token: serviceToken } = await request(
      "/api/tokens/create",
      {
        type: "auth.login",
        username,
      }
    );
    await webSDK.authenticateWithFido2(username, {
      authorization_token: serviceToken,
    });

    //2 Authorize code
    await request("/api/codes/add/authorize", { username, code });
    messageElm.textContent = "Code Authorized";
  } catch (e) {
    alert(e.message);
  }
};

registerBtnFido2.addEventListener("click", handlerRegisterFido2);
authenticateBtnFido2.addEventListener("click", handlerAuthenticateFido2);
pushBtn.addEventListener("click", handlerPushAuth);
addBtn.addEventListener("click", handlerAddAuth);
