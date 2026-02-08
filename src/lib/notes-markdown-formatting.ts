export type TextSelectionRange = {
  start: number;
  end: number;
};

export type TextEditResult = {
  next: string;
  range: TextSelectionRange;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizeRange(
  text: string,
  start: number,
  end: number,
): TextSelectionRange {
  const a = clamp(start, 0, text.length);
  const b = clamp(end, 0, text.length);
  if (a <= b) return { start: a, end: b };
  return { start: b, end: a };
}

function getLineStart(text: string, index: number) {
  return text.lastIndexOf("\n", index - 1) + 1;
}

function getLineEnd(text: string, index: number) {
  const next = text.indexOf("\n", index);
  return next === -1 ? text.length : next;
}

function editSelectedLines(
  text: string,
  start: number,
  end: number,
  transform: (lines: string[]) => string[],
): TextEditResult {
  const normalized = normalizeRange(text, start, end);
  const lineStart = getLineStart(text, normalized.start);
  const lineEnd = getLineEnd(text, normalized.end);

  const before = text.slice(0, lineStart);
  const middle = text.slice(lineStart, lineEnd);
  const after = text.slice(lineEnd);

  const updated = transform(middle.split("\n")).join("\n");
  return {
    next: `${before}${updated}${after}`,
    range: {
      start: lineStart,
      end: lineStart + updated.length,
    },
  };
}

function stripListMarker(line: string) {
  return line.replace(/^(\s*)(?:[-*+]\s+|\d+\.\s+)/, "$1");
}

function isBulletLine(line: string) {
  return /^\s*-\s+/.test(line);
}

function isNumberedLine(line: string) {
  return /^\s*\d+\.\s+/.test(line);
}

export function toggleLinePrefix(
  text: string,
  start: number,
  end: number,
  prefix: string,
): TextEditResult {
  return editSelectedLines(text, start, end, (lines) =>
    lines.map((line) =>
      line.startsWith(prefix) ? line.slice(prefix.length) : `${prefix}${line}`,
    ),
  );
}

export function toggleBulletList(
  text: string,
  start: number,
  end: number,
): TextEditResult {
  return editSelectedLines(text, start, end, (lines) => {
    const nonEmpty = lines.filter((line) => line.trim().length > 0);
    const allBulleted = nonEmpty.length > 0 && nonEmpty.every(isBulletLine);

    if (allBulleted) {
      return lines.map((line) => line.replace(/^(\s*)-\s+/, "$1"));
    }

    return lines.map((line) => {
      if (line.trim().length === 0) return line;
      const stripped = stripListMarker(line);
      const indent = stripped.match(/^\s*/)![0];
      return `${indent}- ${stripped.slice(indent.length)}`;
    });
  });
}

export function toggleNumberedList(
  text: string,
  start: number,
  end: number,
): TextEditResult {
  return editSelectedLines(text, start, end, (lines) => {
    const nonEmpty = lines.filter((line) => line.trim().length > 0);
    const allNumbered = nonEmpty.length > 0 && nonEmpty.every(isNumberedLine);

    if (allNumbered) {
      return lines.map((line) => line.replace(/^(\s*)\d+\.\s+/, "$1"));
    }

    let counter = 1;
    return lines.map((line) => {
      if (line.trim().length === 0) return line;
      const stripped = stripListMarker(line);
      const indent = stripped.match(/^\s*/)![0];
      const numbered = `${indent}${counter}. ${stripped.slice(indent.length)}`;
      counter += 1;
      return numbered;
    });
  });
}

export function toggleInlineMarker(
  text: string,
  start: number,
  end: number,
  marker: string,
): TextEditResult {
  if (marker.length === 0) {
    return { next: text, range: normalizeRange(text, start, end) };
  }

  const normalized = normalizeRange(text, start, end);
  const markerLength = marker.length;

  if (normalized.start === normalized.end) {
    const cursor = normalized.start;
    const hasPair =
      cursor >= markerLength &&
      text.slice(cursor - markerLength, cursor) === marker &&
      text.slice(cursor, cursor + markerLength) === marker;

    if (hasPair) {
      const next = `${text.slice(0, cursor - markerLength)}${text.slice(cursor + markerLength)}`;
      const nextCursor = cursor - markerLength;
      return { next, range: { start: nextCursor, end: nextCursor } };
    }

    const next = `${text.slice(0, cursor)}${marker}${marker}${text.slice(cursor)}`;
    const nextCursor = cursor + markerLength;
    return { next, range: { start: nextCursor, end: nextCursor } };
  }

  const selected = text.slice(normalized.start, normalized.end);
  const selectedHasWrappedMarker =
    selected.length >= markerLength * 2 &&
    selected.startsWith(marker) &&
    selected.endsWith(marker);

  if (selectedHasWrappedMarker) {
    const unwrapped = selected.slice(
      markerLength,
      selected.length - markerLength,
    );
    const next = `${text.slice(0, normalized.start)}${unwrapped}${text.slice(normalized.end)}`;
    return {
      next,
      range: {
        start: normalized.start,
        end: normalized.start + unwrapped.length,
      },
    };
  }

  const externalHasWrappedMarker =
    normalized.start >= markerLength &&
    text.slice(normalized.start - markerLength, normalized.start) === marker &&
    text.slice(normalized.end, normalized.end + markerLength) === marker;

  if (externalHasWrappedMarker) {
    const next = `${text.slice(0, normalized.start - markerLength)}${selected}${text.slice(normalized.end + markerLength)}`;
    return {
      next,
      range: {
        start: normalized.start - markerLength,
        end: normalized.end - markerLength,
      },
    };
  }

  const next = `${text.slice(0, normalized.start)}${marker}${selected}${marker}${text.slice(normalized.end)}`;
  return {
    next,
    range: {
      start: normalized.start + markerLength,
      end: normalized.end + markerLength,
    },
  };
}
