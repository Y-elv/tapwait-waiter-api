
const mongoose = require("mongoose");

const waiterDeviceSchema = new mongoose.Schema(
  {
    waiterId: {
      type: String,
      trim: true,
      default: null,
    },
    restaurantId: {
      type: String,
      required: true,
      trim: true,
    },
    fcmToken: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    platform: {
      type: String,
      enum: ["android"],
      default: "android",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("WaiterDevice", waiterDeviceSchema);
