import assert from "node:assert/strict";
import { test } from "node:test";
import { generateQrDataUrl, qrPayloadForUid } from "./qr";

test("QR payload is the normalized UID", () => {
  assert.equal(qrPayloadForUid(" cf-ast-000042 "), "CF-AST-000042");
});

test("renders a PNG data URL for a UID", async () => {
  const image = await generateQrDataUrl("CF-AST-000001");
  assert.match(image, /^data:image\/png;base64,/);
});
