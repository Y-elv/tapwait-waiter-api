const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger");
const requestsRouter = require("./routes/requests");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use("/api/requests", requestsRouter);

app.get("/", (req, res) => {
  res.send("TapWait API. Interactive documentation is available at /api-docs.");
});

app.listen(PORT, () => {
  console.log("--------------------------------");
  console.log("🚀 Server started successfully!");
  console.log(`🌐 Documentation Api: http://localhost:${PORT}/api-docs`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log("--------------------------------");
});