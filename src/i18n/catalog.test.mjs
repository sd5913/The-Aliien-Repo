import assert from "node:assert/strict";
import test from "node:test";
import { catalogs, translate } from "./catalog.ts";
import { defaultLocale, isLocale } from "./locale.ts";

test("all locales provide the same nonempty messages and placeholders", () => {
  const keys = Object.keys(catalogs.en).sort();
  const placeholders = (value) => [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
  for (const locale of ["zh-HK", "en", "ko-KR"]) {
    assert.deepEqual(Object.keys(catalogs[locale]).sort(), keys);
    for (const key of keys) {
      assert.ok(catalogs[locale][key].trim(), `${locale}: ${key}`);
      assert.deepEqual(placeholders(catalogs[locale][key]), placeholders(catalogs.en[key]), `${locale}: ${key}`);
    }
  }
});

test("interpolation preserves user content literally and does not process it as a template", () => {
  const content = "午餐 {title} · 점심 <3";
  for (const locale of ["zh-HK", "en", "ko-KR"]) {
    assert.ok(translate(locale, "poll.deleteDetails", { title: content }).includes(content));
  }
});

test("Traditional Chinese is the initial locale and only supported values are accepted", () => {
  assert.equal(defaultLocale, "zh-HK");
  for (const value of ["zh-HK", "en", "ko-KR"]) assert.equal(isLocale(value), true);
  for (const value of ["zh-CN", "fr", "", null]) assert.equal(isLocale(value), false);
});
