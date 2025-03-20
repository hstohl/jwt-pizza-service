const config = require("./config");
const os = require("os");

const requests = { GET: 0, POST: 0, PUT: 0, DELETE: 0, ANY: 0 };
let users = 0;
const authAttempts = { success: 0, failure: 0 };
let revenue = 0;
const orders = { success: 0, failure: 0 };

const latency = { GET: [], POST: [], PUT: [], DELETE: [] };

const pizzaLatencies = [];

function trackMethods() {
  return (req, res, next) => {
    const start = process.hrtime();
    res.on("finish", () => {
      if (requests[req.method] !== undefined) {
        requests[req.method]++;
        requests["ANY"]++;
      }
      const duration = process.hrtime(start);
      const timeInMs = duration[0] * 1000 + duration[1] / 1e6;
      if (latency[req.method]) latency[req.method].push(timeInMs);

      if (latency[req.method].length > 100) {
        latency[req.method].shift();
      }
    });
    next();
  };
}

function trackPizzaCreation(fn) {
  return async (...args) => {
    const start = process.hrtime();
    const result = await fn(...args); // Call the actual pizza creation function
    const duration = process.hrtime(start);

    const timeInMs = duration[0] * 1000 + duration[1] / 1e6;
    pizzaLatencies.push(timeInMs);

    if (pizzaLatencies.length > 100) {
      pizzaLatencies.shift();
    }

    return result;
  };
}

function calculateAvgLatency(method) {
  if (!latency[method] || latency[method].length === 0) return 0;
  const total = latency[method].reduce((sum, val) => sum + val, 0);
  return total / latency[method].length;
}

function calculateAvgPizzaLatency() {
  if (pizzaLatencies.length === 0) return 0;
  const total = pizzaLatencies.reduce((sum, val) => sum + val, 0);
  return total / pizzaLatencies.length;
}

function totalLatencyAverage() {
  let total =
    calculateAvgLatency("GET") +
    calculateAvgLatency("POST") +
    calculateAvgLatency("PUT") +
    calculateAvgLatency("DELETE");
  return total / 4;
}

function userAdded() {
  users++;
}

function userRemoved() {
  users--;
}

function trackAuthSuccess() {
  authAttempts.success++;
}

function trackAuthFailure() {
  authAttempts.failure++;
}

function trackBusiness(amount) {
  revenue += amount;
  orders.success++;
}

function trackOrderFailure() {
  orders.failure++;
}

function getCpuUsagePercentage() {
  const cpuUsage = os.loadavg()[0] / os.cpus().length;
  return cpuUsage.toFixed(2) * 100;
}

function getMemoryUsagePercentage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  return memoryUsage.toFixed(2);
}

// This will periodically send metrics to Grafana
// const timer = setInterval(() => {
//   Object.keys(requests).forEach((endpoint) => {
//     sendMetricToGrafana("requests", requests[endpoint], { endpoint });
//   });
// }, 10000);

function sendMetricToGrafana(metricName, metricValue, attributes) {
  attributes = { ...attributes, source: config.metrics.source };

  const metric = {
    resourceMetrics: [
      {
        scopeMetrics: [
          {
            metrics: [
              {
                name: metricName,
                unit: "1",
                sum: {
                  dataPoints: [
                    {
                      asDouble: Number(metricValue),
                      timeUnixNano: Date.now() * 1000000,
                      attributes: [],
                    },
                  ],
                  aggregationTemporality: "AGGREGATION_TEMPORALITY_CUMULATIVE",
                  isMonotonic: true,
                },
              },
            ],
          },
        ],
      },
    ],
  };

  Object.keys(attributes).forEach((key) => {
    metric.resourceMetrics[0].scopeMetrics[0].metrics[0].sum.dataPoints[0].attributes.push(
      {
        key: key,
        value: { stringValue: attributes[key] },
      }
    );
  });

  fetch(`${config.metrics.url}`, {
    method: "POST",
    body: JSON.stringify(metric),
    headers: {
      Authorization: `Bearer ${config.metrics.apiKey}`,
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        console.error("Failed to push metrics data to Grafana");
      } else {
        console.log(`Pushed ${metricName}`);
      }
    })
    .catch((error) => {
      console.error("Error pushing metrics:", error);
    });
}

function sendMetricsPeriodically(period) {
  setInterval(() => {
    try {
      sendMetricToGrafana("cpu_usage", getCpuUsagePercentage(), {});

      sendMetricToGrafana("memory_usage", getMemoryUsagePercentage(), {});

      Object.keys(requests).forEach((method) => {
        sendMetricToGrafana("http_requests_total", requests[method], {
          method,
        });
      });

      sendMetricToGrafana("auth_success", authAttempts.success, {
        type: "success",
      });
      sendMetricToGrafana("auth_failure", authAttempts.failure, {
        type: "failure",
      });

      sendMetricToGrafana("users", users, {});

      sendMetricToGrafana("revenue", revenue, {});

      sendMetricToGrafana("order_success", orders.success, {
        type: "success",
      });
      sendMetricToGrafana("order_failure", orders.failure, {
        type: "failure",
      });

      sendMetricToGrafana("http_latency_ms", totalLatencyAverage(), {});

      sendMetricToGrafana(
        "pizza_creation_latency_ms",
        calculateAvgPizzaLatency(),
        {}
      );
    } catch (error) {
      console.log("Error sending metrics", error);
    }
  }, period);
}

sendMetricsPeriodically(10000);

module.exports = {
  trackMethods,
  trackAuthSuccess,
  trackAuthFailure,
  userAdded,
  userRemoved,
  trackBusiness,
  trackOrderFailure,
  trackPizzaCreation,
};
