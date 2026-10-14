/**
 * @swagger
 * tags:
 *   name: Devices
 *   description: Waiter device registration for push notifications
 */

/**
 * @swagger
 * /api/devices/register:
 *   post:
 *     summary: Register a waiter's Android device
 *     description: Saves the device's Firebase Cloud Messaging (FCM) token so the API can send waiter request notifications to that device.
 *     tags: [Devices]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - restaurantId
 *               - fcmToken
 *             properties:
 *               restaurantId:
 *                 type: string
 *                 example: restaurant-006
 *               waiterId:
 *                 type: string
 *                 nullable: true
 *                 example: waiter-001
 *               fcmToken:
 *                 type: string
 *                 description: Firebase Cloud Messaging registration token from the Android app
 *                 example: YOUR_FCM_TOKEN
 *               platform:
 *                 type: string
 *                 enum: [android]
 *                 default: android
 *     responses:
 *       201:
 *         description: Device registered successfully
 *       400:
 *         description: Missing or invalid restaurantId or fcmToken
 *       500:
 *         description: Failed to register the device
 */

const express = require("express");
const WaiterDevice = require("../models/WaiterDevice");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { restaurantId, waiterId, fcmToken } = req.body || {};

    if (
      typeof restaurantId !== "string" ||
      !restaurantId.trim() ||
      typeof fcmToken !== "string" ||
      !fcmToken.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "restaurantId and fcmToken are required.",
      });
    }

    const device = await WaiterDevice.findOneAndUpdate(
      { fcmToken: fcmToken.trim() },
      {
        $set: {
          restaurantId: restaurantId.trim(),
          waiterId:
            typeof waiterId === "string" && waiterId.trim()
              ? waiterId.trim()
              : null,
          platform: "android",
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Waiter device registered.",
      deviceId: device.id,
    });
  } catch (error) {
    console.error("Failed to register waiter device:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to register waiter device.",
    });
  }
});

module.exports = router;
