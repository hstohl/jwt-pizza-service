const express = require("express");
const metrics = require("./metrics");
const { authRouter, setAuthUser } = require("./routes/authRouter.js");
const orderRouter = require("./routes/orderRouter.js");
const franchiseRouter = require("./routes/franchiseRouter.js");
const version = require("./version.json");
const config = require("./config.js");
const logger = require("./logger");
//const cors = require("cors");

const app = express();
//app.use(cors({ origin: "https://pizza.hudson-stohl.click" }));
app.use(express.json());
app.use(setAuthUser);

//app.options("*", cors());

app.use(logger.httpLogger);

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  next();
});

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
