const express = require("express");
const { LoginId, LoginIdManagement } = require("@loginid/node-sdk");
const { validateSession } = require("../middleware/user");

const webId = process.env.WEB_CLIENT_ID;
const managementId = process.env.MANAGEMENT_CLIENT_ID;
const privateKey = process.env.PRIVATE_KEY.replace(/\\n/g, "\n");
const baseUrl = process.env.BASE_URL;

const loginid = new LoginId(webId, privateKey, baseUrl);
const management = new LoginIdManagement(managementId, privateKey, baseUrl);

const router = express.Router();

router.post("/tx/create", validateSession, async (req, res) => {
  const { tx_payload: txPayload } = req.body;
  const { username } = req.session;

  if (!txPayload) {
    return res.status(422).json({ message: "No payload received" });
  }

  try {
    const result = await loginid.createTx(txPayload, username);
    return res.status(201).json({ id: result });
  } catch (e) {
    console.log(e);
    return res.status(400).json({ message: e.message });
  }
});

router.post("/tx/verify", validateSession, async (req, res) => {
  const { jwt } = req.body;
  const { username } = req.session;

  if (!jwt) {
    return res.status(422).json({ message: "No jwt received" });
  }

  try {
    const result = await loginid.verifyToken(jwt, username);
    return res.status(200).json({ isValid: result });
  } catch (e) {
    console.log(e);
    return res.status(400).json({ message: e.message });
  }
});

router.post("/codes/:authentication/generate", async (req, res) => {
  const { username } = req.body;
  const { authentication } = req.params;
  const type = "short";
  const authorize = false;
  const purpose =
    authentication === "add"
      ? "add_credential"
      : authentication === "push"
      ? "temporary_authentication"
      : "";

  if (!purpose) {
    return res.status(422).json({ message: "No purpose found" });
  }

  if (!username) {
    return res.status(422).json({ message: "No username received" });
  }

  try {
    const id = await management.getUserId(username);

    const { code } = await management.generateCode(
      id,
      type,
      purpose,
      authorize
    );
    return res.status(201).json({ code });
  } catch (e) {
    console.log(e);
    return res.status(400).json({ message: e.message });
  }
});

router.post("/codes/wait", async (req, res) => {
  const { username, code } = req.body;
  const type = "short";

  if (!username) {
    return res.status(422).json({ message: "No username received" });
  }

  try {
    const { user } = await management.waitCode(username, code, type);
    //you can pull user from database instead
    req.session.user = user;
    return res.status(204).end();
  } catch (e) {
    console.log(e);
    return res.status(400).json({ message: e.message });
  }
});

router.post("/codes/:authentication/authorize", async (req, res) => {
  const { username, code } = req.body;
  const { authentication } = req.params;
  const type = "short";
  const purpose =
    authentication === "add"
      ? "add_credential"
      : authentication === "push"
      ? "temporary_authentication"
      : "";

  if (!username) {
    return res.status(422).json({ message: "No username received" });
  }

  try {
    //can be retrieved from database instead
    const id = await management.getUserId(username);
    await management.authorizeCode(id, code, type, purpose);
    return res.status(204).end();
  } catch (e) {
    console.log(e);
    return res.status(400).json({ message: e.message });
  }
});

router.post("/tokens/create", async (req, res) => {
  try {
    const { type, username, tx_payload: txPayload } = req.body;

    let serviceToken;
    if (txPayload) {
      serviceToken = loginid.generateTxAuthToken(txPayload, username);
    } else {
      serviceToken = loginid.generateServiceToken(type, "ES256", username);
    }

    return res.status(200).json({ service_token: serviceToken });
  } catch (e) {
    console.log(e);
    return res.status(400).json({ message: "Creating service token failed" });
  }
});

module.exports = router;
