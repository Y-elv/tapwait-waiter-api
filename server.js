const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Node.js Express server is running!");
});

app.listen(PORT, () => {
  console.log("--------------------------------");
  console.log("🚀 Server started successfully!");
  console.log(`🌐 Port: ${PORT}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log("--------------------------------");
});