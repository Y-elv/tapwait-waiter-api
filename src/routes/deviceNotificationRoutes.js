
const express = require("express");
const WaiterDevice = require("../models/WaiterDevice");
const DeviceNotification = require("../models/DeviceNotification");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Device Notifications
 *   description: Notification history submitted by registered Android devices
 */

/**
 * @swagger
 * /api/device-notifications:
 *   post:
 *     summary: Record a notification from a registered device
 *     tags: [Device Notifications]
 *     description: Stores notification metadata and an explicitly enabled preview. Protect this endpoint with device authentication before production use.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceId
 *               - deviceName
 *               - sourceApp
 *               - notificationKey
 *               - postedAt
 *             properties:
 *               deviceId:
 *                 type: string
 *                 example: device-001
 *               deviceName:
 *                 type: string
 *                 example: Waiter Phone 1
 *               sourceApp:
 *                 type: string
 *                 example: WhatsApp
 *               packageName:
 *                 type: string
 *                 example: com.whatsapp
 *               title:
 *                 type: string
 *                 example: New message
 *               content:
 *                 type: string
 *                 example: Notification preview enabled by device owner
 *               notificationKey:
 *                 type: string
 *                 example: stable-notification-id
 *               postedAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Notification recorded
 *       400:
 *         description: Invalid request
 *       403:
 *         description: Device not registered
 *
 *   get:
 *     summary: Get notification history for a registered device
 *     tags: [Device Notifications]
 *     parameters:
 *       - in: query
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Notification history
 */
router.post("/", async (req, res) => {
  try {
    const {
      deviceId,
      deviceName,
      sourceApp,
      packageName,
      title,
      content,
      notificationKey,
      postedAt,
    } = req.body || {};

    if (
      !deviceId ||
      !deviceName ||
      !sourceApp ||
      !notificationKey ||
      !postedAt ||
      Number.isNaN(Date.parse(postedAt))
    ) {
      return res.status(400).json({
        success: false,
        message: "Required notification fields are missing or invalid.",
      });
    }

    const device = await WaiterDevice.findById(deviceId);

    if (!device) {
      return res.status(403).json({
        success: false,
        message: "Device is not registered.",
      });
    }

    const record = await DeviceNotification.findOneAndUpdate(
      { deviceId, notificationKey },
      {
        $set: {
          deviceName,
          sourceApp,
          packageName,
          title,
          content,
          postedAt: new Date(postedAt),
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
      notification: record,
    });
  } catch (error) {
    console.error("Notification recording failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to record notification.",
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const { deviceId } = req.query;
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 50, 1),
      100
    );

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: "deviceId is required.",
      });
    }

    const device = await WaiterDevice.findById(deviceId);

    if (!device) {
      return res.status(403).json({
        success: false,
        message: "Device is not registered.",
      });
    }

    const notifications = await DeviceNotification.find({ deviceId })
      .sort({ postedAt: -1 })
      .limit(limit)
      .lean();

    return res.json({
      success: true,
      count: notifications.length,
      notifications: notifications.map((n) => ({
        id: n._id.toString(),
        deviceName: n.deviceName,
        sourceApp: n.sourceApp,
        title: n.title,
        content: n.content,
        postedAt: n.postedAt,
      })),
    });
  } catch (error) {
    console.error("Notification history failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve notification history.",
    });
  }
});

module.exports = router;
