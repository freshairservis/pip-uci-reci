/*! PipWrite 2.0 - handwriting module for the Serbian Cyrillic reading/writing game.
 *  Plain JS, no libraries, no modules. Attaches window.PipWrite.
 *  Contents: letter stroke data, $P recognizer (lenient), drawing pad UI, word pads.
 */
(function (root) {
  'use strict';

  var VERSION = '2.0.0';
  var D2R = Math.PI / 180;

  /* ====================================================================
   * 1. Geometry helpers for building letters
   *    Letter box: x 0..100, y 0..100 (y=0 cap line, y=100 baseline).
   *    Angles in arc() are degrees, 0 = +x (right), 90 = +y (DOWN on screen),
   *    so increasing angle = clockwise on screen, decreasing = counter-clockwise.
   * ==================================================================== */
  var STEP = 4;

  function seg(x0, y0, x1, y1, step) {
    var d = Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0));
    var n = Math.max(1, Math.ceil(d / (step || STEP)));
    var out = [];
    for (var i = 0; i <= n; i++) out.push([x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n]);
    return out;
  }

  // polyline through vertices, sampled every ~4 units
  function path(v, step) {
    var out = [];
    for (var i = 0; i < v.length - 1; i++) {
      var part = seg(v[i][0], v[i][1], v[i + 1][0], v[i + 1][1], step);
      if (i > 0) part.shift();
      for (var k = 0; k < part.length; k++) out.push(part[k]);
    }
    return out;
  }

  function arc(cx, cy, rx, ry, deg0, deg1, steps) {
    var sweep = Math.abs(deg1 - deg0) * D2R;
    var n = steps || Math.max(4, Math.ceil(sweep * (rx + ry) / 2 / STEP));
    var out = [];
    for (var i = 0; i <= n; i++) {
      var a = (deg0 + (deg1 - deg0) * i / n) * D2R;
      out.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
    }
    return out;
  }

  // cubic bezier p0..p3 (each [x,y])
  function bez(p0, p1, p2, p3, steps) {
    var approx = Math.abs(p1[0] - p0[0]) + Math.abs(p1[1] - p0[1]) + Math.abs(p2[0] - p1[0]) +
      Math.abs(p2[1] - p1[1]) + Math.abs(p3[0] - p2[0]) + Math.abs(p3[1] - p2[1]);
    var n = steps || Math.max(6, Math.ceil(approx * 0.9 / STEP));
    var out = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n, u = 1 - t;
      out.push([
        u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]
      ]);
    }
    return out;
  }

  // concatenate sampled parts into one stroke, dropping coincident joint points
  function cat() {
    var out = [];
    for (var a = 0; a < arguments.length; a++) {
      var part = arguments[a];
      for (var i = 0; i < part.length; i++) {
        if (i === 0 && out.length) {
          var l = out[out.length - 1];
          if (Math.abs(l[0] - part[0][0]) < 0.05 && Math.abs(l[1] - part[0][1]) < 0.05) continue;
        }
        out.push([part[i][0], part[i][1]]);
      }
    }
    return out;
  }

  /* ====================================================================
   * 2. The 30 letters (printed capitals, school stroke order)
   * ==================================================================== */
  var ORDER = ['А', 'Б', 'В', 'Г', 'Д', 'Ђ', 'Е', 'Ж', 'З', 'И', 'Ј', 'К', 'Л', 'Љ', 'М',
    'Н', 'Њ', 'О', 'П', 'Р', 'С', 'Т', 'Ћ', 'У', 'Ф', 'Х', 'Ц', 'Ч', 'Џ', 'Ш'];

  var G = {};

  G['А'] = [
    path([[47, 0], [8, 100]]),
    path([[53, 0], [92, 100]]),
    path([[21.5, 66], [78.5, 66]])
  ];

  G['Б'] = [
    path([[20, 0], [20, 100]]),
    path([[20, 0], [80, 0]]),
    cat(path([[20, 47], [50, 47]]), arc(50, 73.5, 31, 26.5, -90, 90), path([[50, 100], [20, 100]]))
  ];

  G['В'] = [
    path([[20, 0], [20, 100]]),
    cat(path([[20, 0], [50, 0]]), arc(50, 23.5, 28, 23.5, -90, 90), path([[50, 47], [20, 47]])),
    cat(path([[20, 47], [50, 47]]), arc(50, 73.5, 32, 26.5, -90, 90), path([[50, 100], [20, 100]]))
  ];

  G['Г'] = [
    path([[22, 0], [22, 100]]),
    path([[22, 0], [80, 0]])
  ];

  G['Д'] = [
    path([[30, 0], [17, 100]]),
    path([[30, 0], [74, 0], [87, 100]]),
    path([[12, 118], [12, 100], [92, 100], [92, 118]])
  ];

  G['Ђ'] = [
    path([[6, 0], [68, 0]]),
    path([[26, 0], [26, 100]]),
    cat(arc(50, 62, 24, 24, 180, 360), path([[74, 62], [74, 94]]), arc(58, 94, 16, 16, 0, 105))
  ];

  G['Е'] = [
    path([[24, 0], [24, 100]]),
    path([[24, 0], [78, 0]]),
    path([[24, 50], [70, 50]]),
    path([[24, 100], [78, 100]])
  ];

  G['Ж'] = [
    path([[50, 0], [50, 100]]),
    path([[8, 0], [92, 100]]),
    path([[92, 0], [8, 100]])
  ];

  G['З'] = [
    cat(arc(48, 24.5, 28, 24.5, -155, 100), arc(48, 74.5, 32, 25.5, -100, 155))
  ];

  G['И'] = [
    path([[22, 0], [22, 100]]),
    path([[78, 0], [22, 100]]),
    path([[78, 0], [78, 100]])
  ];

  G['Ј'] = [
    cat(path([[62, 0], [62, 76]]), arc(40, 76, 22, 24, 0, 165))
  ];

  G['К'] = [
    path([[22, 0], [22, 100]]),
    path([[80, 0], [24, 54]]),
    path([[24, 54], [82, 100]])
  ];

  G['Л'] = [
    cat(bez([34, 0], [33, 48], [26, 84], [8, 100])),
    path([[34, 0], [80, 0], [80, 100]])
  ];

  G['Љ'] = [
    cat(bez([24, 0], [23, 48], [17, 84], [2, 100])),
    path([[24, 0], [48, 0], [48, 100]]),
    cat(path([[48, 46], [68, 46]]), arc(68, 73, 28, 27, -90, 90), path([[68, 100], [48, 100]]))
  ];

  G['М'] = [
    path([[12, 0], [12, 100]]),
    path([[12, 0], [50, 100], [88, 0]]),
    path([[88, 0], [88, 100]])
  ];

  G['Н'] = [
    path([[22, 0], [22, 100]]),
    path([[78, 0], [78, 100]]),
    path([[22, 50], [78, 50]])
  ];

  G['Њ'] = [
    path([[8, 0], [8, 100]]),
    path([[50, 0], [50, 100]]),
    cat(path([[8, 48], [66, 48]]), arc(66, 74, 28, 26, -90, 90), path([[66, 100], [50, 100]]))
  ];

  G['О'] = [
    arc(50, 50, 38, 50, -50, -410)
  ];

  G['П'] = [
    path([[22, 0], [22, 100]]),
    path([[22, 0], [78, 0], [78, 100]])
  ];

  G['Р'] = [
    path([[22, 0], [22, 100]]),
    cat(path([[22, 0], [52, 0]]), arc(52, 28, 28, 28, -90, 90), path([[52, 56], [22, 56]]))
  ];

  G['С'] = [
    arc(52, 50, 36, 50, -45, -315)
  ];

  G['Т'] = [
    path([[8, 0], [92, 0]]),
    path([[50, 0], [50, 100]])
  ];

  G['Ћ'] = [
    path([[6, 0], [68, 0]]),
    path([[26, 0], [26, 100]]),
    cat(arc(50, 62, 24, 24, 180, 360), path([[74, 62], [74, 100]]))
  ];

  G['У'] = [
    path([[10, 0], [51.6, 60]]),
    path([[90, 0], [26, 100]])
  ];

  G['Ф'] = [
    path([[50, 0], [50, 100]]),
    arc(50, 50, 38, 33, -50, -410)
  ];

  G['Х'] = [
    path([[12, 0], [88, 100]]),
    path([[88, 0], [12, 100]])
  ];

  G['Ц'] = [
    path([[16, 0], [16, 100], [84, 100]]),
    path([[84, 0], [84, 118]])
  ];

  G['Ч'] = [
    cat(path([[18, 0], [18, 34]]), bez([18, 34], [18, 62], [48, 64], [80, 52])),
    path([[80, 0], [80, 100]])
  ];

  G['Џ'] = [
    path([[16, 0], [16, 100], [84, 100]]),
    path([[84, 0], [84, 100]]),
    path([[50, 100], [50, 118]])
  ];

  G['Ш'] = [
    path([[10, 0], [10, 100], [90, 100]]),
    path([[50, 0], [50, 100]]),
    path([[90, 0], [90, 100]])
  ];

  // center every letter horizontally in the box, round to 0.1
  var LETTERS = {};
  ORDER.forEach(function (ch) {
    var st = G[ch];
    if (!st) throw new Error('PipWrite: missing letter ' + ch);
    var minx = Infinity, maxx = -Infinity;
    st.forEach(function (s) { s.forEach(function (p) { if (p[0] < minx) minx = p[0]; if (p[0] > maxx) maxx = p[0]; }); });
    var dx = 50 - (minx + maxx) / 2;
    LETTERS[ch] = st.map(function (s) {
      return s.map(function (p) { return [Math.round((p[0] + dx) * 10) / 10, Math.round(p[1] * 10) / 10]; });
    });
  });

  function normLetter(l) {
    if (!l) return '';
    l = String(l).charAt(0).toUpperCase();
    return LETTERS[l] ? l : '';
  }

  /* ====================================================================
   * 3. Stroke-order markers (numbered start dots + direction arrows)
   *    Shared by the pad and by the SVG grid generator.
   * ==================================================================== */
  function polyLen(pts) {
    var L = 0;
    for (var i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    return L;
  }

  function pointAt(pts, s) {
    var acc = 0;
    for (var i = 1; i < pts.length; i++) {
      var d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (acc + d >= s || i === pts.length - 1) {
        var t = d > 0 ? Math.min(1, Math.max(0, (s - acc) / d)) : 0;
        return {
          x: pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t,
          y: pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t,
          ang: Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0])
        };
      }
      acc += d;
    }
    return { x: pts[0][0], y: pts[0][1], ang: 0 };
  }

  function distToStroke(px, py, pts) {
    var best = Infinity;
    for (var i = 1; i < pts.length; i++) {
      var ax = pts[i - 1][0], ay = pts[i - 1][1], bx = pts[i][0], by = pts[i][1];
      var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
      var t = l2 > 0 ? clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0;
      var d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
      if (d < best) best = d;
    }
    return best;
  }

  function angDiff(a, b) {
    var d = Math.abs(a - b) % (2 * Math.PI);
    return d > Math.PI ? 2 * Math.PI - d : d;
  }

  // minGap (letter units): minimum distance between two start dots (the pad passes a larger value for small pads)
  function markers(letter, minGap) {
    minGap = minGap || 12;
    var strokes = LETTERS[normLetter(letter)];
    var out = { dots: [], arrows: [] };
    if (!strokes) return out;
    strokes.forEach(function (pts, k) {
      var len = polyLen(pts);
      // start dot, nudged along the stroke if it would sit on an earlier dot
      var s0 = 0, p0 = pointAt(pts, 0);
      for (var guard = 0; guard < 24; guard++) {
        var clash = out.dots.some(function (d) { return Math.hypot(d.x - p0.x, d.y - p0.y) < minGap; });
        if (!clash) break;
        s0 += 3;
        p0 = pointAt(pts, Math.min(s0, len));
      }
      out.dots.push({ x: p0.x, y: p0.y, n: k + 1, stroke: k });
      // arrows
      var from = s0 + Math.max(14, minGap * 0.9), to = len - 8;
      var positions = [];
      if (to - from < 8) {
        positions.push(Math.max(s0 + 6, len * 0.62));
      } else {
        var cnt = len < 110 ? 1 : (len < 200 ? 2 : 3);
        for (var a = 0; a < cnt; a++) positions.push(from + (to - from) * (a + 0.5) / cnt);
      }
      positions.forEach(function (s) {
        var best = s, bestD = -1, picked = false, offs = [0, 5, -5, 10, -10, 15, -15, 20, -20, 25, -25, 30, -30];
        for (var oi = 0; oi < offs.length && !picked; oi++) {
          var sc = s + offs[oi];
          if (sc < from - 4 || sc > len - 5) continue;
          var a1 = pointAt(pts, Math.max(0, sc - 4)).ang, a2 = pointAt(pts, Math.min(len, sc + 4)).ang;
          if (angDiff(a1, a2) >= 0.5) continue;          // not on a corner
          var pp = pointAt(pts, sc), dmin = Infinity;      // far from other strokes (crossings, shared segments)
          for (var ks = 0; ks < strokes.length; ks++) {
            if (ks !== k) dmin = Math.min(dmin, distToStroke(pp.x, pp.y, strokes[ks]));
          }
          if (dmin >= 9) { best = sc; picked = true; }
          else if (dmin > bestD) { bestD = dmin; best = sc; }
        }
        var pa = pointAt(pts, best);
        var b0 = pointAt(pts, Math.max(0, best - 3)), b1 = pointAt(pts, Math.min(len, best + 3));
        out.arrows.push({ x: pa.x, y: pa.y, ang: Math.atan2(b1.y - b0.y, b1.x - b0.x), stroke: k });
      });
    });
    return out;
  }

  /* ====================================================================
   * 4. $P point-cloud recognizer (Vatavu, Anthony, Wobbrock 2012)
   * ==================================================================== */
  var CFG = {
    n: 32,            // points per cloud (the $P paper uses 32)
    aspect: 0.5,       // see makeCloud
    abs: 0.11,        // absolute threshold on normalised distance of the expected letter
    ratio: 1.25,      // expected may be this much worse than the best match ... (spec said 1.15; 1.25 lifts the weakest letters B/Dje to >=97%)
    maxRank: 3,       // ... if it is within this rank
    mirrorMaxRank: 2, // a mirrored drawing must be rank <= 2 and within mirrorRatio of the best (stricter: mirror images of E/Z, R/CH, S/Z look alike)
    mirrorRatio: 1.05,
    minSize: 8,       // min extent of drawing (same unit as the input) else "too small"
    tinyFrac: 0.05    // strokes shorter than this fraction of the drawing extent are dropped (taps)
  };

  function cleanStrokes(strokes) {
    var out = [];
    (strokes || []).forEach(function (s) {
      var pts = [];
      (s || []).forEach(function (p) {
        var x, y;
        if (p && typeof p.x === 'number') { x = p.x; y = p.y; } else if (p && p.length >= 2) { x = +p[0]; y = +p[1]; } else return;
        if (!isFinite(x) || !isFinite(y)) return;
        var l = pts[pts.length - 1];
        if (l && l[0] === x && l[1] === y) return;
        pts.push([x, y]);
      });
      if (pts.length) out.push(pts);
    });
    return out;
  }

  function bbox(strokes) {
    var minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    strokes.forEach(function (s) {
      s.forEach(function (p) {
        if (p[0] < minx) minx = p[0]; if (p[0] > maxx) maxx = p[0];
        if (p[1] < miny) miny = p[1]; if (p[1] > maxy) maxy = p[1];
      });
    });
    return { minx: minx, miny: miny, maxx: maxx, maxy: maxy, w: maxx - minx, h: maxy - miny };
  }

  // resample to n points across all strokes (jumps between strokes are not counted), scale to unit box, centroid at origin
  function makeCloud(strokes, n) {
    n = n || CFG.n;
    var pts = [], total = 0, i, j;
    for (i = 0; i < strokes.length; i++) {
      for (j = 0; j < strokes[i].length; j++) {
        pts.push({ x: strokes[i][j][0], y: strokes[i][j][1], id: i });
        if (j > 0) total += Math.hypot(strokes[i][j][0] - strokes[i][j - 1][0], strokes[i][j][1] - strokes[i][j - 1][1]);
      }
    }
    if (!pts.length || total <= 0) return null;
    var I = total / (n - 1), D = 0, np = [{ x: pts[0].x, y: pts[0].y, id: pts[0].id }];
    for (i = 1; i < pts.length; i++) {
      if (pts[i].id === pts[i - 1].id) {
        var d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
        if (d > 0 && D + d >= I) {
          var t = (I - D) / d;
          var q = { x: pts[i - 1].x + t * (pts[i].x - pts[i - 1].x), y: pts[i - 1].y + t * (pts[i].y - pts[i - 1].y), id: pts[i].id };
          np.push(q);
          pts.splice(i, 0, q);
          D = 0;
        } else D += d;
      }
    }
    var last = pts[pts.length - 1];
    while (np.length < n) np.push({ x: last.x, y: last.y, id: last.id });
    if (np.length > n) np.length = n;
    // scale (uniform, keeps aspect) + translate to centroid
    var minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    np.forEach(function (p) {
      if (p.x < minx) minx = p.x; if (p.x > maxx) maxx = p.x;
      if (p.y < miny) miny = p.y; if (p.y > maxy) maxy = p.y;
    });
    var w = maxx - minx, h = maxy - miny, ext = Math.max(w, h) || 1e-6;
    // aspect exponent: 1 = classic $P (uniform scale), 0 = stretch to a unit square (aspect-free)
    var fx = Math.max(w / ext, 0.12), fy = Math.max(h / ext, 0.12), beta = CFG.aspect;
    var kx = Math.pow(fx, beta) / (ext * fx), ky = Math.pow(fy, beta) / (ext * fy);
    var cx = 0, cy = 0, xs = new Float64Array(n), ys = new Float64Array(n);
    for (i = 0; i < n; i++) {
      xs[i] = (np[i].x - minx) * kx; ys[i] = (np[i].y - miny) * ky;
      cx += xs[i]; cy += ys[i];
    }
    cx /= n; cy /= n;
    for (i = 0; i < n; i++) { xs[i] -= cx; ys[i] -= cy; }
    return { xs: xs, ys: ys, n: n };
  }

  var matchedBuf = new Uint8Array(512);
  function cloudDist(ax, ay, bx, by, start, n) {
    var matched = matchedBuf, i, j;
    for (i = 0; i < n; i++) matched[i] = 0;
    var sum = 0; i = start;
    do {
      var best = -1, bd = 1e18, x = ax[i], y = ay[i];
      for (j = 0; j < n; j++) {
        if (!matched[j]) {
          var dx = x - bx[j], dy = y - by[j], dd = dx * dx + dy * dy;
          if (dd < bd) { bd = dd; best = j; }
        }
      }
      matched[best] = 1;
      sum += (1 - ((i - start + n) % n) / n) * Math.sqrt(bd);
      i = (i + 1) % n;
    } while (i !== start);
    return sum;
  }

  // normalised: weighted mean point distance in the unit box
  function greedyMatch(a, b) {
    var n = a.n, step = Math.floor(Math.pow(n, 0.5)), min = Infinity;
    for (var i = 0; i < n; i += step) {
      var d1 = cloudDist(a.xs, a.ys, b.xs, b.ys, i, n);
      var d2 = cloudDist(b.xs, b.ys, a.xs, a.ys, i, n);
      if (d1 < min) min = d1;
      if (d2 < min) min = d2;
    }
    return min / ((n + 1) / 2);
  }

  // template variants: original + narrower + wider + slanted (italic)
  var VARIANTS = [
    { sx: 1.0, shear: 0 },
    { sx: 0.78, shear: 0 },
    { sx: 1.28, shear: 0 },
    { sx: 1.0, shear: 0.2 }
  ];

  var TPL = null;
  function templates() {
    if (TPL) return TPL;
    TPL = [];
    ORDER.forEach(function (ch) {
      VARIANTS.forEach(function (v, vi) {
        var st = LETTERS[ch].map(function (s) {
          return s.map(function (p) { return [50 + (p[0] - 50) * v.sx + v.shear * (50 - p[1]), p[1]]; });
        });
        var c = makeCloud(st, CFG.n);
        if (c) TPL.push({ letter: ch, variant: vi, cloud: c });
      });
    });
    return TPL;
  }

  function prepare(strokes) {
    var st = cleanStrokes(strokes);
    if (!st.length) return null;
    var bb = bbox(st), ext = Math.max(bb.w, bb.h);
    if (!(ext > 0)) return null;
    // drop taps / tiny specks when there is real drawing
    var kept = st.filter(function (s) {
      var L = 0;
      for (var i = 1; i < s.length; i++) L += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]);
      return L >= CFG.tinyFrac * ext;
    });
    if (kept.length) { st = kept; bb = bbox(st); ext = Math.max(bb.w, bb.h); }
    return { strokes: st, bb: bb, ext: ext };
  }

  function mirrorStrokes(st, bb) {
    var s = bb.minx + bb.maxx;
    return st.map(function (p) { return p.map(function (q) { return [s - q[0], q[1]]; }); });
  }

  // distance of drawing to every letter (min over variants) + sorted order
  function scoreStrokes(st) {
    var cloud = makeCloud(st, CFG.n);
    if (!cloud) return null;
    var d = {};
    templates().forEach(function (t) {
      var v = greedyMatch(cloud, t.cloud);
      if (d[t.letter] === undefined || v < d[t.letter]) d[t.letter] = v;
    });
    var order = ORDER.slice().sort(function (a, b) { return d[a] - d[b]; });
    return { d: d, order: order };
  }

  function decide(sc, expected, cfg, mirrored) {
    cfg = cfg || CFG;
    var maxRank = mirrored ? cfg.mirrorMaxRank : cfg.maxRank, ratio = mirrored ? cfg.mirrorRatio : cfg.ratio;
    var rank = sc.order.indexOf(expected) + 1;
    var de = sc.d[expected], best = sc.order[0], db = sc.d[best];
    var ok = rank > 0 && de <= cfg.abs && (rank === 1 || (rank <= maxRank && de <= ratio * db));
    return { ok: ok, best: best, rank: rank, dist: de, bestDist: db,
      score: Math.max(0, Math.min(1, 1 - de / (2 * cfg.abs))) };
  }

  // strokes: array of arrays of {x,y} (or [x,y]) in ANY coordinates.
  // opts (all optional): minSize, abs, ratio, maxRank, mirror (default true)
  function recognize(strokes, expected, opts) {
    opts = opts || {};
    var cfg = {};
    for (var k in CFG) cfg[k] = CFG[k];
    for (k in opts) if (opts[k] != null) cfg[k] = opts[k];
    var exp = normLetter(expected);
    var prep = prepare(strokes);
    var fail = { ok: false, best: null, rank: 0, score: 0, mirrored: false, dist: null };
    if (!prep || prep.ext < cfg.minSize) { fail.reason = 'tiny'; return fail; }
    var sc = scoreStrokes(prep.strokes);
    if (!sc) { fail.reason = 'tiny'; return fail; }
    if (!exp) { fail.best = sc.order[0]; fail.reason = 'unknown-letter'; return fail; }
    var r = decide(sc, exp, cfg);
    var res = { ok: r.ok, best: r.best, rank: r.rank, score: r.score, mirrored: false, dist: r.dist };
    if (!r.ok && opts.mirror !== false) {
      var sm = scoreStrokes(mirrorStrokes(prep.strokes, prep.bb));
      if (sm) {
        var rm = decide(sm, exp, cfg, true);
        if (rm.ok) {
          return { ok: true, best: rm.best, rank: rm.rank, score: rm.score, mirrored: true, dist: rm.dist };
        }
      }
    }
    return res;
  }

  /* ====================================================================
   * 5. Drawing pad
   * ==================================================================== */
  var TRACE = { tol: 0.065, tolInk: 0.075, cover: 0.75, precision: 0.8 };   // fractions of pad size
  var PAD_TOP = 0.11;      // cap line, fraction of pad size
  var PAD_U = 0.0064;      // one letter unit, fraction of pad size (100 units = 64%)
  var FALLBACK = {
    bg: '#fffdf6', ink: '#2b3170', guide: 'rgba(86,120,200,0.40)',
    model: 'rgba(90,110,200,0.24)', accent: '#17a673'
  };

  function layoutFor(size) {
    var u = size * PAD_U;
    return { u: u, ox: size / 2 - 50 * u, oy: size * PAD_TOP };
  }

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function ease(t) { t = clamp(t, 0, 1); return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function sizeFromContainer(el) {
    var w = 0;
    try { w = el.clientWidth || el.getBoundingClientRect().width; } catch (e) { w = 0; }
    if (!(w > 0)) w = 300;
    return clamp(Math.floor(w), 64, 320);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // quadratic midpoint smoothing; pts = [[x,y],...] in px
  function tracePath(ctx, pts, keep) {
    if (!keep) ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    if (pts.length === 1) { ctx.lineTo(pts[0][0] + 0.01, pts[0][1]); return; }
    if (pts.length === 2) { ctx.lineTo(pts[1][0], pts[1][1]); return; }
    for (var i = 1; i < pts.length - 1; i++) {
      var mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
  }

  // dense template in pad pixels (arrays of [x,y])
  function templatePx(letter, lay, stepUnits) {
    var out = [];
    (LETTERS[letter] || []).forEach(function (s) {
      var dense = [], i;
      for (i = 0; i < s.length - 1; i++) {
        var part = seg(s[i][0], s[i][1], s[i + 1][0], s[i + 1][1], stepUnits);
        if (i > 0) part.shift();
        dense = dense.concat(part);
      }
      if (s.length === 1) dense = [s[0]];
      out.push(dense.map(function (p) { return [lay.ox + p[0] * lay.u, lay.oy + p[1] * lay.u]; }));
    });
    return out;
  }

  // Trace-mode check. strokesPx: [[ [x,y], ... ], ...] in pad pixels, size = pad size in px.
  //  coverage  = share of template points that have ink nearby
  //  precision = share of ink that lies near the template
  // plus a recognizer cross-check so that a different letter drawn over the model does not pass.
  function traceCheckPx(letter, size, strokesPx) {
    var lay = layoutFor(size);
    var tpl = [];
    templatePx(letter, lay, 2).forEach(function (s) { for (var i = 0; i < s.length; i++) tpl.push(s[i]); });
    var ink = [], sp = Math.max(2, size * 0.012);
    strokesPx.forEach(function (s) {
      if (s.length === 1) { ink.push(s[0]); return; }
      for (var i = 1; i < s.length; i++) {
        var d = Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]);
        var n = Math.max(1, Math.ceil(d / sp));
        for (var k = (i === 1 ? 0 : 1); k <= n; k++) ink.push([s[i - 1][0] + (s[i][0] - s[i - 1][0]) * k / n, s[i - 1][1] + (s[i][1] - s[i - 1][1]) * k / n]);
      }
    });
    if (!ink.length || !tpl.length) return { ok: false, best: null, rank: 0, score: 0, mirrored: false, coverage: 0, precision: 0 };
    var tol = Math.max(size * TRACE.tol, 7), tol2 = Math.max(size * TRACE.tolInk, 8);
    var tt = tol * tol, t2 = tol2 * tol2, i, j, covered = 0, near = 0;
    for (i = 0; i < tpl.length; i++) {
      for (j = 0; j < ink.length; j++) {
        var dx = tpl[i][0] - ink[j][0], dy = tpl[i][1] - ink[j][1];
        if (dx * dx + dy * dy <= tt) { covered++; break; }
      }
    }
    for (j = 0; j < ink.length; j++) {
      for (i = 0; i < tpl.length; i++) {
        var ex = tpl[i][0] - ink[j][0], ey = tpl[i][1] - ink[j][1];
        if (ex * ex + ey * ey <= t2) { near++; break; }
      }
    }
    var cov = covered / tpl.length, prec = near / ink.length;
    var ok = cov >= TRACE.cover && prec >= TRACE.precision;
    var rec = null;
    if (ok) {
      // a different letter scribbled over the model must not pass; very clean tracing always passes
      rec = recognize(strokesPx.map(function (s) { return s.map(function (p) { return { x: p[0], y: p[1] }; }); }), letter,
        { minSize: size * 0.14, mirror: false, abs: CFG.abs * 1.5, maxRank: 6, ratio: 1.6 });
      if (!rec.ok && !(cov >= 0.93 && prec >= 0.93 && rec.rank > 0 && rec.rank <= 8)) ok = false;
    }
    return { ok: ok, best: ok ? letter : (rec && rec.best) || null, rank: ok ? 1 : 0, score: Math.round(cov * prec * 100) / 100,
      mirrored: false, coverage: Math.round(cov * 100) / 100, precision: Math.round(prec * 100) / 100 };
  }

  function createPad(container, opts) {
    if (!container) throw new Error('PipWrite.createPad: container element required');
    opts = opts || {};
    var doc = container.ownerDocument || document;
    var win = doc.defaultView || window;

    var mode = opts.mode || 'trace';
    var letter = normLetter(opts.letter);
    var autoSize = !(opts.size > 0);
    var size = autoSize ? sizeFromContainer(container) : clamp(Math.round(opts.size), 40, 320);
    var snapOn = opts.snap !== false;
    var autoMs = opts.autoCheckMs == null ? 1100 : opts.autoCheckMs;
    var dpr = 1;

    var strokes = [];          // [[nx,ny],...] normalised to pad size
    var cur = null, activeId = null;
    var enabled = true, active = true, dimmed = false, ring = !!opts.ring, solved = false, destroyed = false;
    var autoTimer = 0, raf = 0, colors = null;
    var snapP = 0, snapAnim = null, demoAnim = null, lastTs = 0;

    var rootEl = doc.createElement('div');
    rootEl.className = 'pipwrite-pad';
    var canvas = doc.createElement('canvas');
    canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;-ms-touch-action:none;' +
      '-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;cursor:crosshair;';
    rootEl.appendChild(canvas);
    container.appendChild(rootEl);
    var ctx = canvas.getContext('2d');

    function applySize() {
      dpr = Math.max(1, Math.min(3, win.devicePixelRatio || 1));
      rootEl.style.cssText = 'position:relative;display:block;margin:0 auto;touch-action:none;-ms-touch-action:none;' +
        '-webkit-user-select:none;user-select:none;border-radius:' + Math.round(size * 0.06) + 'px;' +
        'width:' + size + 'px;height:' + size + 'px;max-width:100%;' +
        'transition:opacity .25s ease, box-shadow .25s ease;' +
        (dimmed ? 'opacity:.42;' : '');
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
      updateRing();
    }

    function updateRing() {
      var c = readColors();
      rootEl.style.boxShadow = (active && ring) ? '0 0 0 3px ' + c.accent : 'none';
    }

    function readColors() {
      var cs = null, c = {};
      try { cs = win.getComputedStyle(container); } catch (e) { cs = null; }
      function v(name, fb) {
        var s = cs ? cs.getPropertyValue(name) : '';
        s = s ? String(s).trim() : '';
        return s || fb;
      }
      c.bg = v('--pad-bg', FALLBACK.bg);
      c.ink = v('--pad-ink', FALLBACK.ink);
      c.guide = v('--pad-guide', FALLBACK.guide);
      c.model = v('--pad-model', FALLBACK.model);
      c.accent = v('--pad-accent', FALLBACK.accent);
      colors = c;
      return c;
    }

    /* ---- drawing ---- */
    function inkWidth() { return Math.max(4, size * 0.055); }

    function pxStrokes() {
      return strokes.map(function (s) { return s.map(function (p) { return [p[0] * size, p[1] * size]; }); });
    }

    function drawGuides(lay) {
      var lw = Math.max(1, size * 0.006), x0 = size * 0.05, x1 = size * 0.95;
      ctx.save();
      ctx.strokeStyle = colors.guide; ctx.lineWidth = lw; ctx.lineCap = 'round';
      var yTop = lay.oy, yBase = lay.oy + 100 * lay.u, yDesc = lay.oy + 118 * lay.u;
      ctx.beginPath(); ctx.moveTo(x0, yTop); ctx.lineTo(x1, yTop); ctx.stroke();
      ctx.lineWidth = lw * 1.6;
      ctx.beginPath(); ctx.moveTo(x0, yBase); ctx.lineTo(x1, yBase); ctx.stroke();
      ctx.lineWidth = lw; ctx.setLineDash([lw * 3, lw * 4]);
      ctx.beginPath(); ctx.moveTo(x0, yDesc); ctx.lineTo(x1, yDesc); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    function drawTemplate(lay, width, color, alpha, ox, oy, u) {
      ctx.save();
      ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = width;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      // one path for all strokes, so overlaps are painted once (no darker crossings)
      ctx.beginPath();
      (LETTERS[letter] || []).forEach(function (s) {
        tracePath(ctx, s.map(function (p) { return [ox + p[0] * u, oy + p[1] * u]; }), true);
      });
      ctx.stroke();
      ctx.restore();
    }

    function drawModelTrace(lay) {
      drawTemplate(lay, Math.max(6, size * 0.075), colors.model, 1, lay.ox, lay.oy, lay.u);
      var r = Math.max(6, size * 0.042);
      var m = markers(letter, Math.min(30, (2 * r + 3) / lay.u));
      var u = lay.u, ar = Math.max(4.5, 5.2 * u);
      ctx.save();
      ctx.globalAlpha = 1 - snapP;          // markers fade out when the letter is solved
      ctx.fillStyle = colors.accent;
      m.arrows.forEach(function (a) {
        var x = lay.ox + a.x * u, y = lay.oy + a.y * u, c = Math.cos(a.ang), s = Math.sin(a.ang);
        ctx.beginPath();
        ctx.moveTo(x + c * ar * 1.0, y + s * ar * 1.0);
        ctx.lineTo(x - c * ar * 0.7 - s * ar * 0.85, y - s * ar * 0.7 + c * ar * 0.85);
        ctx.lineTo(x - c * ar * 0.7 + s * ar * 0.85, y - s * ar * 0.7 - c * ar * 0.85);
        ctx.closePath(); ctx.fill();
      });
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '700 ' + Math.round(r * 1.25) + 'px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
      m.dots.forEach(function (d) {
        var x = lay.ox + d.x * u, y = lay.oy + d.y * u;
        ctx.fillStyle = colors.accent;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = Math.max(1.5, r * 0.18); ctx.strokeStyle = '#fff';
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.fillText(String(d.n), x, y + r * 0.06);
      });
      ctx.restore();
    }

    function drawModelCorner() {
      var card = size * 0.23, cx0 = size * 0.02, cy0 = size * 0.02;
      var u = card * 0.8 / 118, ox = cx0 + card / 2 - 50 * u, oy = cy0 + card * 0.08;
      ctx.save();
      ctx.globalAlpha = 0.92;
      roundRect(ctx, cx0, cy0, card, card, card * 0.16);
      ctx.fillStyle = colors.bg; ctx.fill();
      ctx.globalAlpha = 1; ctx.strokeStyle = colors.guide; ctx.lineWidth = Math.max(1, size * 0.005); ctx.stroke();
      ctx.restore();
      drawTemplate(null, Math.max(2, card * 0.075), colors.ink, 0.85, ox, oy, u);
    }

    function drawInk(alpha) {
      if (alpha <= 0.01) return;
      ctx.save();
      ctx.globalAlpha = alpha; ctx.strokeStyle = colors.ink; ctx.fillStyle = colors.ink;
      ctx.lineWidth = inkWidth(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      strokes.forEach(function (s) {
        var pts = s.map(function (p) { return [p[0] * size, p[1] * size]; });
        if (pts.length === 1) { ctx.beginPath(); ctx.arc(pts[0][0], pts[0][1], inkWidth() / 2, 0, Math.PI * 2); ctx.fill(); }
        else { tracePath(ctx, pts); ctx.stroke(); }
      });
      ctx.restore();
    }

    function drawDemo(lay, t) {
      var d = demoAnim; if (!d) return;
      var alpha = 1;
      if (t > d.writeEnd + d.hold) alpha = 1 - clamp((t - d.writeEnd - d.hold) / d.fade, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha; ctx.strokeStyle = colors.accent; ctx.fillStyle = colors.accent;
      ctx.lineWidth = Math.max(5, size * 0.062); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      var tip = null;
      d.steps.forEach(function (st) {
        if (t <= st.start) return;
        var frac = ease((t - st.start) / st.dur);
        if (frac >= 1) { tracePath(ctx, st.pts); ctx.stroke(); tip = null; return; }
        var target = frac * st.len, acc = 0, part = [st.pts[0]];
        for (var i = 1; i < st.pts.length; i++) {
          var dl = st.cum[i] - st.cum[i - 1];
          if (st.cum[i] <= target) { part.push(st.pts[i]); }
          else {
            var tt = dl > 0 ? (target - st.cum[i - 1]) / dl : 0;
            part.push([st.pts[i - 1][0] + (st.pts[i][0] - st.pts[i - 1][0]) * tt, st.pts[i - 1][1] + (st.pts[i][1] - st.pts[i - 1][1]) * tt]);
            break;
          }
        }
        if (part.length === 1) part.push([part[0][0] + 0.01, part[0][1]]);
        tracePath(ctx, part); ctx.stroke();
        tip = part[part.length - 1];
      });
      if (tip) {
        var r = Math.max(7, size * 0.05);
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(tip[0], tip[1], r * 1.25, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = colors.accent; ctx.beginPath(); ctx.arc(tip[0], tip[1], r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    function draw(ts) {
      if (destroyed) return;
      if (!colors) readColors();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      var lay = layoutFor(size);
      roundRect(ctx, 0, 0, size, size, size * 0.06);
      ctx.fillStyle = colors.bg; ctx.fill();
      ctx.save();
      roundRect(ctx, 0, 0, size, size, size * 0.06); ctx.clip();
      drawGuides(lay);
      if (letter && mode === 'trace') drawModelTrace(lay);
      else if (letter && mode === 'copy') drawModelCorner();
      drawInk(1 - snapP);
      if (snapP > 0 && letter) drawTemplate(lay, Math.max(6, size * 0.07), colors.accent, snapP, lay.ox, lay.oy, lay.u);
      if (demoAnim) drawDemo(lay, ts - demoAnim.t0);
      ctx.restore();
    }

    /* ---- animation loop ---- */
    function tick(ts) {
      raf = 0;
      if (destroyed) return;
      lastTs = ts;
      var more = false;
      if (snapAnim) {
        if (snapAnim.t0 == null) snapAnim.t0 = ts;
        var p = (ts - snapAnim.t0) / snapAnim.dur;
        snapP = ease(p);
        if (p >= 1) { snapP = 1; snapAnim = null; } else more = true;
      }
      if (demoAnim) {
        if (demoAnim.t0 == null) demoAnim.t0 = ts;
        if (ts - demoAnim.t0 >= demoAnim.total) {
          var res = demoAnim.resolve; demoAnim = null; draw(ts); if (res) res();
        } else more = true;
      }
      draw(ts);
      if (more) raf = win.requestAnimationFrame(tick);
    }

    function requestDraw() {
      if (!raf && !destroyed) raf = win.requestAnimationFrame(tick);
    }

    /* ---- input ---- */
    function toPad(clientX, clientY) {
      var r = canvas.getBoundingClientRect();
      var sx = r.width > 0 ? size / r.width : 1, sy = r.height > 0 ? size / r.height : 1;
      return [clamp((clientX - r.left) * sx / size, -0.05, 1.05), clamp((clientY - r.top) * sy / size, -0.05, 1.05)];
    }

    function begin(id, cx, cy) {
      if (!enabled || !active || solved || demoAnim || destroyed) return false;
      if (activeId !== null) return false;
      activeId = id;
      cancelAuto();
      readColors();                     // pick up theme changes (CSS variables)
      cur = [toPad(cx, cy)];
      strokes.push(cur);
      requestDraw();
      return true;
    }

    function move(id, cx, cy) {
      if (id !== activeId || !cur) return;
      var p = toPad(cx, cy), l = cur[cur.length - 1];
      if (Math.hypot((p[0] - l[0]) * size, (p[1] - l[1]) * size) < 1.4) return;
      cur.push(p);
      requestDraw();
    }

    function end(id, cx, cy) {
      if (id !== activeId || !cur) return;
      if (cx != null) move(id, cx, cy);
      activeId = null;
      var len = 0;
      for (var i = 1; i < cur.length; i++) len += Math.hypot((cur[i][0] - cur[i - 1][0]) * size, (cur[i][1] - cur[i - 1][1]) * size);
      var finished = cur;
      cur = null;
      if (len < Math.max(6, size * 0.025)) {
        // a tap, not a stroke
        var ix = strokes.indexOf(finished);
        if (ix >= 0) strokes.splice(ix, 1);
        requestDraw();
        return;
      }
      requestDraw();
      if (opts.onStroke) { try { opts.onStroke({ index: strokes.length - 1, count: strokes.length }); } catch (e) { logErr(e); } }
      scheduleAuto();
    }

    function abort(id) {
      if (id !== activeId) return;
      activeId = null;
      if (cur) { end(id); }
    }

    function logErr(e) { try { if (win.console) win.console.error(e); } catch (x) { /* ignore */ } }

    var onPD = function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (begin(e.pointerId, e.clientX, e.clientY)) {
        try { canvas.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
        e.preventDefault();
      }
    };
    var onPM = function (e) {
      if (e.pointerId !== activeId) return;
      var list = (e.getCoalescedEvents && e.getCoalescedEvents()) || [];
      if (list.length) { for (var i = 0; i < list.length; i++) move(e.pointerId, list[i].clientX, list[i].clientY); }
      else move(e.pointerId, e.clientX, e.clientY);
      e.preventDefault();
    };
    var onPU = function (e) { end(e.pointerId, e.clientX, e.clientY); };
    var onPC = function (e) { abort(e.pointerId); };
    var noCtx = function (e) { e.preventDefault(); };
    var noTouch = function (e) { if (e.cancelable) e.preventDefault(); };

    var usingPointer = !!win.PointerEvent;
    var onTS, onTM, onTE, onMD, onMM, onMU, mouseDown = false;
    if (usingPointer) {
      canvas.addEventListener('pointerdown', onPD);
      canvas.addEventListener('pointermove', onPM);
      canvas.addEventListener('pointerup', onPU);
      canvas.addEventListener('pointercancel', onPC);
      canvas.addEventListener('lostpointercapture', onPC);
    } else {
      // legacy fallback (touch + mouse)
      onTS = function (e) { var t = e.changedTouches[0]; if (begin('t' + t.identifier, t.clientX, t.clientY)) e.preventDefault(); };
      onTM = function (e) { for (var i = 0; i < e.changedTouches.length; i++) { var t = e.changedTouches[i]; move('t' + t.identifier, t.clientX, t.clientY); } e.preventDefault(); };
      onTE = function (e) { for (var i = 0; i < e.changedTouches.length; i++) { var t = e.changedTouches[i]; end('t' + t.identifier, t.clientX, t.clientY); } };
      onMD = function (e) { if (e.button === 0 && begin('m', e.clientX, e.clientY)) mouseDown = true; };
      onMM = function (e) { if (mouseDown) move('m', e.clientX, e.clientY); };
      onMU = function (e) { if (mouseDown) { mouseDown = false; end('m', e.clientX, e.clientY); } };
      canvas.addEventListener('touchstart', onTS, { passive: false });
      canvas.addEventListener('touchmove', onTM, { passive: false });
      canvas.addEventListener('touchend', onTE);
      canvas.addEventListener('touchcancel', onTE);
      canvas.addEventListener('mousedown', onMD);
      win.addEventListener('mousemove', onMM);
      win.addEventListener('mouseup', onMU);
    }
    canvas.addEventListener('contextmenu', noCtx);
    canvas.addEventListener('touchstart', noTouch, { passive: false });

    /* ---- auto check ---- */
    function cancelAuto() { if (autoTimer) { win.clearTimeout(autoTimer); autoTimer = 0; } }
    function inkLength() {
      var L = 0;
      strokes.forEach(function (s) {
        for (var i = 1; i < s.length; i++) L += Math.hypot((s[i][0] - s[i - 1][0]) * size, (s[i][1] - s[i - 1][1]) * size);
      });
      return L;
    }
    function scheduleAuto() {
      cancelAuto();
      if (!(autoMs > 0)) return;
      autoTimer = win.setTimeout(function () {
        autoTimer = 0;
        if (destroyed || solved || activeId !== null || demoAnim) return;
        if (inkLength() < size * 0.12) return;      // too little ink: do not judge yet
        api.check();
      }, autoMs);
    }

    /* ---- checking ---- */
    function traceCheck() { return traceCheckPx(letter, size, pxStrokes()); }

    /* ---- public API ---- */
    function clearInk() {
      cancelAuto();
      strokes = []; cur = null; activeId = null;
      solved = false; snapP = 0; snapAnim = null;
    }

    var api = {
      el: rootEl,
      canvas: canvas,

      clear: function () {
        if (demoAnim) api.cancelDemo();
        clearInk(); requestDraw();
      },

      strokes: function () {
        return strokes.map(function (s) { return s.map(function (p) { return { x: p[0] * size, y: p[1] * size }; }); });
      },

      setLetter: function (l) {
        if (demoAnim) api.cancelDemo();
        letter = normLetter(l);
        clearInk(); readColors(); requestDraw();
      },

      setMode: function (m) {
        mode = m || 'trace';
        if (demoAnim) api.cancelDemo();
        clearInk(); readColors(); requestDraw();
      },

      // enable/disable input; inactive pads are dimmed
      setActive: function (on, dim) {
        active = !!on;
        dimmed = dim === undefined ? !active : !!dim;
        rootEl.style.opacity = dimmed ? '0.42' : '';
        updateRing();
        if (!active) { cancelAuto(); }
      },

      resize: function (n) {
        if (n > 0) { autoSize = false; size = clamp(Math.round(n), 40, 320); }
        else { autoSize = true; size = sizeFromContainer(container); }
        applySize(); requestDraw();
      },

      isSolved: function () { return solved; },

      check: function () {
        cancelAuto();
        var res;
        if (!letter) res = { ok: false, best: null, rank: 0, score: 0, mirrored: false, reason: 'no-letter' };
        else if (!strokes.length) res = { ok: false, best: null, rank: 0, score: 0, mirrored: false, reason: 'empty' };
        else if (mode === 'trace') res = traceCheck();
        else res = recognize(pxStrokes(), letter, { minSize: size * 0.14 });
        res.mode = mode; res.letter = letter; res.strokes = strokes.length;
        if (res.ok && snapOn) { solved = true; snapAnim = { t0: null, dur: 380 }; requestDraw(); }
        if (opts.onResult) { try { opts.onResult(res); } catch (e) { logErr(e); } }
        return res;
      },

      // shows the clean letter in accent colour without checking (used for "helped" letters)
      reveal: function () {
        if (!letter) return;
        solved = true; snapAnim = { t0: null, dur: 380 }; requestDraw();
      },

      cancelDemo: function () {
        if (!demoAnim) return;
        var r = demoAnim.resolve; demoAnim = null; requestDraw();
        if (r) r();
      },

      // animates writing the letter stroke by stroke (~600 ms each); resolves when done
      demo: function (o) {
        o = o || {};
        if (demoAnim) api.cancelDemo();
        if (!letter) return Promise.resolve();
        if (!o.keepInk) clearInk(); else { cancelAuto(); }
        readColors();
        var lay = layoutFor(size), t = 0, steps = [];
        templatePx(letter, lay, 2).forEach(function (pts) {
          var cum = [0];
          for (var i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
          var lenUnits = cum[cum.length - 1] / lay.u;
          var dur = clamp(lenUnits * 6, 420, 800);
          steps.push({ pts: pts, cum: cum, len: cum[cum.length - 1], start: t, dur: dur });
          t += dur + 170;
        });
        var writeEnd = t - 170;
        return new Promise(function (resolve) {
          demoAnim = { t0: null, steps: steps, writeEnd: writeEnd, hold: 500, fade: 350, total: writeEnd + 500 + 350, resolve: resolve };
          requestDraw();
        });
      },

      destroy: function () {
        if (destroyed) return;
        if (demoAnim) { var r = demoAnim.resolve; demoAnim = null; if (r) r(); }
        destroyed = true;
        cancelAuto();
        if (raf) { win.cancelAnimationFrame(raf); raf = 0; }
        win.removeEventListener('resize', onWinResize);
        win.removeEventListener('orientationchange', onWinResize);
        if (ro) { try { ro.disconnect(); } catch (e) { /* ignore */ } }
        if (!usingPointer) { win.removeEventListener('mousemove', onMM); win.removeEventListener('mouseup', onMU); }
        if (rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
      }
    };

    /* ---- resize / orientation ---- */
    var ro = null, resizeTimer = 0;
    function onWinResize() {
      if (destroyed) return;
      if (resizeTimer) win.clearTimeout(resizeTimer);
      resizeTimer = win.setTimeout(function () {
        resizeTimer = 0;
        if (destroyed) return;
        var changed = false;
        var nd = Math.max(1, Math.min(3, win.devicePixelRatio || 1));
        if (nd !== dpr) changed = true;
        if (autoSize) { var ns = sizeFromContainer(container); if (ns !== size) { size = ns; changed = true; } }
        if (changed) { applySize(); readColors(); requestDraw(); }
      }, 60);
    }
    win.addEventListener('resize', onWinResize);
    win.addEventListener('orientationchange', onWinResize);
    if (win.ResizeObserver && autoSize) {
      try { ro = new win.ResizeObserver(onWinResize); ro.observe(container); } catch (e) { ro = null; }
    }

    applySize();
    readColors();
    requestDraw();
    return api;
  }

  /* ====================================================================
   * 6. Word pads: one pad per letter, current box active
   * ==================================================================== */
  function createWordPads(container, word, opts) {
    if (!container) throw new Error('PipWrite.createWordPads: container element required');
    opts = opts || {};
    var doc = container.ownerDocument || document;
    var win = doc.defaultView || window;
    var gap = opts.gap != null ? opts.gap : 8;
    var minS = opts.minSize || 72, maxS = opts.maxSize || 200;
    var maxAttempts = opts.maxAttempts || 3;
    var mode = opts.mode || 'trace';

    var letters = [];
    String(word || '').toUpperCase().split('').forEach(function (ch) { if (LETTERS[ch]) letters.push(ch); });

    var wrap = doc.createElement('div');
    wrap.className = 'pipwrite-word';
    wrap.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:center;align-items:flex-start;gap:' + gap + 'px;';
    container.appendChild(wrap);

    var pads = [], info = [], cur = 0, finished = false, destroyed = false, timers = [];

    function later(fn, ms) {
      var id = win.setTimeout(function () { if (!destroyed) fn(); }, ms);
      timers.push(id);
      return id;
    }

    function computeSize() {
      var avail = container.clientWidth || 320, n = Math.max(1, letters.length);
      var perRow = Math.max(1, Math.min(n, Math.floor((avail + gap) / (minS + gap))));
      var rows = Math.ceil(n / perRow); perRow = Math.ceil(n / rows);
      var s = Math.floor((avail - gap * (perRow - 1)) / perRow);
      return clamp(s, minS, maxS);
    }

    function setCurrent(i) {
      cur = i;
      pads.forEach(function (p, k) { p.setActive(k === i && !finished, k > i); });
    }

    function finishLetter(i, ok, helped) {
      info[i].done = true; info[i].helped = helped;
      info[i].ok = ok && !helped;
      var next = i + 1;
      if (next < letters.length) {
        later(function () { setCurrent(next); }, ok ? 650 : 250);
      } else {
        finished = true;
        pads.forEach(function (p) { p.setActive(false, false); });
        var allOk = info.every(function (x) { return x.ok; });
        later(function () {
          if (opts.onWord) { try { opts.onWord(allOk, info.map(function (x) { return { letter: x.letter, ok: x.ok, helped: x.helped, attempts: x.attempts }; })); } catch (e) { logError(e); } }
        }, ok ? 650 : 250);
      }
    }

    function logError(e) { try { win.console.error(e); } catch (x) { /* ignore */ } }

    function handleResult(i, res) {
      var st = info[i];
      if (st.done) return;
      st.attempts++;
      var out = {}; for (var k in res) out[k] = res[k];
      out.index = i; out.attempt = st.attempts; out.maxAttempts = maxAttempts; out.helped = false; out.final = false;
      if (res.ok) {
        out.final = true;
      } else if (st.attempts >= maxAttempts) {
        out.final = true; out.helped = true;
      }
      if (opts.onLetter) { try { opts.onLetter(i, out); } catch (e) { logError(e); } }
      if (res.ok) {
        finishLetter(i, true, false);
      } else if (out.helped) {
        later(function () {
          pads[i].demo().then(function () {
            if (destroyed) return;
            pads[i].reveal();
            finishLetter(i, false, true);
          });
        }, 500);
      } else {
        // let the child try again after a short moment
        later(function () { pads[i].clear(); }, 750);
      }
    }

    function build() {
      var s = computeSize();
      letters.forEach(function (ch, i) {
        info.push({ letter: ch, attempts: 0, done: false, ok: false, helped: false });
        var box = doc.createElement('div');
        box.className = 'pipwrite-box';
        box.style.cssText = 'flex:0 0 auto;';
        wrap.appendChild(box);
        pads.push(createPad(box, {
          letter: ch, mode: mode, size: s, snap: opts.snap !== false, ring: true,
          autoCheckMs: opts.autoCheckMs == null ? 1100 : opts.autoCheckMs,
          onResult: function (res) { handleResult(i, res); },
          onStroke: opts.onStroke ? function (e) { opts.onStroke(i, e); } : null
        }));
      });
      if (letters.length) setCurrent(0);
      else if (opts.onWord) later(function () { opts.onWord(true, []); }, 0);
    }

    var rzTimer = 0;
    function onResize() {
      if (destroyed) return;
      if (rzTimer) win.clearTimeout(rzTimer);
      rzTimer = win.setTimeout(function () {
        rzTimer = 0;
        if (destroyed) return;
        var s = computeSize();
        pads.forEach(function (p) { p.resize(s); });
      }, 80);
    }
    win.addEventListener('resize', onResize);
    win.addEventListener('orientationchange', onResize);
    var ro = null;
    if (win.ResizeObserver) { try { ro = new win.ResizeObserver(onResize); ro.observe(container); } catch (e) { ro = null; } }

    build();

    return {
      pads: pads,
      letters: letters,
      current: function () { return cur; },
      results: function () { return info.map(function (x) { return { letter: x.letter, ok: x.ok, helped: x.helped, attempts: x.attempts, done: x.done }; }); },
      demoCurrent: function () { return pads[cur] ? pads[cur].demo() : Promise.resolve(); },
      destroy: function () {
        if (destroyed) return;
        destroyed = true;
        timers.forEach(function (t) { win.clearTimeout(t); });
        win.removeEventListener('resize', onResize);
        win.removeEventListener('orientationchange', onResize);
        if (ro) { try { ro.disconnect(); } catch (e) { /* ignore */ } }
        pads.forEach(function (p) { p.destroy(); });
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      }
    };
  }

  /* ====================================================================
   * Export
   * ==================================================================== */
  var PipWrite = {
    version: VERSION,
    ORDER: ORDER,
    LETTERS: LETTERS,
    recognize: recognize,
    createPad: createPad,
    createWordPads: createWordPads,
    markers: markers,
    config: CFG,
    // internals (used by selftest.js / tools)
    _prepare: prepare,
    _scores: function (strokes, mirror) {
      var p = prepare(strokes);
      if (!p) return null;
      return scoreStrokes(mirror ? mirrorStrokes(p.strokes, p.bb) : p.strokes);
    },
    _decide: decide,
    _templates: templates,
    _traceCheck: traceCheckPx,
    trace: TRACE,
    _setCfg: function (o) { for (var k in o) CFG[k] = o[k]; TPL = null; },
    _helpers: { seg: seg, path: path, arc: arc, bez: bez, cat: cat }
  };
  root.PipWrite = PipWrite;
  if (typeof module === 'object' && module && module.exports) module.exports = PipWrite;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
