
const mongoose = require("mongoose");

const menuItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 300,
    },
  },
  { _id: false }
);

const menuBoostSchema = new mongoose.Schema(
  {
    // Tapwait restaurant IDs are strings, e.g. restaurant-006.
    restaurantId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },

    menu: {
      type: [menuItemSchema],
      required: true,
      validate: {
        validator: (items) =>
          Array.isArray(items) &&
          items.length >= 1 &&
          items.length <= 50,
        message: "Menu must contain between 1 and 50 items.",
      },
    },

    offer: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    platform: {
      type: String,
      enum: ["whatsapp", "instagram", "facebook"],
      default: "whatsapp",
      required: true,
    },

    tone: {
      type: String,
      enum: ["friendly", "professional", "exciting"],
      default: "friendly",
    },

    generatedContent: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },

    status: {
      type: String,
      enum: ["draft", "approved", "sent", "failed"],
      default: "draft",
      index: true,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    sentAt: {
      type: Date,
      default: null,
    },

    // WhatsApp delivery tracking.
    whatsappMessageId: {
      type: String,
      default: null,
    },

    recipientPhone: {
      type: String,
      default: null,
    },

    sendError: {
      type: String,
      default: null,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

menuBoostSchema.index({
  restaurantId: 1,
  createdAt: -1,
});

module.exports = mongoose.model("MenuBoost", menuBoostSchema);
