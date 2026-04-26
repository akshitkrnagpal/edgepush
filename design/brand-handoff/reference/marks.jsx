// Logo marks — built as React components so each one scales cleanly to any size.
// Every mark is built on a 64×64 conceptual grid and uses currentColor for ink.

// ────────────────────────────────────────────────────────────────────────────
// A. Pure dot — the most reductive: the signal IS the brand.
const MarkDot = ({ size = 64, color = "#FF6B1A" }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-label="edgepush mark — dot">
    <circle cx="32" cy="32" r="14" fill={color} />
  </svg>
);

// B. Bracket + dot — `[●]` token. A signal wrapped as a CLI flag.
const MarkBracket = ({ size = 64, ink = "#F5F3EE", accent = "#FF6B1A" }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-label="edgepush mark — bracket">
    {/* left bracket */}
    <path d="M16 14 H10 V50 H16" stroke={ink} strokeWidth="3" fill="none" strokeLinecap="square" />
    {/* right bracket */}
    <path d="M48 14 H54 V50 H48" stroke={ink} strokeWidth="3" fill="none" strokeLinecap="square" />
    {/* dot */}
    <circle cx="32" cy="32" r="9" fill={accent} />
  </svg>
);

// C. Prompt + dot — `$ ●` shell-prompt voice from the design doc.
const MarkPrompt = ({ size = 64, ink = "#F5F3EE", accent = "#FF6B1A" }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-label="edgepush mark — prompt">
    {/* "$" glyph drawn in heavy strokes */}
    <text
      x="14"
      y="44"
      fontFamily="JetBrains Mono, monospace"
      fontWeight="800"
      fontSize="34"
      fill={ink}
    >
      $
    </text>
    <circle cx="46" cy="32" r="7" fill={accent} />
  </svg>
);

// D. Push — dot with a thrust tail, oriented to the right.
const MarkPush = ({ size = 64, ink = "#F5F3EE", accent = "#FF6B1A" }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-label="edgepush mark — push">
    {/* trailing ticks (the "push" trail) */}
    <rect x="8" y="29" width="8" height="6" fill={ink} opacity="0.35" />
    <rect x="20" y="29" width="8" height="6" fill={ink} opacity="0.65" />
    {/* dot */}
    <circle cx="44" cy="32" r="11" fill={accent} />
  </svg>
);

// E. Concentric pulse — `(● )` ring radiating.
const MarkPulse = ({ size = 64, ink = "#F5F3EE", accent = "#FF6B1A" }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-label="edgepush mark — pulse">
    <circle cx="32" cy="32" r="22" stroke={ink} strokeOpacity="0.25" strokeWidth="2" fill="none" />
    <circle cx="32" cy="32" r="15" stroke={ink} strokeOpacity="0.55" strokeWidth="2" fill="none" />
    <circle cx="32" cy="32" r="8" fill={accent} />
  </svg>
);

// F. Delivery sequence — `● ● ○` the lifecycle of a push.
const MarkSequence = ({ size = 64, ink = "#F5F3EE", accent = "#FF6B1A" }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-label="edgepush mark — sequence">
    <circle cx="12" cy="32" r="6" fill={ink} opacity="0.4" />
    <circle cx="32" cy="32" r="6" fill={ink} opacity="0.7" />
    <circle cx="52" cy="32" r="6" fill={accent} />
  </svg>
);

// G. Pipe + dot — the `│●` panel chrome character.
const MarkPipe = ({ size = 64, ink = "#F5F3EE", accent = "#FF6B1A" }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-label="edgepush mark — pipe">
    <rect x="20" y="10" width="3" height="44" fill={ink} />
    <circle cx="42" cy="32" r="10" fill={accent} />
  </svg>
);

// H. Edge — the literal "edge": a corner glyph + dot, using the box-drawing
//    chrome from the design system (`┌`, `─`, `│`).
const MarkEdge = ({ size = 64, ink = "#F5F3EE", accent = "#FF6B1A" }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-label="edgepush mark — edge">
    {/* top edge */}
    <rect x="10" y="14" width="32" height="3" fill={ink} />
    {/* left edge */}
    <rect x="10" y="14" width="3" height="32" fill={ink} />
    {/* the dot pushed out beyond the edge */}
    <circle cx="46" cy="44" r="9" fill={accent} />
  </svg>
);

// ────────────────────────────────────────────────────────────────────────────
// Wordmarks — JetBrains Mono ExtraBold, lowercase, signal-orange dot accent.

// W1. inline dot replaces nothing; sits between "edge" and "push"
const WordmarkSplit = ({ size = 1, ink = "#F5F3EE", accent = "#FF6B1A" }) => (
  <div
    className="mono"
    style={{
      fontFamily: "JetBrains Mono, monospace",
      fontWeight: 800,
      fontSize: 64 * size,
      lineHeight: 0.95,
      letterSpacing: "-0.045em",
      color: ink,
      whiteSpace: "nowrap",
      display: "inline-flex",
      alignItems: "center",
      gap: 0.16 * 64 * size + "px",
    }}
  >
    <span>edge</span>
    <span
      aria-hidden
      style={{
        width: 0.42 * 64 * size,
        height: 0.42 * 64 * size,
        borderRadius: "50%",
        background: accent,
        display: "inline-block",
        flexShrink: 0,
      }}
    />
    <span>push</span>
  </div>
);

// W2. orange dot prefix — `● edgepush`
const WordmarkPrefix = ({ size = 1, ink = "#F5F3EE", accent = "#FF6B1A" }) => (
  <div
    className="mono"
    style={{
      fontFamily: "JetBrains Mono, monospace",
      fontWeight: 800,
      fontSize: 64 * size,
      lineHeight: 0.95,
      letterSpacing: "-0.045em",
      color: ink,
      whiteSpace: "nowrap",
      display: "inline-flex",
      alignItems: "center",
      gap: 0.22 * 64 * size + "px",
    }}
  >
    <span
      aria-hidden
      style={{
        width: 0.4 * 64 * size,
        height: 0.4 * 64 * size,
        borderRadius: "50%",
        background: accent,
        display: "inline-block",
        flexShrink: 0,
      }}
    />
    <span>edgepush</span>
  </div>
);

// W3. plain mono, no mark
const WordmarkPlain = ({ size = 1, ink = "#F5F3EE" }) => (
  <div
    className="mono"
    style={{
      fontFamily: "JetBrains Mono, monospace",
      fontWeight: 800,
      fontSize: 64 * size,
      lineHeight: 0.95,
      letterSpacing: "-0.045em",
      color: ink,
      whiteSpace: "nowrap",
    }}
  >
    edgepush
  </div>
);

// W4. shell-prompt lockup — `$ edgepush`
const WordmarkPrompt = ({ size = 1, ink = "#F5F3EE", accent = "#FF6B1A" }) => (
  <div
    className="mono"
    style={{
      fontFamily: "JetBrains Mono, monospace",
      fontWeight: 800,
      fontSize: 64 * size,
      lineHeight: 0.95,
      letterSpacing: "-0.045em",
      color: ink,
      whiteSpace: "nowrap",
      display: "inline-flex",
      alignItems: "center",
      gap: 0.32 * 64 * size + "px",
    }}
  >
    <span style={{ color: accent }}>$</span>
    <span>edgepush</span>
  </div>
);

Object.assign(window, {
  MarkDot,
  MarkBracket,
  MarkPrompt,
  MarkPush,
  MarkPulse,
  MarkSequence,
  MarkPipe,
  MarkEdge,
  WordmarkSplit,
  WordmarkPrefix,
  WordmarkPlain,
  WordmarkPrompt,
});
