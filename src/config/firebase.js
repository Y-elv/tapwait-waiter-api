
const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const path = require("node:path");

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  );
} else {
  serviceAccount = require(path.join(
    __dirname,
    "..",
    "..",
    "private",
    "firebase-service-account.json"
  ));
}

const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: cert(serviceAccount),
      });

const messaging = getMessaging(app);

console.log("Firebase Admin initialized successfully.");

module.exports = { app, messaging };
