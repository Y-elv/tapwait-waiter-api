const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema(
  {
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
      default: "pending",
    },
    waiterId: {
      type: String,
      default: null,
      trim: true,
    },
    waiterName: {
      type: String,
      default: null,
      trim: true,
    },
    acceptedAt: Date,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform(_document, value) {
        value.id = value._id.toString();
        delete value._id;
        delete value.__v;
        return value;
      },
    },
  }
);

module.exports = mongoose.model("Request", requestSchema);
