
/**
 * @swagger
 * components:
 *   schemas:
 *     WaiterRequest:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: objectId
 *         restaurantId:
 *           type: string
 *         tableNumber:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, accepted]
 *         waiterId:
 *           type: string
 *           nullable: true
 *         waiterName:
 *           type: string
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         acceptedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *
 * /api/requests:
 *   post:
 *     tags: [Waiter Requests]
 *     summary: Customer calls a waiter
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [restaurantId, tableNumber]
 *             properties:
 *               restaurantId:
 *                 type: string
 *                 example: restaurant-001
 *               tableNumber:
 *                 type: string
 *                 example: "8"
 *     responses:
 *       "201":
 *         description: Waiter request created
 *       "400":
 *         description: Invalid request body
 *   get:
 *     tags: [Waiter Requests]
 *     summary: List waiter requests filtered by restaurant, table, and status
 *     parameters:
 *       - in: query
 *         name: restaurantId
 *         schema:
 *           type: string
 *         description: Filter requests by restaurant ID.
 *       - in: query
 *         name: tableNumber
 *         schema:
 *           type: string
 *         description: Filter requests by table number.
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, accepted]
 *         description: Filter requests by status.
 *     responses:
 *       "200":
 *         description: Requests returned
 *
 * /api/requests/{id}/accept:
 *   post:
 *     tags: [Waiter Requests]
 *     summary: Accept a waiter request
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [waiterId, waiterName]
 *             properties:
 *               waiterId:
 *                 type: string
 *                 example: waiter-001
 *               waiterName:
 *                 type: string
 *                 example: Keza
 *     responses:
 *       "200":
 *         description: Request accepted
 *       "404":
 *         description: Request not found
 *       "409":
 *         description: Request already accepted
 */


const express = require("express");
const mongoose = require("mongoose");
const Request = require("../models/Request");
const Notification = require("../models/Notification");

const router = express.Router();

router.post("/", async (req, res) => {
  const { restaurantId, tableNumber } = req.body || {};

  if (
    typeof restaurantId !== "string" ||
    !restaurantId.trim() ||
    (typeof tableNumber !== "string" &&
      typeof tableNumber !== "number") ||
    String(tableNumber).trim() === ""
  ) {
    return res.status(400).json({
      success: false,
      message: "restaurantId and tableNumber are required.",
    });
  }

  const request = await Request.create({
    restaurantId: restaurantId.trim(),
    tableNumber: String(tableNumber).trim(),
  });

  let savedNotification;
  try {
    savedNotification = await Notification.create({
      requestId: request._id,
      restaurantId: request.restaurantId,
      tableNumber: request.tableNumber,
      status: request.status,
    });
  } catch (error) {
    console.error(
      `Failed to save notification for waiter request ${request.id}:`,
      error
    );
    return res.status(500).json({
      success: false,
      message: "The request was created, but its notification could not be saved.",
    });
  }

  const notification = {
    id: request.id,
    restaurantId: request.restaurantId,
    tableNumber: request.tableNumber,
    status: request.status,
    createdAt: request.createdAt.toISOString(),
  };

  req.app
    .get("io")
    .to(`restaurant:${request.restaurantId}`)
    .emit("new_waiter_request", notification);

  console.log("New waiter request:", request.id);
  console.log(
    `Saved notification ${savedNotification.id} and notified waiters for restaurant ${request.restaurantId} about request ${request.id}`
  );

  return res.status(201).json({
    success: true,
    message: "Waiter request created.",
    request,
  });
});

router.get("/", async (req, res) => {
  const { restaurantId, tableNumber, status } = req.query;
  const filter = {};

  if (typeof restaurantId === "string") {
    filter.restaurantId = restaurantId.trim();
  }

  if (typeof tableNumber === "string") {
    filter.tableNumber = tableNumber.trim();
  }

  if (typeof status === "string") {
    filter.status = status.trim();
  }

  const results = await Request.find(filter).sort({ createdAt: 1 });

  return res.json({
    success: true,
    count: results.length,
    requests: results,
  });
});

router.post("/:id/accept", async (req, res) => {
  const { waiterId, waiterName } = req.body || {};

  if (
    typeof waiterId !== "string" ||
    !waiterId.trim() ||
    typeof waiterName !== "string" ||
    !waiterName.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "waiterId and waiterName are required.",
    });
  }

  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(404).json({
      success: false,
      message: "Waiter request not found.",
    });
  }

  const request = await Request.findOneAndUpdate(
    { _id: req.params.id, status: "pending" },
    {
      $set: {
        status: "accepted",
        waiterId: waiterId.trim(),
        waiterName: waiterName.trim(),
        acceptedAt: new Date(),
      },
    },
    { returnDocument: "after", runValidators: true }
  );

  if (!request) {
    const existingRequest = await Request.exists({ _id: req.params.id });

    if (!existingRequest) {
      return res.status(404).json({
        success: false,
        message: "Waiter request not found.",
      });
    }

    return res.status(409).json({
      success: false,
      message: "This request has already been accepted.",
    });
  }

  return res.json({
    success: true,
    message: `${request.waiterName} accepted the request.`,
    request,
  });
});

module.exports = router;
