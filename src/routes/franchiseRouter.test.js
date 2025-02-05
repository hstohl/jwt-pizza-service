const request = require("supertest");
const app = require("../service");
const { DB, Role } = require("../database/database.js");
const jwt = require("jsonwebtoken");
const config = require("../config.js");
const { get } = require("./orderRouter.js");

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
  jest.setTimeout(60 * 1000 * 5); // 5 minutes
}

const testUser = { name: "pizza diner", email: "reg@test.com", password: "a" };
let testUserAuthToken;
let adminToken;

beforeAll(async () => {
  let adminEmail = Math.random().toString(36).substring(2, 12) + "@test.com";
  const admin = await DB.addUser({
    name: "admin",
    email: adminEmail,
    password: "a",
    roles: [{ role: Role.Admin }],
  });
  adminToken = jwt.sign(admin, config.jwtSecret);
  await DB.loginUser(admin.id, adminToken);
  testUser.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const registerRes = await request(app).post("/api/auth").send(testUser);
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);
});

function createFranchise(name, admins) {
  return request(app)
    .post("/api/franchise")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ name, admins });
}

test("create franchise", async () => {
  let newFranchiseName = Math.random().toString(36).substring(2, 12);
  const res = await request(app)
    .post("/api/franchise")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ name: newFranchiseName, admins: [{ email: testUser.email }] });
  expect(res.status).toBe(200);
  expect(res.body.name).toBe(newFranchiseName);
  expect(res.body.admins[0].email).toBe(testUser.email);
  const getRes = await request(app)
    .get("/api/franchise")
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  expect(getRes.status).toBe(200);
  expect(getRes.body).toContainEqual({
    id: res.body.id,
    name: newFranchiseName,
    stores: [],
  });
});

test("create franchise bad authorization", async () => {
  const res = await request(app)
    .post("/api/franchise")
    .set("Authorization", `Bearer ${testUserAuthToken}`)
    .send({ name: "franchiseName", admins: [{ email: testUser.email }] });
  expect(res.status).toBe(403);
  expect(res.body.message).toBe("unable to create a franchise");
});

// test("get user franchises", async () => {
//   let newFranchiseName = Math.random().toString(36).substring(2, 12);
//   const createRes = await createFranchise(newFranchiseName, [
//     { email: testUser.email },
//   ]);
//   const getRes = await request(app)
//     .get(`/api/franchise/${testUser.id}`)
//     .set("Authorization", `Bearer ${testUserAuthToken}`);
//   expect(getRes.status).toBe(200);
//   expect(getRes.body).toContainEqual({
//     id: createRes.body.id,
//     name: newFranchiseName,
//     stores: [],
//   });
// });

test("delete franchise", async () => {
  const createRes = await createFranchise("delete me", [
    { email: testUser.email },
  ]);
  const deleteRes = await request(app)
    .delete(`/api/franchise/${createRes.body.id}`)
    .set("Authorization", `Bearer ${adminToken}`);
  expect(deleteRes.status).toBe(200);
  expect(deleteRes.body.message).toBe("franchise deleted");
});

test("delete franchise bad authorization", async () => {
  const createRes = await createFranchise("delete me", [
    { email: testUser.email },
  ]);
  const deleteRes = await request(app)
    .delete(`/api/franchise/${createRes.body.id}`)
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  expect(deleteRes.status).toBe(403);
  expect(deleteRes.body.message).toBe("unable to delete a franchise");
});

test("create store", async () => {
  let newStoreName = Math.random().toString(36).substring(2, 12);
  const createFranchiseRes = await createFranchise(newStoreName, [
    { email: testUser.email },
  ]);
  const createStoreRes = await request(app)
    .post(`/api/franchise/${createFranchiseRes.body.id}/store`)
    .set("Authorization", `Bearer ${testUserAuthToken}`)
    .send({ name: newStoreName });
  expect(createStoreRes.status).toBe(200);
  expect(createStoreRes.body.name).toBe(newStoreName);
});

test("delete store", async () => {
  const createFranchiseRes = await createFranchise("delete store", [
    { email: testUser.email },
  ]);
  const createStoreRes = await request(app)
    .post(`/api/franchise/${createFranchiseRes.body.id}/store`)
    .set("Authorization", `Bearer ${testUserAuthToken}`)
    .send({ name: "delete me" });
  const deleteRes = await request(app)
    .delete(
      `/api/franchise/${createFranchiseRes.body.id}/store/${createStoreRes.body.id}`
    )
    .set("Authorization", `Bearer ${adminToken}`);
  expect(deleteRes.status).toBe(200);
  expect(deleteRes.body.message).toBe("store deleted");
});

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(
    /^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/
  );
}
