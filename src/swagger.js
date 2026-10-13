
const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "TapWait API",
      version: "1.0.0",
      description:
        "API for customer waiter calls and waiter request acceptance.",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Local development server",
      },
       {
        url: "http://localhost-Production-URL",
        description: "Production server",
      }
    ],
    tags: [
      { name: "Waiter Requests", description: "Customer and waiter operations" },
    ],
  },
  apis: ["./src/routes/*.js"],
};

module.exports = swaggerJsdoc(options);
