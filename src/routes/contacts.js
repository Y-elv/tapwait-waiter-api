
const express = require("express");
const WaiterDevice = require("../models/WaiterDevice");
const DeviceContact = require("../models/DeviceContact");

const router = express.Router();

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * POST /api/contacts/sync
 * Upload contacts from a registered device.
 *
 * Body:
 * {
 *   "deviceId": "...",
 *   "deviceName": "...",
 *   "contacts": [
 *     {
 *       "localContactId": "123",
 *       "displayName": "Jane Doe",
 *       "phoneNumbers": ["+2507..."],
 *       "emails": ["jane@example.com"]
 *     }
 *   ]
 * }
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

    // Keep requests manageable. Upload larger address books in batches.
    if (contacts.length > 1000) {
      return res.status(413).json({
        success: false,
        message: "Maximum 1000 contacts per request. Use batches.",
      });
    }

    const device = await WaiterDevice.findById(deviceId.trim());

    if (!device) {
      return res.status(403).json({
        success: false,
        message: "Device is not registered.",
      });
    }

    const operations = [];

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

      const phoneNumbers = contact.phoneNumbers ?? [];
      const emails = contact.emails ?? [];

      if (
        !Array.isArray(phoneNumbers) ||
        !Array.isArray(emails) ||
        !phoneNumbers.every((v) => typeof v === "string") ||
        !emails.every((v) => typeof v === "string")
      ) {
        return res.status(400).json({
          success: false,
          message: "phoneNumbers and emails must be arrays of strings.",
        });
      }

      operations.push({
        updateOne: {
          filter: {
            deviceId: deviceId.trim(),
            localContactId: contact.localContactId.trim(),
          },
          update: {
            $set: {
              deviceName: deviceName.trim(),
              displayName:
                typeof contact.displayName === "string"
                  ? contact.displayName.trim().slice(0, 200)
                  : "",
              phoneNumbers: [...new Set(phoneNumbers.map((v) => v.trim()).filter(Boolean))],
              emails: [...new Set(emails.map((v) => v.trim()).filter(Boolean))],
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
 * GET /api/contacts?deviceId=...
 * Optional filters:
 * search=Jane
 * hasPhone=true
 * limit=50
 * page=1
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

    const device = await WaiterDevice.findById(deviceId.trim());

    if (!device) {
      return res.status(403).json({
        success: false,
        message: "Device is not registered.",
      });
    }

    const filter = { deviceId: deviceId.trim() };

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
 * DELETE /api/contacts/:contactId?deviceId=...
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

    const device = await WaiterDevice.findById(deviceId.trim());

    if (!device) {
      return res.status(403).json({
        success: false,
        message: "Device is not registered.",
      });
    }

    const deleted = await DeviceContact.findOneAndDelete({
      _id: req.params.contactId,
      deviceId: deviceId.trim(),
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
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid contact ID.",
      });
    }

    console.error("Contact deletion failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to delete contact.",
    });
  }
});

module.exports = router;
