import assert from "node:assert/strict";
import { test } from "node:test";
import { collectImages } from "./media";

test("collectImages keeps every uploaded photo, including identical filenames", () => {
  const formData = new FormData();
  formData.append("images", new File(["front"], "image.jpg", { type: "image/jpeg" }));
  formData.append("images", new File(["back"], "image.jpg", { type: "image/jpeg" }));
  formData.append("images", new File(["serial"], "image.jpg", { type: "image/jpeg" }));

  const images = collectImages(formData);
  assert.equal(images.length, 3);
  assert.equal(images[0]?.size, 5);
  assert.equal(images[1]?.size, 4);
  assert.equal(images[2]?.size, 6);
});
