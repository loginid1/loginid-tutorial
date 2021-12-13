const pushMessageElm = document.getElementById("code-push");
const pushUsernameInput = document.getElementById("code-push-username");
const pushBtn = document.getElementById("code-push-button");

const addMessageElm = document.getElementById("code-add");
const addUsernameInput = document.getElementById("code-add-username");
const addCodeBtn = document.getElementById("code-add-button");
const addCredentialBtn = document.getElementById("code-add-credential-button");

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

const handlerPushAuth = async () => {
  const username = pushUsernameInput.value;
  try {
    //1. Create unauthorized code
    const { code } = await request("/api/codes/push/generate", { username });
    pushMessageElm.textContent = code;

    //2. Wait for code to be authorized
    await request("/api/codes/wait", { username, code });
    window.location.replace("/dashboard");
  } catch (e) {
    console.log(e);
    alert(e.message);
  }
};

const handlerAddAuthCode = async () => {
  const username = addUsernameInput.value;
  try {
    //1. Create unauthorized code
    const { code } = await request("/api/codes/add/generate", { username });
    addMessageElm.textContent = code;
  } catch (e) {
    console.log(e);
    alert(e.message);
  }
};

const handlerAddAuth = async () => {
  const username = addUsernameInput.value;
  const code = addMessageElm.textContent;
  try {
    //2. Start add auth process
    const { service_token: serviceToken } = await request(
      "/api/tokens/create",
      {
        type: "credentials.add",
        username,
      }
    );
    const { jwt, user } = await webSDK.addFido2CredentialWithCode(
      username,
      code,
      serviceToken,
      { code_type: "short" }
    );

    await request("/login", { jwt, user });
    window.location.replace("/dashboard");
  } catch (e) {
    console.log(e);
    alert(e.message);
  }
};

pushBtn.addEventListener("click", handlerPushAuth);
addCodeBtn.addEventListener("click", handlerAddAuthCode);
addCredentialBtn.addEventListener("click", handlerAddAuth);
