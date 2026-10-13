const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Request",
      required: true,
      unique: true,
    },
    restaurantId: {
      type: String,
      required: true,
      trim: true,
    },
    tableNumber: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted"],
      required: true,
    },
    type: {
      type: String,
      enum: ["new_waiter_request"],
      required: true,
      default: "new_waiter_request",
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform(_document, value) {
        value.id = value._id.toString();
        value.requestId = value.requestId.toString();
        delete value._id;
        delete value.__v;
        return value;
      },
    },
  }
);

module.exports = mongoose.model("Notification", notificationSchema);
