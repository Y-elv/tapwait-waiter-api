
const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const path = require("node:path");

const serviceAccountPath = path.join(
  __dirname,
  "..",
  "..",
  "private",
  "firebase-service-account.json"
);

const serviceAccount = require(serviceAccountPath);

const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: cert(serviceAccount),
      });

const messaging = getMessaging(app);

console.log("Firebase Admin initialized successfully.");

module.exports = { app, messaging };
