
const mongoose = require("mongoose");

const deviceNotificationSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    deviceName: {
      type: String,
      required: true,
      trim: true,
    },
    sourceApp: {
      type: String,
      required: true,
      trim: true,
    },
    packageName: {
      type: String,
      trim: true,
    },
    title: {
      type: String,
      default: "",
      maxlength: 200,
    },
    content: {
      type: String,
      default: "",
      maxlength: 2000,
    },
    notificationKey: {
      type: String,
      required: true,
    },
    postedAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

deviceNotificationSchema.index(
  { deviceId: 1, notificationKey: 1 },
  { unique: true }
);

deviceNotificationSchema.index({ deviceId: 1, postedAt: -1 });

module.exports = mongoose.model(
  "DeviceNotification",
  deviceNotificationSchema
);
