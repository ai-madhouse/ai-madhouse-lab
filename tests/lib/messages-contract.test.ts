import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

type Messages = Record<string, string | Messages>;

const projectRoot = process.cwd();
const sourceRoot = path.join(projectRoot, "src");
const messageFiles = {
  en: path.join(projectRoot, "src/messages/en.json"),
  lt: path.join(projectRoot, "src/messages/lt.json"),
  ru: path.join(projectRoot, "src/messages/ru.json"),
} as const;

function flattenMessages(
  value: Messages,
  prefix = "",
  out: Record<string, string> = {},
) {
  for (const [key, entry] of Object.entries(value)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (typeof entry === "string") {
      out[next] = entry;
      continue;
    }
    flattenMessages(entry, next, out);
  }
  return out;
}

function walkSource(dir: string, out: string[] = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      walkSource(fullPath, out);
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry)) {
      out.push(fullPath);
    }
  }
  return out;
}

function collectStaticTranslationKeys(fileText: string) {
  const keys = new Set<string>();

  const namespaceBindings = [
    ...fileText.matchAll(
      /const\s+(\w+)\s*=\s*useTranslations\(\s*["']([^"']+)["']\s*\)/g,
    ),
    ...fileText.matchAll(
      /const\s+(\w+)\s*=\s*createTranslator\([^,]+,\s*["']([^"']+)["']\s*\)/g,
    ),
  ];

  for (const match of namespaceBindings) {
    const varName = match[1];
    const namespace = match[2];
    const keyRegex = new RegExp(`\\b${varName}\\(\\s*["']([^"']+)["']`, "g");
    for (const keyMatch of fileText.matchAll(keyRegex)) {
      keys.add(`${namespace}.${keyMatch[1]}`);
    }
  }

  return keys;
}

function collectPlaceholders(message: string) {
  return Array.from(
    message.matchAll(/\{([a-zA-Z0-9_]+)\}/g),
    (m) => m[1],
  ).sort();
}

describe("message contract", () => {
  const en = JSON.parse(readFileSync(messageFiles.en, "utf8")) as Messages;
  const lt = JSON.parse(readFileSync(messageFiles.lt, "utf8")) as Messages;
  const ru = JSON.parse(readFileSync(messageFiles.ru, "utf8")) as Messages;

  const flatEn = flattenMessages(en);
  const flatLt = flattenMessages(lt);
  const flatRu = flattenMessages(ru);

  test("keeps EN/LT/RU keysets aligned", () => {
    const enKeys = Object.keys(flatEn).sort();
    const ltKeys = Object.keys(flatLt).sort();
    const ruKeys = Object.keys(flatRu).sort();

    expect(ltKeys).toEqual(enKeys);
    expect(ruKeys).toEqual(enKeys);
  });

  test("keeps placeholder variables aligned with EN", () => {
    for (const key of Object.keys(flatEn)) {
      expect(collectPlaceholders(flatLt[key] ?? "")).toEqual(
        collectPlaceholders(flatEn[key]),
      );
      expect(collectPlaceholders(flatRu[key] ?? "")).toEqual(
        collectPlaceholders(flatEn[key]),
      );
    }
  });

  test("covers all static translation keys used in src", () => {
    const sourceFiles = walkSource(sourceRoot);
    const usedKeys = new Set<string>();

    for (const filePath of sourceFiles) {
      const source = readFileSync(filePath, "utf8");
      for (const key of collectStaticTranslationKeys(source)) {
        usedKeys.add(key);
      }
    }

    const missing = Array.from(usedKeys)
      .filter((key) => !(key in flatEn))
      .sort();

    expect(missing).toEqual([]);
  });
});
