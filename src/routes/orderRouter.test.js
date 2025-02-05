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

test("add menu item", async () => {
  const res = await request(app)
    .put("/api/order/menu")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      title: "Fred",
      description: "No topping, no sauce, just carbs",
      image: "pizza9.png",
      price: 0.0001,
    });
  expect(res.status).toBe(200);
  expect(res.body).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        title: "Fred",
        description: "No topping, no sauce, just carbs",
        image: "pizza9.png",
        price: 0.0001,
      }),
    ])
  );
});

test("create order", async () => {
  const res = await request(app)
    .post("/api/order")
    .set("Authorization", `Bearer ${testUserAuthToken}`)
    .send({
      franchiseId: 1,
      storeId: 1,
      items: [{ menuId: 1, description: "Veggie", price: 0.05 }],
    });
  expect(res.status).toBe(200);
  expect(res.body.order).toEqual(
    expect.objectContaining({
      franchiseId: 1,
      storeId: 1,
      items: expect.arrayContaining([
        expect.objectContaining({
          menuId: 1,
          description: "Veggie",
          price: 0.05,
        }),
      ]),
    })
  );
  expectValidJwt(res.body.jwt);
});

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(
    /^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/
  );
}
