const express = require("express");
const metrics = require("./metrics");
const { authRouter, setAuthUser } = require("./routes/authRouter.js");
const orderRouter = require("./routes/orderRouter.js");
const franchiseRouter = require("./routes/franchiseRouter.js");
const version = require("./version.json");
const config = require("./config.js");
const logger = require("./logger");
const cors = require("cors");

const app = express();
const corsOptions = {
  origin: "https://pizza.hudson-stohl.click",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions)); // Move this to the top before other middleware

// Explicitly handle preflight requests
app.options("*", cors(corsOptions));

app.use(express.json());
app.use(setAuthUser);
app.use(logger.httpLogger);

const apiRouter = express.Router();
app.use("/api", apiRouter);

apiRouter.use("/auth", metrics.trackMethods("/auth"), authRouter);
apiRouter.use("/order", metrics.trackMethods("/order"), orderRouter);
apiRouter.use(
  "/franchise",
  metrics.trackMethods("/franchise"),
  franchiseRouter
);

apiRouter.use("/docs", (req, res) => {
  res.json({
    version: version.version,
    endpoints: [
      ...authRouter.endpoints,
      ...orderRouter.endpoints,
      ...franchiseRouter.endpoints,
    ],
    config: { factory: config.factory.url, db: config.db.connection.host },
  });
});

app.get("/", metrics.trackMethods("/"), (req, res) => {
  res.json({
    message: "welcome to JWT Pizza",
    version: version.version,
  });
});

app.use("*", (req, res) => {
  res.status(404).json({
    message: "unknown endpoint",
  });
});

// Default error handler for all exceptions and errors.
app.use((err, req, res, next) => {
  logger.log("error", "http", { message: err.message, stack: err.stack });
  res
    .status(err.statusCode ?? 500)
    .json({ message: err.message, stack: err.stack });
  next();
});

module.exports = app;
