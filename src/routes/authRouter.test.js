const request = require("supertest");
const app = require("../service");
const { DB, Role } = require("../database/database.js");
const jwt = require("jsonwebtoken");
const config = require("../config.js");

const testUser = { name: "pizza diner", email: "reg@test.com", password: "a" };
let testUserAuthToken;

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
  jest.setTimeout(60 * 1000 * 5); // 5 minutes
}

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const registerRes = await request(app).post("/api/auth").send(testUser);
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);
});

test("register", async () => {
  let cow = 1;
  const user = { name: "pizza diner", email: "reg@test.com", password: "a" };
  user.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const regRes = await request(app).post("/api/auth").send(user);
  expect(regRes.status).toBe(200);
  expectValidJwt(regRes.body.token);

  const expectedUser = { ...user, roles: [{ role: "diner" }] };
  delete expectedUser.password;
  expect(regRes.body.user).toMatchObject(expectedUser);
});

test("register without password", async () => {
  const user = { name: "pizza diner", email: "reg@test.com" };
  user.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const regRes = await request(app).post("/api/auth").send(user);
  expect(regRes.status).toBe(400);
  expect(regRes.body.message).toBe("name, email, and password are required");
});

test("login", async () => {
  const loginRes = await request(app).put("/api/auth").send(testUser);
  expect(loginRes.status).toBe(200);
  expectValidJwt(loginRes.body.token);

  const expectedUser = { ...testUser, roles: [{ role: "diner" }] };
  delete expectedUser.password;
  expect(loginRes.body.user).toMatchObject(expectedUser);
});

test("login with bad password", async () => {
  const loginRes = await request(app)
    .put("/api/auth")
    .send({ email: testUser.email, password: "bad" });
  expect(loginRes.status).toBe(404);
  expect(loginRes.body.message).toBe("unknown user");
});

test("logout", async () => {
  const logoutRes = await request(app)
    .delete("/api/auth")
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  expect(logoutRes.status).toBe(200);
  expect(logoutRes.body.message).toBe("logout successful");
});

test("update user", async () => {
  let adminEmail = Math.random().toString(36).substring(2, 12) + "@test.com";
  let newEmail = Math.random().toString(36).substring(2, 12) + "@test.com";
  const admin = await DB.addUser({
    name: "admin",
    email: adminEmail,
    password: "a",
    roles: [{ role: Role.Admin }],
  });
  const token = jwt.sign(admin, config.jwtSecret);
  await DB.loginUser(admin.id, token);
  let auth = token;
  const updateRes = await request(app)
    .put(`/api/auth/${admin.id}`)
    .set("Authorization", `Bearer ${auth}`)
    .send({ email: newEmail, password: "a" });
  expect(updateRes.status).toBe(200);
  const expectedUser = { ...admin, roles: [{ role: "admin" }] };
  delete expectedUser.password;
  expect(updateRes.body.email).toBe(newEmail);
});

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(
    /^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/
  );
}
