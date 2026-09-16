import test from "node:test";
import assert from "node:assert/strict";
import { isStudentId, pagination } from "../src/utils.js";
test("student id validation accepts exactly XXX/YY", () => {
  assert.equal(isStudentId("001/26"), true);
  assert.equal(isStudentId("1/26"), false);
  assert.equal(isStudentId("001-26"), false);
});
test("pagination clamps invalid values", () => {
  assert.deepEqual(pagination({ query: { page: "-2", limit: "1000" } }), {
    page: 1,
    limit: 100,
    offset: 0,
  });
});
