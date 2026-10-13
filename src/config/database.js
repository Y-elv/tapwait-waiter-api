const mongoose = require("mongoose");

async function connectDatabase() {
  const mongoUrl = process.env.Mongdb_url;

  if (!mongoUrl) {
    throw new Error("Mongdb_url is not configured.");
  }

  await mongoose.connect(mongoUrl);
}

module.exports = connectDatabase;
