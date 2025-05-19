const request = require("supertest");
const { expect } = require("chai");
const { getApp } = require("../dist/index");
const { setTimeout } = require("timers/promises");

let app;

describe("Shopper API", () => {
  let authCookie1; // testUser1
  let authCookie2; // testUser2
  let authCookie3; // testUser3
  let listId;
  let itemId;
  let userId2;

  const testUser1 = {
    name: "unit-test1@arimodu.dev",
    password: "pass123",
  };
  const testUser2 = {
    name: "unit-test2@arimodu.dev",
    password: "pass321",
  };
  const testUser3 = {
    name: "unit-test3@arimodu.dev",
    password: "pass789",
  };

  before(async function () {
    this.timeout(30000);
    app = getApp();
    await setTimeout(5000); // App needs some time to warmup, due to the cancer that is async await, so this atrocity is needed

    let res1 = await request(app).post("/api/v1/auth/register").send(testUser1);
    expect(res1.status).to.be.oneOf([201, 409]);
    if (res1.status === 409) {
      console.warn(
        `Warning: User ${testUser1.name} already exists, proceeding with login...`
      );
    }
    res1 = await request(app)
      .post("/api/v1/auth/login")
      .send(testUser1)
      .expect(200);

    authCookie1 = res1.headers["set-cookie"];

    let res2 = await request(app).post("/api/v1/auth/register").send(testUser2);
    expect(res2.status).to.be.oneOf([201, 409]);
    if (res2.status === 409) {
      console.warn(
        `Warning: User ${testUser2.name} already exists, proceeding with login...`
      );
    }
    res2 = await request(app)
      .post("/api/v1/auth/login")
      .send(testUser2)
      .expect(200);

    authCookie2 = res2.headers["set-cookie"];
    userId2 = res2.body._id;
    
    let res3 = await request(app).post("/api/v1/auth/register").send(testUser3);
    expect(res3.status).to.be.oneOf([201, 409]);
    if (res3.status === 409) {
      console.warn(
        `Warning: User ${testUser3.name} already exists, proceeding with login...`
      );
    }
    res3 = await request(app)
      .post("/api/v1/auth/login")
      .send(testUser3)
      .expect(200);

    authCookie3 = res3.headers["set-cookie"];
  });

  after(async () => {
    await request(app)
      .delete("/api/v1/user/me")
      .set("Cookie", authCookie1)
      .expect(200);
    await request(app)
      .delete("/api/v1/user/me")
      .set("Cookie", authCookie2)
      .expect(200);
    await request(app)
      .delete("/api/v1/user/me")
      .set("Cookie", authCookie3)
      .expect(200);
  });

  describe("Auth Endpoints", () => {
    const newUser = {
      name: "newuser@arimodu.dev",
      password: "pass123",
    };

    let cookie;

    describe("POST /auth/register", () => {
      it("should register a new user", async () => {
        const res = await request(app)
          .post("/api/v1/auth/register")
          .send(newUser)
          .expect(201);
        expect(res.body).to.have.property("name").equal("newuser@arimodu.dev");
      });

      it("should return 409 for existing username", async () => {
        await request(app)
          .post("/api/v1/auth/register")
          .send(newUser)
          .expect(409);
      });
    });

    describe("POST /auth/login", () => {
      it("should login with valid credentials", async () => {
        const res = await request(app)
          .post("/api/v1/auth/login")
          .send(newUser)
          .expect(200);
        expect(res.body).to.have.property("name").equal(newUser.name);
        cookie = res.headers["set-cookie"];
      });

      it("should return 401 for invalid password", async () => {
        await request(app)
          .post("/api/v1/auth/login")
          .send({ name: newUser.name, password: "wrong" })
          .expect(401);
      });

      it("should delete new user", async () => {
        await request(app)
          .delete("/api/v1/user/me")
          .set("Cookie", cookie)
          .expect(200);
      });
    });
  });

  describe("User Endpoints", () => {
    describe("GET /user/me", () => {
      it("should return current user data", async () => {
        const res = await request(app)
          .get("/api/v1/user/me")
          .set("Cookie", authCookie1)
          .expect(200);
        expect(res.body).to.have.property("user");
        expect(res.body.user).to.have.property("name").equal(testUser1.name);
        expect(res.body).to.have.property("lists");
      });

      it("should return 401 if not logged in", async () => {
        await request(app).get("/api/v1/user/me").expect(401);
      });
    });

    describe("PATCH /user/me", () => {
      it("should update user data", async () => {
        const res = await request(app)
          .patch("/api/v1/user/me")
          .set("Cookie", authCookie1)
          .send({ name: "updated1@arimodu.dev" })
          .expect(200);
        expect(res.body).to.have.property("name").equal("updated1@arimodu.dev");
      });

      it("should return 401 if not logged in", async () => {
        await request(app)
          .patch("/api/v1/user/me")
          .send({ name: "updated@arimodu.dev" })
          .expect(401);
      });
    });
  });

  describe("List Endpoints", () => {
    describe("POST /list/create", () => {
      it("should create a new list for testUser1", async () => {
        const res = await request(app)
          .post("/api/v1/list/create")
          .set("Cookie", authCookie1)
          .send({ listName: "Shared Test List" })
          .expect(201);
        expect(res.body).to.have.property("name").equal("Shared Test List");
        expect(res.body).to.have.property("_id");
        listId = res.body._id;
      });

      it("should create an item in new list with testUser1", async () => {
        const res = await request(app)
          .post("/api/v1/item/create")
          .set("Cookie", authCookie1)
          .send({ listId, order: 1, content: "Shared Item" })
          .expect(201);
        itemId = res.body.items[0]._id;
      });

      it("should return 401 if not logged in", async () => {
        await request(app)
          .post("/api/v1/list/create")
          .send({ listName: "New List" })
          .expect(401);
      });
    });

    describe("PATCH /list/:listId", () => {
      it("should update list name for testUser1", async () => {
        const res = await request(app)
          .patch(`/api/v1/list/${listId}`)
          .set("Cookie", authCookie1)
          .send({ name: "Updated Shared List" })
          .expect(200);
        expect(res.body).to.have.property("name").equal("Updated Shared List");
      });
    });

    describe("PUT /list/acl", () => {
      it("should allow testUser1 to add testUser2 to list ACL", async () => {
        const res = await request(app)
          .put("/api/v1/list/acl")
          .set("Cookie", authCookie1)
          .send({ listId, userId: userId2 })
          .expect(200);
        expect(res.body.invitedUsers).to.include(userId2);
      });

      it("should allow testUser1 to access their own list and item", async () => {
        let res = await request(app)
          .get(`/api/v1/list/${listId}`)
          .set("Cookie", authCookie1)
          .expect(200);
        expect(res.body).to.have.property("_id").equal(listId);

        res = await request(app)
          .get(`/api/v1/item/${itemId}`)
          .set("Cookie", authCookie1)
          .expect(200);
        expect(res.body).to.have.property("_id").equal(itemId);
        expect(res.body).to.have.property("content").equal("Shared Item");
      });

      it("should allow testUser2 (invited) to access the list and item", async () => {
        let res = await request(app)
          .get(`/api/v1/list/${listId}`)
          .set("Cookie", authCookie2)
          .expect(200);
        expect(res.body).to.have.property("_id").equal(listId);

        res = await request(app)
          .get(`/api/v1/item/${itemId}`)
          .set("Cookie", authCookie2)
          .expect(200);
        expect(res.body).to.have.property("_id").equal(itemId);
        expect(res.body).to.have.property("content").equal("Shared Item");
      });

      it("should deny testUser3 (not invited) access to the list and item", async () => {
        await request(app)
          .get(`/api/v1/list/${listId}`)
          .set("Cookie", authCookie3)
          .expect(401);
      });
    });

    describe("DELETE /list/:listId", () => {
      it("should allow testUser1 to delete the list", async () => {
        await request(app)
          .delete(`/api/v1/list/${listId}`)
          .set("Cookie", authCookie1)
          .expect(200);
      });
    });
  });

  describe("Item Endpoints", () => {
    before(async () => {
      const listRes = await request(app)
        .post("/api/v1/list/create")
        .set("Cookie", authCookie1)
        .send({ listName: "Item Test List" })
        .expect(201);
      listId = listRes.body._id;

      const itemRes = await request(app)
        .post("/api/v1/item/create")
        .set("Cookie", authCookie1)
        .send({ listId, order: 1, content: "Test Item" })
        .expect(201);
      itemId = itemRes.body.items[0]._id;

      await request(app)
        .put("/api/v1/list/acl")
        .set("Cookie", authCookie1)
        .send({ listId, userId: userId2 })
        .expect(200);
    });

    describe("POST /item/create", () => {
      it("should create a new item for testUser1", async () => {
        const res = await request(app)
          .post("/api/v1/item/create")
          .set("Cookie", authCookie1)
          .send({ listId, order: 2, content: "New Item" })
          .expect(201);
        expect(res.body.items).to.be.an("array");
        expect(res.body.items[res.body.items.length - 1])
          .to.have.property("content")
          .equal("New Item");
      });

      it("should allow testUser2 to create item in shared list", async () => {
        const res = await request(app)
          .post("/api/v1/item/create")
          .set("Cookie", authCookie2)
          .send({ listId, order: 3, content: "Shared User Item" })
          .expect(201);
        expect(res.body.items).to.be.an("array");
        expect(res.body.items[res.body.items.length - 1])
          .to.have.property("content")
          .equal("Shared User Item");
      });

      it("should return 401 if not logged in", async () => {
        await request(app)
          .post("/api/v1/item/create")
          .send({ listId, order: 2, content: "New Item" })
          .expect(401);
      });
    });

    describe("GET /item/:itemId", () => {
      it("should get item by ID for testUser1", async () => {
        const res = await request(app)
          .get(`/api/v1/item/${itemId}`)
          .set("Cookie", authCookie1)
          .expect(200);
        expect(res.body).to.have.property("_id").equal(itemId);
        expect(res.body).to.have.property("content").equal("Test Item");
      });

      it("should get item by ID for testUser2", async () => {
        const res = await request(app)
          .get(`/api/v1/item/${itemId}`)
          .set("Cookie", authCookie2)
          .expect(200);
        expect(res.body).to.have.property("_id").equal(itemId);
        expect(res.body).to.have.property("content").equal("Test Item");
      });
    });

    describe("PATCH /item/:itemId", () => {
      it("should update item content for testUser1", async () => {
        const res = await request(app)
          .patch(`/api/v1/item/${itemId}`)
          .set("Cookie", authCookie1)
          .send({ content: "Updated Item", isComplete: true })
          .expect(200);
        const updatedItem = res.body.items.find((item) => item._id === itemId);
        expect(updatedItem).to.exist;
        expect(updatedItem).to.have.property("content").equal("Updated Item");
        expect(updatedItem).to.have.property("isComplete").equal(true);
      });
    });

    describe("DELETE /item/:itemId", () => {
      it("should delete an item for testUser1", async () => {
        await request(app)
          .delete(`/api/v1/item/${itemId}`)
          .set("Cookie", authCookie1)
          .expect(200);
      });
    });
  });
});
