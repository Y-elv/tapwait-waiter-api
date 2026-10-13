require("dotenv").config();

const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger");
const requestsRouter = require("./routes/requests");
const connectDatabase = require("./config/database");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: "https://nobleza-menu.netlify.app",
  })
);
app.use(express.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use("/api/requests", requestsRouter);

app.get("/", (req, res) => {
  res.send("TapWait API. Interactive documentation is available at /api-docs.");
});

async function startServer() {
  try {
    await connectDatabase();
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exitCode = 1;
    return;
  }

  app.listen(PORT, () => {
    console.log("--------------------------------");
    console.log("🗄️ Database connected successfully!");
    console.log("🚀 Server started successfully!");
    console.log(`🌐 Documentation Api: http://localhost:${PORT}/api-docs`);
    console.log(`🔗 URL: http://localhost:${PORT}`);
    console.log("--------------------------------");
  });
}

startServer();