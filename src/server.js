
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
const menuBoostRouter = require("./routes/menuBoost");
const campaignGuardRouter = require("./routes/campaignGuard");
const deviceNotificationRoutes = require("./routes/deviceNotificationRoutes");
const contactsRouter = require("./routes/contacts");
const callEventsRouter = require("./routes/callEvents");

const app = express();
const PORT = process.env.PORT || 3001;
const httpServer = http.createServer(app);

const allowedOrigins = [
  "https://nobleza-menu.netlify.app",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
];

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
  },
});

app.set("io", io);

app.use(
  cors({
    origin: allowedOrigins,
  })
);

app.use(express.json());

// ============================================
// WHATSAPP CLOUD API CONNECTION TEST
// GET /api/whatsapp/status
// ============================================

app.get("/api/whatsapp/status", async (req, res) => {
  const {
    WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID,
    WHATSAPP_API_VERSION,
  } = process.env;

  const missing = [];

  if (!WHATSAPP_ACCESS_TOKEN) {
    missing.push("WHATSAPP_ACCESS_TOKEN");
  }

  if (!WHATSAPP_PHONE_NUMBER_ID) {
    missing.push("WHATSAPP_PHONE_NUMBER_ID");
  }

  if (!WHATSAPP_API_VERSION) {
    missing.push("WHATSAPP_API_VERSION");
  }

  if (missing.length > 0) {
    console.error("WhatsApp configuration is incomplete:", missing);

    return res.status(503).json({
      success: false,
      connected: false,
      message: "WhatsApp Cloud API environment variables are missing.",
      missing,
    });
  }

  try {
    const endpoint =
      `https://graph.facebook.com/${WHATSAPP_API_VERSION}/` +
      `${WHATSAPP_PHONE_NUMBER_ID}` +
      "?fields=id,display_phone_number,verified_name";

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      },
      signal: AbortSignal.timeout(15000),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp connection check failed:", {
        httpStatus: response.status,
        errorCode: data.error?.code,
        error: data.error?.message,
      });

      return res.status(502).json({
        success: false,
        connected: false,
        message: "Meta rejected the WhatsApp API request.",
        error: data.error?.message || "Unknown Meta API error.",
        code: data.error?.code,
      });
    }

    console.log("WhatsApp Cloud API connection verified:", {
      phoneNumberId: data.id,
      displayPhoneNumber: data.display_phone_number,
      verifiedName: data.verified_name,
    });

    return res.status(200).json({
      success: true,
      connected: true,
      message: "WhatsApp Cloud API connection is working.",
      data: {
        phoneNumberId: data.id,
        displayPhoneNumber: data.display_phone_number,
        verifiedName: data.verified_name,
      },
    });
  } catch (error) {
    console.error("WhatsApp API connection error:", error.message);

    return res.status(502).json({
      success: false,
      connected: false,
      message: "Unable to reach the WhatsApp Cloud API.",
    });
  }
});

// ============================================
// WHATSAPP WEBHOOK VERIFICATION
// GET /webhooks/whatsapp
// ============================================

app.get("/webhooks/whatsapp", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (
    mode === "subscribe" &&
    typeof token === "string" &&
    typeof challenge === "string" &&
    verifyToken &&
    token === verifyToken
  ) {
    console.log("WhatsApp webhook verified successfully.");

    return res.status(200).type("text/plain").send(challenge);
  }

  console.warn("WhatsApp webhook verification failed.");

  return res.sendStatus(403);
});

// ============================================
// WHATSAPP WEBHOOK EVENTS
// POST /webhooks/whatsapp
// ============================================

app.post("/webhooks/whatsapp", (req, res) => {
  if (req.body?.object !== "whatsapp_business_account") {
    return res.sendStatus(404);
  }

  // Acknowledge events without logging message contents.
  console.log("WhatsApp webhook event received.");

  return res.sendStatus(200);
});

// ============================================
// EXISTING API ROUTES
// ============================================

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use("/api/requests", requestsRouter);
app.use("/api/devices", devicesRouter);
app.use("/api/menu-boost", menuBoostRouter);
app.use("/api/campaign-guard", campaignGuardRouter);
app.use("/api/device-notifications", deviceNotificationRoutes);
app.use("/api/contacts", contactsRouter);
app.use("/api/call-events", callEventsRouter);

app.get("/", (req, res) => {
  res.send(
    "TapWait API. Interactive documentation is available at /api-docs."
  );
});

// ============================================
// SOCKET.IO CONNECTIONS
// ============================================

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

    if (
      typeof restaurantId !== "string" ||
      !restaurantId.trim()
    ) {
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

      respond({
        success: true,
        restaurantId: normalizedRestaurantId,
      });
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
    console.log(
      `Socket disconnected: ${socket.id} (${reason})`
    );
  });
});

// ============================================
// START SERVER
// ============================================

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
    console.log("Database connected successfully!");
    console.log("TapWait API server started successfully!");
    console.log(`API documentation: http://localhost:${PORT}/api-docs`);
    console.log(`Server URL: http://localhost:${PORT}`);
    console.log(
      `WhatsApp connection test: http://localhost:${PORT}/api/whatsapp/status`
    );
    console.log("--------------------------------");
  });
}

startServer();