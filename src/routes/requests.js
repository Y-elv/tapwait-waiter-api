
/**
 * @swagger
 * components:
 *   schemas:
 *     WaiterRequest:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
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
 *     summary: List waiter requests
 *     parameters:
 *       - in: query
 *         name: restaurantId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, accepted]
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
 *           format: uuid
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
const { randomUUID } = require("node:crypto");

const router = express.Router();

// Temporary storage for development.
// Requests will be lost when the server restarts.
const requests = [];

router.post("/", (req, res) => {
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

  const request = {
    id: randomUUID(),
    restaurantId: restaurantId.trim(),
    tableNumber: String(tableNumber).trim(),
    status: "pending",
    waiterId: null,
    waiterName: null,
    createdAt: new Date().toISOString(),
  };

  requests.push(request);

  console.log("New waiter request:", request.id);

  return res.status(201).json({
    success: true,
    message: "Waiter request created.",
    request,
  });
});

router.get("/", (req, res) => {
  const { restaurantId, status } = req.query;

  let results = [...requests];

  if (restaurantId) {
    results = results.filter(
      (item) => item.restaurantId === restaurantId
    );
  }

  if (status) {
    results = results.filter((item) => item.status === status);
  }

  return res.json({
    success: true,
    count: results.length,
    requests: results,
  });
});

router.post("/:id/accept", (req, res) => {
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

  const request = requests.find(
    (item) => item.id === req.params.id
  );

  if (!request) {
    return res.status(404).json({
      success: false,
      message: "Waiter request not found.",
    });
  }

  if (request.status !== "pending") {
    return res.status(409).json({
      success: false,
      message: "This request has already been accepted.",
    });
  }

  request.status = "accepted";
  request.waiterId = waiterId.trim();
  request.waiterName = waiterName.trim();
  request.acceptedAt = new Date().toISOString();

  return res.json({
    success: true,
    message: `${request.waiterName} accepted the request.`,
    request,
  });
});

module.exports = router;
