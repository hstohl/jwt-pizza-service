const request = require("supertest");
const app = require("../service");

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
  jest.setTimeout(60 * 1000 * 5); // 5 minutes
}

const testUser = { name: "pizza diner", email: "reg@test.com", password: "a" };
let testUserAuthToken;

test("practice", async () => {
  expect(200).toBe(200);
});
