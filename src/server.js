require("dotenv").config();

const express = require("express");
const http = require("node:http");
const cors = require("cors");
const { Server } = require("socket.io");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger");
const requestsRouter = require("./routes/requests");
const connectDatabase = require("./config/database");
const devicesRouter = require("./routes/devices");  

const app = express();
const PORT = process.env.PORT || 3000;
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [
      "https://nobleza-menu.netlify.app",
      "http://localhost:3000",
      "http://localhost:5173",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5173",
    ],
  },
});

app.set("io", io);

app.use(
  cors({
    origin: "https://nobleza-menu.netlify.app",
  })
);
app.use(express.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use("/api/requests", requestsRouter);
app.use("/api/devices", devicesRouter);

app.get("/", (req, res) => {
  res.send("TapWait API. Interactive documentation is available at /api-docs.");
});

io.engine.on("connection_error", (error) => {
  console.error("Socket connection error:", error.message);
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join_restaurant", async (restaurantId, acknowledge) => {
    const respond = (result) => {
      if (typeof acknowledge === "function") {
        acknowledge(result);
      } else if (!result.success) {
        socket.emit("socket_error", result);
      }
    };

    if (typeof restaurantId !== "string" || !restaurantId.trim()) {
      respond({
        success: false,
        message: "A non-empty restaurantId is required.",
      });
      return;
    }

    const normalizedRestaurantId = restaurantId.trim();

    try {
      await socket.join(`restaurant:${normalizedRestaurantId}`);
      console.log(
        `Socket ${socket.id} joined restaurant ${normalizedRestaurantId}`
      );
      respond({ success: true, restaurantId: normalizedRestaurantId });
    } catch (error) {
      console.error(
        `Socket ${socket.id} failed to join a restaurant room:`,
        error
      );
      respond({
        success: false,
        message: "Unable to join the restaurant room.",
      });
    }
  });

  socket.on("error", (error) => {
    console.error(`Socket ${socket.id} error:`, error);
  });

  socket.on("disconnect", (reason) => {
    console.log(`Socket disconnected: ${socket.id} (${reason})`);
  });
});

async function startServer() {
  try {
    await connectDatabase();
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exitCode = 1;
    return;
  }

  httpServer.listen(PORT, () => {
    console.log("--------------------------------");
    console.log("🗄️ Database connected successfully!");
    console.log("🚀 Server started successfully!");
    console.log(`🌐 Documentation Api: http://localhost:${PORT}/api-docs`);
    console.log(`🔗 URL: http://localhost:${PORT}`);
    console.log("--------------------------------");
  });
}

startServer();