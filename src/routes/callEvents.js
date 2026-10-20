
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

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * @swagger
 * tags:
 *   name: Call Events
 *   description: Call events detected and submitted by registered Android devices
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CallEvent:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "671a12345678901234567890"
 *         deviceId:
 *           type: string
 *           example: "671a12345678901234567891"
 *         deviceName:
 *           type: string
 *           example: "itel A507LX"
 *         eventKey:
 *           type: string
 *           example: "call-1729435200000-0788123456"
 *         type:
 *           type: string
 *           enum: [incoming, missed, outgoing, rejected, unknown]
 *           example: missed
 *         phoneNumber:
 *           type: string
 *           example: "+250788123456"
 *         contactName:
 *           type: string
 *           example: "Jean Doe"
 *         startedAt:
 *           type: string
 *           format: date-time
 *           example: "2026-10-20T10:30:00.000Z"
 *         durationSeconds:
 *           type: integer
 *           minimum: 0
 *           example: 120
 *         source:
 *           type: string
 *           enum: [notification, call_log, other]
 *           example: notification
 */

/**
 * @swagger
 * /api/call-events:
 *   post:
 *     summary: Record a call event
 *     description: Records an incoming, missed, outgoing, rejected, or unknown call event from a registered Android device. Repeated deviceId and eventKey combinations update the existing event.
 *     tags: [Call Events]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceId
 *               - deviceName
 *               - eventKey
 *               - type
 *               - startedAt
 *             properties:
 *               deviceId:
 *                 type: string
 *                 example: "671a12345678901234567891"
 *               deviceName:
 *                 type: string
 *                 example: "itel A507LX"
 *               eventKey:
 *                 type: string
 *                 example: "call-1729435200000-0788123456"
 *               type:
 *                 type: string
 *                 enum: [incoming, missed, outgoing, rejected, unknown]
 *                 example: missed
 *               phoneNumber:
 *                 type: string
 *                 example: "+250788123456"
 *               contactName:
 *                 type: string
 *                 example: "Jean Doe"
 *               startedAt:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-10-20T10:30:00.000Z"
 *               durationSeconds:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 86400
 *                 default: 0
 *                 example: 120
 *               source:
 *                 type: string
 *                 enum: [notification, call_log, other]
 *                 default: notification
 *     responses:
 *       201:
 *         description: Call event recorded or updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 event:
 *                   $ref: '#/components/schemas/CallEvent'
 *       400:
 *         description: Invalid or missing request fields
 *       403:
 *         description: Device is not registered
 *       500:
 *         description: Failed to record call event
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

    const normalizedDeviceId = deviceId.trim();
    const normalizedEventKey = eventKey.trim();

    const device = await WaiterDevice.findById(normalizedDeviceId);

    if (!device) {
      return res.status(403).json({
        success: false,
        message: "Device is not registered.",
      });
    }

    const event = await CallEvent.findOneAndUpdate(
      {
        deviceId: normalizedDeviceId,
        eventKey: normalizedEventKey,
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
 * @swagger
 * /api/call-events:
 *   get:
 *     summary: Retrieve call events
 *     description: Retrieves call events for a registered device, with optional type, phone-number, date-range, and pagination filters.
 *     tags: [Call Events]
 *     parameters:
 *       - in: query
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ID of the registered device
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [incoming, missed, outgoing, rejected, unknown]
 *         description: Filter by call type
 *       - in: query
 *         name: phone
 *         schema:
 *           type: string
 *         description: Filter by phone number, using a partial match
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Include events starting at or after this date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Include events starting at or before this date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Maximum number of events per page
 *     responses:
 *       200:
 *         description: Call events retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 2
 *                 total:
 *                   type: integer
 *                   example: 15
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 50
 *                 totalPages:
 *                   type: integer
 *                   example: 1
 *                 events:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CallEvent'
 *       400:
 *         description: Missing deviceId or invalid filter parameters
 *       403:
 *         description: Device is not registered
 *       500:
 *         description: Failed to retrieve call events
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

    const normalizedDeviceId = deviceId.trim();

    const device = await WaiterDevice.findById(normalizedDeviceId);

    if (!device) {
      return res.status(403).json({
        success: false,
        message: "Device is not registered.",
      });
    }

    const filter = { deviceId: normalizedDeviceId };

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
        $regex: escapeRegex(phone.trim()),
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
