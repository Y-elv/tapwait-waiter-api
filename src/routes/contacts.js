
const express = require("express");
const mongoose = require("mongoose");
const WaiterDevice = require("../models/WaiterDevice");
const DeviceContact = require("../models/DeviceContact");

const router = express.Router();

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * @swagger
 * tags:
 *   name: Device Contacts
 *   description: Contacts synced from registered Android devices
 */

/**
 * @swagger
 * /api/contacts/sync:
 *   post:
 *     summary: Sync device contacts
 *     tags: [Device Contacts]
 *     description: Upload up to 1000 contacts per request. Contacts are inserted or updated using deviceId and localContactId.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceId
 *               - deviceName
 *               - contacts
 *             properties:
 *               deviceId:
 *                 type: string
 *                 example: device-001
 *               deviceName:
 *                 type: string
 *                 example: Waiter Phone 1
 *               contacts:
 *                 type: array
 *                 maxItems: 1000
 *                 items:
 *                   type: object
 *                   required:
 *                     - localContactId
 *                   properties:
 *                     localContactId:
 *                       type: string
 *                       example: "123"
 *                     displayName:
 *                       type: string
 *                       example: Jane Doe
 *                     phoneNumbers:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["+250788123456"]
 *                     emails:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["jane@example.com"]
 *     responses:
 *       200:
 *         description: Contacts synced successfully
 *       400:
 *         description: Invalid request or contact data
 *       403:
 *         description: Device is not registered
 *       413:
 *         description: Request contains too many contacts
 *       500:
 *         description: Failed to sync contacts
 *
 * /api/contacts:
 *   get:
 *     summary: Retrieve and filter device contacts
 *     tags: [Device Contacts]
 *     parameters:
 *       - in: query
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *         example: device-001
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search contact names, phone numbers, or emails
 *         example: Jane
 *       - in: query
 *         name: hasPhone
 *         schema:
 *           type: boolean
 *         description: Filter contacts by presence of phone numbers
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *     responses:
 *       200:
 *         description: Contacts retrieved successfully
 *       400:
 *         description: deviceId is missing
 *       403:
 *         description: Device is not registered
 *       500:
 *         description: Failed to retrieve contacts
 *
 * /api/contacts/{contactId}:
 *   delete:
 *     summary: Delete a synced contact
 *     tags: [Device Contacts]
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB contact document ID
 *       - in: query
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Registered device ID
 *     responses:
 *       200:
 *         description: Contact deleted successfully
 *       400:
 *         description: Invalid contact ID or missing deviceId
 *       403:
 *         description: Device is not registered
 *       404:
 *         description: Contact not found for this device
 *       500:
 *         description: Failed to delete contact
 */

/**
 * POST /api/contacts/sync
 */
router.post("/sync", async (req, res) => {
  try {
    const { deviceId, deviceName, contacts } = req.body || {};

    if (
      typeof deviceId !== "string" ||
      !deviceId.trim() ||
      typeof deviceName !== "string" ||
      !deviceName.trim() ||
      !Array.isArray(contacts)
    ) {
      return res.status(400).json({
        success: false,
        message: "deviceId, deviceName, and contacts[] are required.",
      });
    }

    if (contacts.length > 1000) {
      return res.status(413).json({
        success: false,
        message: "Maximum 1000 contacts per request. Use batches.",
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

    const operations = [];
    const seenIds = new Set();

    for (const contact of contacts) {
      if (
        !contact ||
        typeof contact.localContactId !== "string" ||
        !contact.localContactId.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Every contact needs a localContactId.",
        });
      }

      const localContactId = contact.localContactId.trim();

      if (seenIds.has(localContactId)) {
        return res.status(400).json({
          success: false,
          message: "Duplicate localContactId in the same request.",
        });
      }

      seenIds.add(localContactId);

      const phoneNumbers = contact.phoneNumbers ?? [];
      const emails = contact.emails ?? [];

      if (
        !Array.isArray(phoneNumbers) ||
        !Array.isArray(emails) ||
        !phoneNumbers.every((value) => typeof value === "string") ||
        !emails.every((value) => typeof value === "string")
      ) {
        return res.status(400).json({
          success: false,
          message: "phoneNumbers and emails must be arrays of strings.",
        });
      }

      if (
        phoneNumbers.some((value) => value.length > 100) ||
        emails.some((value) => value.length > 254)
      ) {
        return res.status(400).json({
          success: false,
          message: "A phone number or email address is too long.",
        });
      }

      operations.push({
        updateOne: {
          filter: {
            deviceId: normalizedDeviceId,
            localContactId,
          },
          update: {
            $set: {
              deviceName: deviceName.trim(),
              displayName:
                typeof contact.displayName === "string"
                  ? contact.displayName.trim().slice(0, 200)
                  : "",
              phoneNumbers: [
                ...new Set(
                  phoneNumbers.map((value) => value.trim()).filter(Boolean)
                ),
              ],
              emails: [
                ...new Set(
                  emails.map((value) => value.trim()).filter(Boolean)
                ),
              ],
              syncedAt: new Date(),
            },
          },
          upsert: true,
        },
      });
    }

    const result = operations.length
      ? await DeviceContact.bulkWrite(operations, { ordered: true })
      : { upsertedCount: 0, modifiedCount: 0 };

    return res.status(200).json({
      success: true,
      message: "Contacts synced successfully.",
      received: contacts.length,
      inserted: result.upsertedCount || 0,
      updated: result.modifiedCount || 0,
    });
  } catch (error) {
    console.error("Contact sync failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to sync contacts.",
    });
  }
});

/**
 * GET /api/contacts
 */
router.get("/", async (req, res) => {
  try {
    const { deviceId, search, hasPhone } = req.query;

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

    if (typeof search === "string" && search.trim()) {
      const pattern = new RegExp(escapeRegex(search.trim()), "i");

      filter.$or = [
        { displayName: pattern },
        { phoneNumbers: pattern },
        { emails: pattern },
      ];
    }

    if (hasPhone === "true") {
      filter.phoneNumbers = { $exists: true, $ne: [] };
    } else if (hasPhone === "false") {
      filter.phoneNumbers = { $size: 0 };
    }

    const [contacts, total] = await Promise.all([
      DeviceContact.find(filter)
        .sort({ displayName: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      DeviceContact.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      count: contacts.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      contacts: contacts.map((contact) => ({
        id: contact._id.toString(),
        localContactId: contact.localContactId,
        deviceId: contact.deviceId,
        deviceName: contact.deviceName,
        displayName: contact.displayName,
        phoneNumbers: contact.phoneNumbers,
        emails: contact.emails,
        syncedAt: contact.syncedAt,
      })),
    });
  } catch (error) {
    console.error("Contact retrieval failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve contacts.",
    });
  }
});

/**
 * DELETE /api/contacts/:contactId
 */
router.delete("/:contactId", async (req, res) => {
  try {
    const { deviceId } = req.query;

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

    if (!mongoose.isValidObjectId(req.params.contactId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid contact ID.",
      });
    }

    const deleted = await DeviceContact.findOneAndDelete({
      _id: req.params.contactId,
      deviceId: normalizedDeviceId,
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Contact not found for this device.",
      });
    }

    return res.json({
      success: true,
      message: "Contact deleted.",
    });
  } catch (error) {
    console.error("Contact deletion failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to delete contact.",
    });
  }
});

module.exports = router;