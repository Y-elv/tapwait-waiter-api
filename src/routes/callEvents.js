
const express = require("express");
const WaiterDevice = require("../models/WaiterDevice");
const CallEvent = require("../models/CallEvent");

const router = express.Router();

const CALL_TYPES = [
  "incoming",
  "missed",
  "outgoing",
  "rejected",
  "unknown",
];

/**
 * POST /api/call-events
 * Record an event detected by the Android app.
 */
router.post("/", async (req, res) => {
  try {
    const {
      deviceId,
      deviceName,
      eventKey,
      type,
      phoneNumber,
      contactName,
      startedAt,
      durationSeconds,
      source,
    } = req.body || {};

    if (
      typeof deviceId !== "string" ||
      !deviceId.trim() ||
      typeof deviceName !== "string" ||
      !deviceName.trim() ||
      typeof eventKey !== "string" ||
      !eventKey.trim() ||
      !CALL_TYPES.includes(type) ||
      !startedAt ||
      Number.isNaN(Date.parse(startedAt))
    ) {
      return res.status(400).json({
        success: false,
        message:
          "deviceId, deviceName, eventKey, valid type, and valid startedAt are required.",
      });
    }

    const duration = durationSeconds ?? 0;

    if (
      !Number.isInteger(duration) ||
      duration < 0 ||
      duration > 60 * 60 * 24
    ) {
      return res.status(400).json({
        success: false,
        message: "durationSeconds must be a valid non-negative integer.",
      });
    }

    if (
      source !== undefined &&
      !["notification", "call_log", "other"].includes(source)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid event source.",
      });
    }

    const device = await WaiterDevice.findById(deviceId.trim());

    if (!device) {
      return res.status(403).json({
        success: false,
        message: "Device is not registered.",
      });
    }

    const event = await CallEvent.findOneAndUpdate(
      {
        deviceId: deviceId.trim(),
        eventKey: eventKey.trim(),
      },
      {
        $set: {
          deviceName: deviceName.trim(),
          type,
          phoneNumber:
            typeof phoneNumber === "string"
              ? phoneNumber.trim().slice(0, 50)
              : "",
          contactName:
            typeof contactName === "string"
              ? contactName.trim().slice(0, 200)
              : "",
          startedAt: new Date(startedAt),
          durationSeconds: duration,
          source: source || "notification",
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(201).json({
      success: true,
      event,
    });
  } catch (error) {
    console.error("Call event recording failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to record call event.",
    });
  }
});

/**
 * GET /api/call-events?deviceId=...
 * Optional filters: type, phone, from, to, limit, page
 */
router.get("/", async (req, res) => {
  try {
    const { deviceId, type, phone, from, to } = req.query;
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 50, 1),
      100
    );
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

    if (typeof deviceId !== "string" || !deviceId.trim()) {
      return res.status(400).json({
        success: false,
        message: "deviceId is required.",
      });
    }

    const device = await WaiterDevice.findById(deviceId.trim());

    if (!device) {
      return res.status(403).json({
        success: false,
        message: "Device is not registered.",
      });
    }

    const filter = { deviceId: deviceId.trim() };

    if (type !== undefined) {
      if (typeof type !== "string" || !CALL_TYPES.includes(type)) {
        return res.status(400).json({
          success: false,
          message: `type must be one of: ${CALL_TYPES.join(", ")}.`,
        });
      }
      filter.type = type;
    }

    if (typeof phone === "string" && phone.trim()) {
      filter.phoneNumber = {
        $regex: phone.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        $options: "i",
      };
    }

    if (from || to) {
      filter.startedAt = {};

      if (from) {
        const fromDate = new Date(from);
        if (Number.isNaN(fromDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid from date.",
          });
        }
        filter.startedAt.$gte = fromDate;
      }

      if (to) {
        const toDate = new Date(to);
        if (Number.isNaN(toDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid to date.",
          });
        }
        filter.startedAt.$lte = toDate;
      }
    }

    const [events, total] = await Promise.all([
      CallEvent.find(filter)
        .sort({ startedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      CallEvent.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      count: events.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      events: events.map((event) => ({
        id: event._id.toString(),
        deviceId: event.deviceId,
        deviceName: event.deviceName,
        eventKey: event.eventKey,
        type: event.type,
        phoneNumber: event.phoneNumber,
        contactName: event.contactName,
        startedAt: event.startedAt,
        durationSeconds: event.durationSeconds,
        source: event.source,
      })),
    });
  } catch (error) {
    console.error("Call event retrieval failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve call events.",
    });
  }
});

module.exports = router;
