import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { appUrl, formatDate, formatDateTime } from "./utils";

const original = process.env.APP_URL;

afterEach(() => {
  if (original === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = original;
});

test("uses APP_URL for the local desk", () => {
  process.env.APP_URL = "http://localhost:3100/";
  assert.equal(appUrl(), "http://localhost:3100");
});

test("falls back to localhost when APP_URL is unset", () => {
  delete process.env.APP_URL;
  assert.equal(appUrl(), "http://localhost:3100");
});

test("formats captured timestamps in India time on server and client", () => {
  const captured = "2026-09-11T10:00:00.000Z";
  assert.equal(formatDate(captured), "11 Sep 2026");
  assert.equal(formatDateTime(captured), "11 Sep 2026, 15:30:00");
  assert.equal(formatDateTime(new Date(captured)), "11 Sep 2026, 15:30:00");
});
