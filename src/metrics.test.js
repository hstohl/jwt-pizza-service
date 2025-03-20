const request = require("supertest");
const metrics = require("./metrics.js");

test("latency metric", async () => {
  const avgLatency = metrics.totalLatencyAverage();
  expect(avgLatency).toBeDefined();
});

test("pizza latency metric", async () => {
  const avgPizzaLatency = metrics.calculateAvgPizzaLatency();
  expect(avgPizzaLatency).toBeDefined();
});
