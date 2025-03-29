const logger = require("./logger");

test("status test", async () => {
  expect(logger.statusToLogLevel(400)).toBe("warn");
  expect(logger.statusToLogLevel(500)).toBe("error");
  expect(logger.statusToLogLevel(200)).toBe("info");
});

test("nowString test", async () => {
  const now = logger.nowString();
  expect(now).toBeDefined();
  expect(typeof now).toBe("string");
});

test("sanitize test", async () => {
  const logData = '{"name":"hudson","password":"toomanysecrets"}';
  let sanitized = logger.sanitize(logData);
  expect(sanitized).toBeDefined();
  expect(sanitized).toContain("*****");
});
