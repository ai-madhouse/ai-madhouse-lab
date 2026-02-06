import { describe, expect, test } from "bun:test";

import en from "../../src/messages/en.json";
import lt from "../../src/messages/lt.json";
import ru from "../../src/messages/ru.json";

const timelineStepKeys = ["discover", "shape", "ship"] as const;
const timelineFieldKeys = ["eyebrow", "title", "description"] as const;
const expectedTimelineKeys = [
  "title",
  "subtitle",
  ...timelineStepKeys,
] as const;
const sortedExpectedTimelineKeys = [...expectedTimelineKeys].sort();
const localeMessages = [en, lt, ru];

describe("Landing timeline messages", () => {
  test("keeps timeline schema stable across locales", () => {
    for (const messages of localeMessages) {
      const timeline = messages.Landing.timeline;
      expect(Object.keys(timeline).sort()).toEqual(sortedExpectedTimelineKeys);

      expect(timeline.title.trim().length).toBeGreaterThan(0);
      expect(timeline.subtitle.trim().length).toBeGreaterThan(0);

      for (const stepKey of timelineStepKeys) {
        const step = timeline[stepKey];

        for (const fieldKey of timelineFieldKeys) {
          expect(step[fieldKey].trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  test("keeps timeline step titles distinct per locale", () => {
    for (const messages of localeMessages) {
      const titles = timelineStepKeys.map(
        (stepKey) => messages.Landing.timeline[stepKey].title,
      );

      expect(new Set(titles).size).toBe(titles.length);
    }
  });
});
