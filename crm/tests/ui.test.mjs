import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Window } from "happy-dom";
import { fixture, installFixture } from "./fixtures.mjs";
test("staff interface loads, filters, renders untrusted text safely and clears on logout", async () => {
  const window = new Window({ url: "http://localhost/" });
  window.document.write(
    await readFile(new URL("../web/index.html", import.meta.url), "utf8"),
  );
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.FormData = window.FormData;
  window.HTMLElement.prototype.scrollIntoView = function () {};
  window.HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  window.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  installFixture(window);
  globalThis.fetch = window.fetch;
  await import("../web/app.js");
  const $ = (id) => document.getElementById(id);
  assert.ok(Array.from($("create-commodity").options).some(option => option.value === "Shea butter"));
  const settle = () => new Promise((resolve) => setTimeout(resolve, 30));
  const login = $("login-form");
  login.elements.email.value = "fixture@example.invalid";
  login.elements.password.value = "synthetic";
  login.dispatchEvent(
    new window.Event("submit", { bubbles: true, cancelable: true }),
  );
  await settle();
  assert.equal($("workspace").hidden, false);
  assert.equal($("metric-open").textContent, "1");
  assert.equal($("metric-due").textContent, "1");
  $("enquiry-rows").querySelector("button").click();
  await settle();
  assert.equal($("detail").hidden, false);
  assert.equal($("detail-spec").textContent, fixture.specification);
  assert.equal($("detail-spec").querySelector("img"), null);
  $("search").value = "no such buyer";
  $("search").dispatchEvent(new window.Event("input"));
  assert.equal($("enquiry-rows").children.length, 0);
  assert.equal($("empty").hidden, false);
  $("logout").click();
  await settle();
  assert.equal($("workspace").hidden, true);
  assert.equal($("enquiry-rows").children.length, 0);
  assert.equal($("detail-spec").textContent, "");
  assert.equal($("detail-meta").textContent, "");
  window.happyDOM.abort();
});
