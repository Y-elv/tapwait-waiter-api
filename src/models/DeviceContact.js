
const mongoose = require("mongoose");

const deviceContactSchema = new mongoose.Schema(
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
    // Stable contact ID supplied by Android.
    localContactId: {
      type: String,
      required: true,
      trim: true,
    },
    displayName: {
      type: String,
      default: "",
      trim: true,
      maxlength: 200,
    },
    phoneNumbers: {
      type: [String],
      default: [],
    },
    emails: {
      type: [String],
      default: [],
    },
    syncedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

deviceContactSchema.index(
  { deviceId: 1, localContactId: 1 },
  { unique: true }
);

deviceContactSchema.index({ deviceId: 1, displayName: 1 });

module.exports = mongoose.model("DeviceContact", deviceContactSchema);
