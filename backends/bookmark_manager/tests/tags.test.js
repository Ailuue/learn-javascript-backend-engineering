const { api, defaultUser, otherUser } = require("./setup");

test("create tag", async () => {
  const { headers } = await defaultUser();
  const res = await api().post("/tags/").set(headers).send({ name: "python" });
  expect(res.status).toBe(201);
  expect(res.body.name).toBe("python");
});

test("create tag idempotent", async () => {
  const { headers } = await defaultUser();
  const first = (await api().post("/tags/").set(headers).send({ name: "python" })).body;
  const second = (await api().post("/tags/").set(headers).send({ name: "python" })).body;
  expect(first.id).toBe(second.id);
});

test("tags isolated per user", async () => {
  const { headers } = await defaultUser();
  const { headers: otherHeaders } = await otherUser();
  await api().post("/tags/").set(headers).send({ name: "mine" });
  await api().post("/tags/").set(otherHeaders).send({ name: "yours" });

  const res = await api().get("/tags/").set(headers);
  expect(new Set(res.body.map((t) => t.name))).toEqual(new Set(["mine"]));
});

test("list tags includes bookmark tags", async () => {
  const { headers } = await defaultUser();
  await api()
    .post("/bookmarks/")
    .set(headers)
    .send({ url: "https://example.com", tags: ["from-bookmark"] });
  const res = await api().get("/tags/").set(headers);
  expect(res.body.map((t) => t.name)).toContain("from-bookmark");
});

test("delete tag", async () => {
  const { headers } = await defaultUser();
  const created = (await api().post("/tags/").set(headers).send({ name: "todelete" })).body;
  const res = await api().delete(`/tags/${created.id}`).set(headers);
  expect(res.status).toBe(204);
});

test("delete other user's tag returns 404", async () => {
  const { headers } = await defaultUser();
  const { headers: otherHeaders } = await otherUser();
  const created = (await api().post("/tags/").set(otherHeaders).send({ name: "private" })).body;
  const res = await api().delete(`/tags/${created.id}`).set(headers);
  expect(res.status).toBe(404);
});
