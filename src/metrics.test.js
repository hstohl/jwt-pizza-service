const metrics = require("./metrics.js");

test("latency metric", async () => {
  const avgLatency = metrics.totalLatencyAverage();
  expect(avgLatency).toBeDefined();
});

test("pizza latency metric", async () => {
  const avgPizzaLatency = metrics.calculateAvgPizzaLatency();
  expect(avgPizzaLatency).toBeDefined();
});

test("cpu usage metric", async () => {
  const cpuUsage = metrics.getCpuUsagePercentage();
  expect(cpuUsage).toBeDefined();
});

test("memory usage metric", async () => {
  const memoryUsage = metrics.getMemoryUsagePercentage();
  expect(memoryUsage).toBeDefined();
});
