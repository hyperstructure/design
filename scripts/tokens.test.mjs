import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { themes } from "../src/brand.ts";

const css = readFileSync(new URL("../src/tokens.css", import.meta.url), "utf8");

/** The `--c-*` colors a rule in tokens.css sets, by name, for the rule whose selector starts with `selector`. */
function rule(selector) {
  const at = css.indexOf(`${selector} {`);
  assert.ok(at >= 0, `tokens.css has a rule for ${selector}`);
  const body = css.slice(at, css.indexOf("}", at));
  return Object.fromEntries(
    [...body.matchAll(/--c-([a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]),
  );
}

const rules = { dark: rule(':root,\n:root[data-theme="dark"]'), light: rule(':root[data-theme="light"]') };

for (const [theme, colors] of Object.entries(themes)) {
  test(`brand.ts's ${theme} backgrounds are tokens.css's`, () => {
    for (const [name, hex] of Object.entries(colors)) {
      assert.equal(hex.toLowerCase(), rules[theme][name]?.toLowerCase(), `--c-${name} in the ${theme} theme`);
    }
  });
}
