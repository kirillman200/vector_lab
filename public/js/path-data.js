// Pure SVG path-data helpers. Loaded as a plain script in the browser (globals)
// and require()-able from Node for the unit tests in tests/.
(function (global) {
  "use strict";

  const PATH_PARAM_COUNT = { m: 2, z: 0, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7 };
  const NUMBER_PATTERN = /[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/y;

  function round(value) {
    return Math.round(Number(value) * 1000) / 1000;
  }

  // Command-aware scanner. Unlike a flat number tokenizer this understands that
  // arc flags are single characters (so "0 0110,10" parses as 0 0 1 10 10), that
  // implicit repetitions of "m"/"M" become "l"/"L", and that explicit movetos
  // starting later subpaths must keep their own code.
  function parsePathData(d) {
    const commands = [];
    const text = String(d || "");
    let i = 0;

    const skipSeparators = () => {
      while (i < text.length && /[\s,]/.test(text[i])) i += 1;
    };
    const readNumber = () => {
      skipSeparators();
      NUMBER_PATTERN.lastIndex = i;
      const match = NUMBER_PATTERN.exec(text);
      if (!match || !match[0]) return null;
      i = NUMBER_PATTERN.lastIndex;
      return Number(match[0]);
    };
    const readFlag = () => {
      skipSeparators();
      if (text[i] === "0" || text[i] === "1") {
        const value = Number(text[i]);
        i += 1;
        return value;
      }
      return null;
    };

    let code = null;
    while (i < text.length) {
      skipSeparators();
      if (i >= text.length) break;
      if (/[a-zA-Z]/.test(text[i])) {
        code = text[i];
        i += 1;
      }
      if (!code) break;
      const lower = code.toLowerCase();
      const count = PATH_PARAM_COUNT[lower];
      if (count === undefined) break;
      if (count === 0) {
        commands.push({ code, values: [] });
        code = null;
        continue;
      }
      const values = [];
      for (let p = 0; p < count; p += 1) {
        const value = lower === "a" && (p === 3 || p === 4) ? readFlag() : readNumber();
        if (value === null || Number.isNaN(value)) return commands;
        values.push(value);
      }
      commands.push({ code, values });
      if (lower === "m") code = code === "m" ? "l" : "L";
      skipSeparators();
      if (i < text.length && /[a-zA-Z]/.test(text[i])) code = null;
    }
    return commands;
  }

  function serializePathData(commands) {
    return commands
      .map((command) => `${command.code} ${command.values.map((value) => round(value)).join(" ")}`.trim())
      .join(" ");
  }

  function pointsAttributeToPairs(points) {
    const nums = String(points || "").match(/[-+]?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/gi) || [];
    const pairs = [];
    for (let i = 0; i + 1 < nums.length; i += 2) {
      pairs.push({ x: Number(nums[i]), y: Number(nums[i + 1]) });
    }
    return pairs;
  }

  function pointsToPath(points, closed) {
    const pairs = pointsAttributeToPairs(points);
    if (!pairs.length) return "";
    return pairs.map((pair, index) => `${index ? "L" : "M"} ${pair.x} ${pair.y}`).join(" ") + (closed ? " Z" : "");
  }

  // Tracks the pen so relative commands land on the right absolute points.
  function pathToPoints(commands) {
    const points = [];
    let current = { x: 0, y: 0 };
    commands.forEach((command) => {
      const lower = command.code.toLowerCase();
      if (lower !== "m" && lower !== "l") return;
      const rel = command.code === lower;
      current = {
        x: rel ? current.x + command.values[0] : command.values[0],
        y: rel ? current.y + command.values[1] : command.values[1]
      };
      points.push(`${round(current.x)},${round(current.y)}`);
    });
    return points.join(" ");
  }

  function translatePathCommands(commands, dx, dy) {
    let firstMove = true;
    return commands.map((command) => {
      const code = command.code;
      const lower = code.toLowerCase();
      const rel = code === lower;
      const values = [...command.values];
      const shiftPair = (xIndex, yIndex) => {
        values[xIndex] = round(values[xIndex] + dx);
        values[yIndex] = round(values[yIndex] + dy);
      };

      if (lower === "m" && rel && firstMove) {
        shiftPair(0, 1);
      } else if (!rel) {
        if (lower === "m" || lower === "l" || lower === "t") {
          shiftPair(0, 1);
        } else if (lower === "h") {
          values[0] = round(values[0] + dx);
        } else if (lower === "v") {
          values[0] = round(values[0] + dy);
        } else if (lower === "c") {
          shiftPair(0, 1);
          shiftPair(2, 3);
          shiftPair(4, 5);
        } else if (lower === "s" || lower === "q") {
          shiftPair(0, 1);
          shiftPair(2, 3);
        } else if (lower === "a") {
          shiftPair(5, 6);
        }
      }
      if (lower === "m") firstMove = false;
      return { code, values };
    });
  }

  function pathCommandPoints(commands) {
    const points = [];
    let current = { x: 0, y: 0 };
    let subpath = { x: 0, y: 0 };

    commands.forEach((command) => {
      const lower = command.code.toLowerCase();
      const rel = command.code === lower;
      const base = { ...current };
      const absolute = (x, y) => ({ x: rel ? base.x + x : x, y: rel ? base.y + y : y });
      const add = (xIndex, yIndex) => {
        const point = absolute(command.values[xIndex], command.values[yIndex]);
        points.push(point);
        return point;
      };

      if (lower === "m") {
        current = add(0, 1);
        subpath = { ...current };
      } else if (lower === "l" || lower === "t") {
        current = add(0, 1);
      } else if (lower === "h") {
        current = { x: rel ? base.x + command.values[0] : command.values[0], y: current.y };
        points.push(current);
      } else if (lower === "v") {
        current = { x: current.x, y: rel ? base.y + command.values[0] : command.values[0] };
        points.push(current);
      } else if (lower === "c") {
        add(0, 1);
        add(2, 3);
        current = add(4, 5);
      } else if (lower === "s" || lower === "q") {
        add(0, 1);
        current = add(2, 3);
      } else if (lower === "a") {
        current = add(5, 6);
      } else if (lower === "z") {
        current = { ...subpath };
        points.push(current);
      }
    });
    return points;
  }

  // Builds draggable handle descriptors (endpoints and Bezier control points)
  // for a command list. Coordinates are in the element's local user space.
  function buildPathHandles(commands) {
    const handles = [];
    let current = { x: 0, y: 0 };
    let subpath = { x: 0, y: 0 };

    commands.forEach((command, commandIndex) => {
      const lower = command.code.toLowerCase();
      const rel = command.code === lower;
      const base = { ...current };
      const absolute = (x, y) => ({ x: rel ? base.x + x : x, y: rel ? base.y + y : y });
      const add = (xIndex, yIndex, kind, link = null) => {
        const point = absolute(command.values[xIndex], command.values[yIndex]);
        handles.push({ commandIndex, xIndex, yIndex, kind, x: point.x, y: point.y, base, rel, link });
        return point;
      };

      if (lower === "m") {
        current = add(0, 1, "end");
        subpath = { ...current };
      } else if (lower === "l" || lower === "t") {
        current = add(0, 1, "end");
      } else if (lower === "h") {
        const x = rel ? base.x + command.values[0] : command.values[0];
        handles.push({ commandIndex, xIndex: 0, yIndex: null, kind: "end", x, y: current.y, base, rel, link: null });
        current = { x, y: current.y };
      } else if (lower === "v") {
        const y = rel ? base.y + command.values[0] : command.values[0];
        handles.push({ commandIndex, xIndex: null, yIndex: 0, kind: "end", x: current.x, y, base, rel, link: null });
        current = { x: current.x, y };
      } else if (lower === "c") {
        add(0, 1, "control", base);
        add(2, 3, "control");
        current = add(4, 5, "end");
        handles[handles.length - 2].link = current;
        handles[handles.length - 3].link = base;
      } else if (lower === "s" || lower === "q") {
        add(0, 1, "control", base);
        current = add(2, 3, "end");
        handles[handles.length - 2].link = lower === "q" ? current : base;
      } else if (lower === "a") {
        current = add(5, 6, "end");
      } else if (lower === "z") {
        current = { ...subpath };
      }
    });

    return handles;
  }

  const api = {
    round,
    parsePathData,
    serializePathData,
    pointsAttributeToPairs,
    pointsToPath,
    pathToPoints,
    translatePathCommands,
    pathCommandPoints,
    buildPathHandles
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  Object.assign(global, api);
})(typeof globalThis !== "undefined" ? globalThis : this);
