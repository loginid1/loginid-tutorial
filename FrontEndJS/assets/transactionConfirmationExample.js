const txIdElm = document.getElementById("tx-id");
const txPayloadElm = document.getElementById("tx-payload");
const txCreateBtn = document.getElementById("tx-create");
const txConfirmBtn = document.getElementById("tx-confirm");
const txCreateConfirmBtn = document.getElementById("tx-create-confirm");
const messageElm = document.getElementById("message");

const dataElem = document.querySelector("data");
const baseUrl = dataElem.dataset.baseUrl;
const clientId = dataElem.dataset.clientId;
const username = dataElem.dataset.username;

const webSDK = new web.default(baseUrl, clientId);

const randomString = (length) => {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

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

/*
 * This creates a Transaction ID and displays it on the UI
 */
txCreateBtn.addEventListener("click", async () => {
  const txPayload = txPayloadElm.value;
  if (!txPayload) return;
  messageElm.textContent = "";

  try {
    const { id: txId } = await request("/api/tx/create", {
      tx_payload: txPayload,
    });
    txIdElm.textContent = txId;
  } catch (e) {
    console.log(e);
    alert(e.message);
  }
});

/*
 * This confirms the Transaction ID displayed on the UI
 */
txConfirmBtn.addEventListener("click", async () => {
  const txId = txIdElm.textContent;
  if (!txId) return;
  messageElm.textContent = "";

  try {
    const { jwt } = await webSDK.confirmTransaction(username, txId);
    const { isValid } = await request("/api/tx/verify", { jwt });

    if (isValid) {
      messageElm.textContent = "Transaction Confirmed!";
    } else {
      messageElm.textContent = "Transaction is not valid";
    }

    txPayloadElm.value = "";
    txIdElm.textContent = "";
  } catch (e) {
    console.log(e);
    alert(e.message);
  }
});

/*
 * This does both create and confirm a Transaction at the same time
 */
txCreateConfirmBtn.addEventListener("click", async () => {
  const txPayload = txPayloadElm.value;
  if (!txPayload) return;
  messageElm.textContent = "";

  try {
    const { service_token: serviceToken } = await request(
      "/api/tokens/create",
      { username, tx_payload: txPayload }
    );
    const { jwt } = await webSDK.createAndConfirmTransaction(
      username,
      txPayload,
      { nonce: randomString(16), authorization_token: serviceToken }
    );

    const { isValid } = await request("/api/tx/verify", { jwt });
    if (isValid) {
      messageElm.textContent = "Transaction Confirmed!";
    } else {
      messageElm.textContent = "Transaction is not valid";
    }

    txPayloadElm.value = "";
    txIdElm.textContent = "";
  } catch (e) {
    console.log(e);
    alert(e.message);
  }
});
