// edgepush brand canvas — explorations + chosen lockup + favicon set + in-context.

const { useState } = React;

const COLORS = {
  bg: "#000000",
  surface: "#0a0a0a",
  surface2: "#111111",
  rule: "#1a1a1a",
  ruleStrong: "#262626",
  text: "#f5f3ee",
  mutedStrong: "#9a9a9a",
  muted: "#6b6b6b",
  accent: "#ff6b1a",
  accentHover: "#ff8a42",
  accentDim: "#b54a10",
  success: "#6bcb77",
};

// Small bits ----------------------------------------------------------------

const Frame = ({ children, label, style, height = 320 }) => (
  <div
    style={{
      width: "100%",
      height,
      background: COLORS.bg,
      border: `1px solid ${COLORS.ruleStrong}`,
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      ...style,
    }}
  >
    {label && (
      <div
        className="mono"
        style={{
          position: "absolute",
          top: 12,
          left: 14,
          fontFamily: "JetBrains Mono, monospace",
          fontWeight: 500,
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: COLORS.muted,
        }}
      >
        {label}
      </div>
    )}
    {children}
  </div>
);

const Caption = ({ title, body }) => (
  <div style={{ paddingTop: 10 }}>
    <div
      className="mono"
      style={{
        fontFamily: "JetBrains Mono, monospace",
        fontWeight: 700,
        fontSize: 11,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "#0a0a0a",
      }}
    >
      {title}
    </div>
    {body && (
      <div
        style={{
          fontFamily: "Satoshi, system-ui",
          fontSize: 13,
          lineHeight: 1.5,
          color: "#3a3a3a",
          marginTop: 4,
          maxWidth: 320,
        }}
      >
        {body}
      </div>
    )}
  </div>
);

// ────────────────────────────────────────────────────────────────────────────
// 01 — Mark exploration. 8 candidates on a uniform grid.

function MarkExploration() {
  const items = [
    { Comp: window.MarkDot,     name: "A · Signal", body: "The most reductive. The accent dot from the design system, full stop." },
    { Comp: window.MarkPulse,   name: "B · Pulse",   body: "Concentric rings radiating from the dot. Reads as: realtime, broadcast." },
    { Comp: window.MarkBracket, name: "C · Bracket", body: "[●] — the dot wrapped as a CLI flag token. Square, terminal-native." },
    { Comp: window.MarkPrompt,  name: "D · Prompt",  body: "$ ● — the shell-prompt voice from copy guidance, drawn." },
    { Comp: window.MarkPush,    name: "E · Push",    body: "Trailing ticks build into the dot. Motion implied, not animated." },
    { Comp: window.MarkSequence,name: "F · Lifecycle",body: "● ● ● — queued → dispatched → delivered. Self-explanatory in product." },
    { Comp: window.MarkPipe,    name: "G · Pipe",    body: "│ ● — pairs the panel-chrome character with the dot. Quiet, structural." },
    { Comp: window.MarkEdge,    name: "H · Edge",    body: "Box-drawing corner with the dot pushed past the edge. Literal name pun." },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 24,
        padding: 32,
      }}
    >
      {items.map(({ Comp, name, body }) => (
        <div key={name}>
          <Frame label={name.split(" · ")[0]} height={220}>
            <Comp size={120} />
          </Frame>
          <Caption title={name} body={body} />
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 02 — Wordmark variants. The designer's recommendation lands on W1.

function WordmarkExploration() {
  const items = [
    { Comp: window.WordmarkPlain,  name: "W1 · Plain",  body: "Pure JetBrains Mono ExtraBold. No accent. Let the type carry it." },
    { Comp: window.WordmarkPrefix, name: "W2 · Signal", body: "● edgepush — the status dot as a permanent prefix. Clean, scannable." },
    { Comp: window.WordmarkSplit,  name: "W3 · Split",  body: "edge ● push — the dot literally separates the two halves. Recommended." },
    { Comp: window.WordmarkPrompt, name: "W4 · Prompt", body: "$ edgepush — the orange dollar sign as accent. Reads as a CLI command." },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, padding: 32 }}>
      {items.map(({ Comp, name, body }) => (
        <div key={name}>
          <Frame label={name.split(" · ")[0]} height={180}>
            <Comp size={0.95} />
          </Frame>
          <Caption title={name} body={body} />
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 03 — Primary lockup. Hero treatment, the "official" version.

function PrimaryLockup() {
  return (
    <div style={{ padding: 0 }}>
      <Frame height={520} style={{ flexDirection: "column", gap: 28 }}>
        <window.WordmarkSplit size={1.7} />
        <div
          className="mono"
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontWeight: 500,
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: COLORS.muted,
          }}
        >
          ── push notifications · open source · runs at the edge ──
        </div>
      </Frame>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 04 — Mark + wordmark lockups (horizontal & stacked).

function Lockups() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 24, padding: 32 }}>
      <div>
        <Frame label="Horizontal · primary" height={220}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <window.MarkDot size={72} />
            <window.WordmarkPlain size={1.2} />
          </div>
        </Frame>
        <Caption
          title="Horizontal lockup"
          body="The dot mark sits to the left of the wordmark. Used in the dashboard top-nav and the marketing footer. Mark height = wordmark cap height × 1.05."
        />
      </div>
      <div>
        <Frame label="Stacked · square" height={220}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <window.MarkDot size={72} />
            <window.WordmarkPlain size={0.6} />
          </div>
        </Frame>
        <Caption
          title="Stacked lockup"
          body="For square crops: avatar, social profile, app store. Same mark, wordmark below at 36px."
        />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 05 — Favicon set. Every required size, on a real surface.

function FaviconSet() {
  const sizes = [16, 32, 48, 64, 128, 180];
  return (
    <div style={{ padding: 32 }}>
      <Frame height={260}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 36 }}>
          {sizes.map((s) => (
            <div key={s} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: s,
                  height: s,
                  background: COLORS.bg,
                  border: `1px solid ${COLORS.ruleStrong}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <window.MarkDot size={Math.round(s * 0.75)} />
              </div>
              <div
                className="mono"
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: COLORS.muted,
                }}
              >
                {s}
              </div>
            </div>
          ))}
        </div>
      </Frame>
      <Caption
        title="Favicon · all sizes"
        body="At every size the mark holds: a single solid orange dot occupying ~75% of the canvas. Renders sharp at 16px (browser tab), 32px (bookmark bar), 180px (apple-touch-icon), and any retina multiple. No anti-aliasing artifacts because there's nothing fragile to lose."
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 06 — Browser tab in context.

function BrowserTab() {
  return (
    <div style={{ padding: 32 }}>
      <Frame height={260} style={{ alignItems: "flex-start", justifyContent: "flex-start" }}>
        <div style={{ width: "100%", paddingTop: 60 }}>
          {/* Chrome-y tab strip */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              borderBottom: `1px solid ${COLORS.ruleStrong}`,
              paddingLeft: 24,
              gap: 6,
            }}
          >
            {/* active tab */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 16px",
                background: COLORS.surface,
                border: `1px solid ${COLORS.ruleStrong}`,
                borderBottom: "none",
                minWidth: 240,
              }}
            >
              <window.MarkDot size={14} />
              <span
                className="mono"
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 12,
                  color: COLORS.text,
                }}
              >
                edgepush · dashboard
              </span>
              <span style={{ marginLeft: "auto", color: COLORS.muted, fontSize: 14 }}>×</span>
            </div>
            {/* inactive tabs */}
            {["docs.expo.dev", "github.com/akshitkrnagpal", "cloudflare dash"].map((t, i) => (
              <div
                key={i}
                style={{
                  padding: "10px 16px",
                  fontSize: 12,
                  color: COLORS.muted,
                  fontFamily: "JetBrains Mono, monospace",
                  borderBottom: `1px solid ${COLORS.ruleStrong}`,
                }}
              >
                {t}
              </div>
            ))}
          </div>
          {/* address bar */}
          <div
            style={{
              margin: "12px 24px 0",
              padding: "8px 14px",
              border: `1px solid ${COLORS.ruleStrong}`,
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 12,
              color: COLORS.mutedStrong,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ color: COLORS.success }}>●</span>
            <span style={{ color: COLORS.muted }}>https://</span>edgepush.dev
          </div>
        </div>
      </Frame>
      <Caption
        title="In context · browser tab"
        body="At 14–16px on a real browser tab, the orange dot is unambiguous against any chrome — light, dark, Safari, Firefox, Chrome — and never gets confused with a 'new message' indicator from another app."
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 07 — Dashboard top-nav in context.

function DashboardNav() {
  return (
    <div style={{ padding: 32 }}>
      <Frame height={280} style={{ alignItems: "flex-start", justifyContent: "flex-start" }}>
        <div style={{ width: "100%" }}>
          {/* Top nav */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "14px 24px",
              borderBottom: `1px solid ${COLORS.rule}`,
              gap: 32,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <window.MarkDot size={20} />
              <span
                className="mono"
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontWeight: 800,
                  fontSize: 16,
                  letterSpacing: "-0.02em",
                  color: COLORS.text,
                }}
              >
                edgepush
              </span>
              <span
                className="mono"
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: COLORS.muted,
                  paddingLeft: 10,
                }}
              >
                v1.1.0
              </span>
            </div>
            <div style={{ display: "flex", gap: 22, marginLeft: 12 }}>
              {[
                ["├", "apps", true],
                ["", "credentials", false],
                ["", "deliveries", false],
                ["", "audit", false],
                ["", "billing", false],
              ].map(([prefix, label, active]) => (
                <span
                  key={label}
                  className="mono"
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 11,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: active ? COLORS.text : COLORS.muted,
                  }}
                >
                  {prefix && <span style={{ color: COLORS.accent, marginRight: 6 }}>{prefix}</span>}
                  {label}
                </span>
              ))}
            </div>
          </div>
          {/* Body content sketch */}
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              className="mono"
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: COLORS.muted,
              }}
            >
              <span style={{ color: COLORS.accent }}>├</span> tail -f deliveries
            </div>
            {[
              ["04:25:12.847", "io.acme.pos", "msg_8f12", "delivered", "192ms", COLORS.success, "●"],
              ["04:25:12.401", "com.acme.app", "msg_8f11", "delivered", "204ms", COLORS.success, "●"],
              ["04:25:11.998", "io.acme.pos", "msg_8f10", "queued",    "—",     COLORS.muted,    "○"],
            ].map((row, i) => (
              <div
                key={i}
                className="mono"
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 12,
                  display: "grid",
                  gridTemplateColumns: "180px 200px 140px 1fr 80px",
                  color: COLORS.mutedStrong,
                  gap: 8,
                }}
              >
                <span style={{ color: COLORS.muted }}>{row[0]}</span>
                <span style={{ color: COLORS.text }}>{row[1]}</span>
                <span style={{ color: COLORS.muted }}>{row[2]}</span>
                <span style={{ color: row[5] }}>{row[6]} {row[3]}</span>
                <span>{row[4]}</span>
              </div>
            ))}
          </div>
        </div>
      </Frame>
      <Caption
        title="In context · dashboard top-nav"
        body="The mark sits next to the wordmark at 20px in the dashboard nav. The orange dot also appears in the body as the active-route prefix (├) and as delivery-status markers, so the brand is the same vocabulary as the product."
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 08 — CLI splash.

function CliSplash() {
  const lines = [
    { c: COLORS.muted, t: "$ edgepush login" },
    { c: COLORS.text, t: "" },
    { c: COLORS.text, t: "  ●  edgepush  v1.1.0", bold: true },
    { c: COLORS.muted, t: "     push notifications, byo apns + fcm." },
    { c: COLORS.text, t: "" },
    { c: COLORS.mutedStrong, t: "  open https://edgepush.dev/cli/auth?code=H7K2-9PXQ" },
    { c: COLORS.muted, t: "  waiting for browser…" },
    { c: COLORS.success, t: "  ●  authenticated as akshit@edgepush.dev" },
    { c: COLORS.muted, t: "  api key cached at ~/.edgepush/credentials" },
  ];
  return (
    <div style={{ padding: 32 }}>
      <Frame height={360} style={{ alignItems: "flex-start", justifyContent: "flex-start" }}>
        <div style={{ width: "100%", padding: "32px 28px" }}>
          {lines.map((l, i) => (
            <div
              key={i}
              className="mono"
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontWeight: l.bold ? 800 : 400,
                fontSize: 13,
                lineHeight: 1.9,
                color: l.c,
                whiteSpace: "pre",
              }}
            >
              {l.t.replace("●", "")}
              {l.t.includes("●") && (
                <span style={{ color: COLORS.accent, fontWeight: 800 }}>● </span>
              )}
            </div>
          ))}
        </div>
      </Frame>
      <Caption
        title="In context · CLI"
        body="The mark renders as the literal Unicode bullet ● in the terminal, in accent orange. Same character, same color, in product and in print."
      />
    </div>
  );
}

// Render version of the CLI that handles the bullet inline cleanly.
function CliSplashClean() {
  const Bullet = () => <span style={{ color: COLORS.accent, fontWeight: 800 }}>●</span>;
  const Ok = () => <span style={{ color: COLORS.success }}>●</span>;
  return (
    <div style={{ padding: 32 }}>
      <Frame height={360} style={{ alignItems: "flex-start", justifyContent: "flex-start" }}>
        <pre
          className="mono"
          style={{
            margin: 0,
            padding: "32px 28px",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 13,
            lineHeight: 1.9,
            color: COLORS.mutedStrong,
            whiteSpace: "pre-wrap",
          }}
        >
          <span style={{ color: COLORS.muted }}>$ edgepush login</span>
          {"\n\n"}
          <span style={{ color: COLORS.text, fontWeight: 800 }}>
            {"  "}<Bullet />{"  edgepush  "}
          </span>
          <span style={{ color: COLORS.muted }}>v1.1.0</span>
          {"\n"}
          <span style={{ color: COLORS.muted }}>     push notifications, byo apns + fcm.</span>
          {"\n\n"}
          <span style={{ color: COLORS.mutedStrong }}>
            {"  open "}
            <span style={{ color: COLORS.accent, textDecoration: "underline" }}>
              https://edgepush.dev/cli/auth?code=H7K2-9PXQ
            </span>
          </span>
          {"\n"}
          <span style={{ color: COLORS.muted }}>{"  waiting for browser…"}</span>
          {"\n"}
          <span style={{ color: COLORS.text }}>
            {"  "}<Ok />{"  authenticated as "}
            <span style={{ color: COLORS.text }}>akshit@edgepush.dev</span>
          </span>
          {"\n"}
          <span style={{ color: COLORS.muted }}>
            {"  api key cached at ~/.edgepush/credentials"}
          </span>
        </pre>
      </Frame>
      <Caption
        title="In context · CLI"
        body="The mark renders as the literal Unicode ● in the terminal, in accent orange. The brand is the same character used for delivery status dots — same vocabulary, product and print."
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 09 — Construction notes for the chosen mark.

function MarkConstruction() {
  const grid = [];
  for (let i = 1; i < 8; i++) {
    grid.push(<line key={`h${i}`} x1="0" y1={i * 8} x2="64" y2={i * 8} stroke="#1a1a1a" strokeWidth="0.5" />);
    grid.push(<line key={`v${i}`} x1={i * 8} y1="0" x2={i * 8} y2="64" stroke="#1a1a1a" strokeWidth="0.5" />);
  }

  return (
    <div style={{ padding: 32, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
      <Frame label="Construction · 8px grid" height={300}>
        <svg width={240} height={240} viewBox="0 0 64 64">
          <rect x="0" y="0" width="64" height="64" fill="none" stroke="#262626" strokeWidth="0.5" />
          {grid}
          {/* clearance ring (visible) */}
          <circle cx="32" cy="32" r="22" fill="none" stroke="#FF6B1A" strokeOpacity="0.2" strokeWidth="0.5" strokeDasharray="1 1" />
          {/* the dot */}
          <circle cx="32" cy="32" r="14" fill="#FF6B1A" />
          {/* annotations */}
          <line x1="32" y1="32" x2="46" y2="32" stroke="#9a9a9a" strokeWidth="0.4" />
          <text x="40" y="40" fontFamily="JetBrains Mono" fontSize="2.5" fill="#9a9a9a">r=14</text>
          <text x="48" y="58" fontFamily="JetBrains Mono" fontSize="2.5" fill="#6b6b6b">clear=22</text>
        </svg>
      </Frame>
      <Caption
        title="Construction"
        body={
          <>
            64×64 grid. Dot radius 14 (≈ 44% of canvas). Clearance ring r=22 — keep this margin clear of any other element when locking up. The dot is geometric, not optical: a literal SVG <span style={{color: COLORS.text}}>circle</span>, no pixel hinting needed at any size.
          </>
        }
      />
      <Frame label="Color usage" height={300}>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <div style={{ width: 80, height: 80, background: COLORS.accent }} />
          <div className="mono" style={{ fontFamily: "JetBrains Mono", fontSize: 12, lineHeight: 1.9 }}>
            <div><span style={{ color: COLORS.muted }}>name  </span><span style={{ color: COLORS.text }}>signal-orange</span></div>
            <div><span style={{ color: COLORS.muted }}>hex   </span><span style={{ color: COLORS.text }}>#FF6B1A</span></div>
            <div><span style={{ color: COLORS.muted }}>token </span><span style={{ color: COLORS.text }}>--accent</span></div>
            <div><span style={{ color: COLORS.muted }}>use   </span><span style={{ color: COLORS.text }}>brand mark only</span></div>
          </div>
        </div>
      </Frame>
      <Caption
        title="Single ink"
        body="The mark uses one color: the design system's --accent on pure --bg. There is no monochrome variant — if the surface can't carry orange, the mark doesn't appear. Use the wordmark instead."
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 10 — Don'ts.

function Donts() {
  const Box = ({ children, label }) => (
    <Frame height={200} label={label}>
      <div style={{ position: "relative", width: 120, height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {children}
        <svg
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          viewBox="0 0 120 120"
        >
          <line x1="6" y1="6" x2="114" y2="114" stroke="#FF4F4F" strokeWidth="2" />
        </svg>
      </div>
    </Frame>
  );
  return (
    <div style={{ padding: 32, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
      <div>
        <Box label="No gradients">
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg,#FF6B1A,#FFE5C0)" }} />
        </Box>
        <Caption title="Never gradient" body="The dot is one solid color, always." />
      </div>
      <div>
        <Box label="No outline">
          <div style={{ width: 80, height: 80, borderRadius: "50%", border: `4px solid ${COLORS.accent}` }} />
        </Box>
        <Caption title="Never hollow" body="A ring reads as ○ queued — wrong status." />
      </div>
      <div>
        <Box label="No off-color">
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#7A4FFF" }} />
        </Box>
        <Caption title="Never recolor" body="Orange or nothing. No purple, cyan, or emerald." />
      </div>
      <div>
        <Box label="No shadow">
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: COLORS.accent, boxShadow: "0 8px 24px rgba(255,107,26,0.6), 0 0 40px rgba(255,107,26,0.4)" }} />
        </Box>
        <Caption title="Never glow" body="No drop shadows. No glow halos. Flat ink, full stop." />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Compose the canvas.

const { DesignCanvas, DCSection, DCArtboard } = window;

function LockedHero() {
  return (
    <div style={{ padding: 0 }}>
      <Frame height={560} style={{ flexDirection: "column", gap: 36 }}>
        <div
          className="mono"
          style={{
            position: "absolute",
            top: 18,
            right: 22,
            fontFamily: "JetBrains Mono, monospace",
            fontWeight: 700,
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: COLORS.accent,
            border: `1px solid ${COLORS.accent}`,
            padding: "4px 10px",
          }}
        >
          ● LOCKED
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 56 }}>
          <window.MarkDot size={140} />
          <div style={{ width: 1, height: 140, background: COLORS.ruleStrong }} />
          <window.WordmarkSplit size={1.5} />
        </div>
        <div
          className="mono"
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontWeight: 500,
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: COLORS.muted,
          }}
        >
          ── icon: A · signal dot ──── logo: W3 · edge ● push ──
        </div>
      </Frame>
    </div>
  );
}

function AssetIndex() {
  const rows = [
    ["assets/favicon.svg",          "Favicon",            "16–64px · black bg, orange dot"],
    ["assets/apple-touch-icon.svg", "Apple touch icon",   "180×180 · black bg, orange dot"],
    ["assets/icon-mark.svg",        "Icon · transparent", "Bare mark for any surface"],
    ["assets/wordmark-light.svg",   "Wordmark · light",   "edge ● push, bone ink — for dark surfaces"],
    ["assets/wordmark-dark.svg",    "Wordmark · dark",    "edge ● push, ink black — for light surfaces"],
  ];
  return (
    <div style={{ padding: 32 }}>
      <Frame height={420} style={{ alignItems: "stretch", justifyContent: "flex-start", padding: 0 }}>
        <div style={{ width: "100%", padding: "28px 32px" }}>
          <div
            className="mono"
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontWeight: 500,
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: COLORS.accent,
              marginBottom: 18,
            }}
          >
            <span style={{ color: COLORS.accent }}>├</span> ls assets/
          </div>
          {rows.map(([path, name, desc]) => (
            <div
              key={path}
              className="mono"
              style={{
                display: "grid",
                gridTemplateColumns: "260px 200px 1fr",
                gap: 20,
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 12,
                padding: "10px 0",
                borderBottom: `1px solid ${COLORS.rule}`,
              }}
            >
              <a
                href={path}
                target="_blank"
                rel="noreferrer"
                style={{ color: COLORS.accent, textDecoration: "none" }}
              >
                {path}
              </a>
              <span style={{ color: COLORS.text }}>{name}</span>
              <span style={{ color: COLORS.mutedStrong }}>{desc}</span>
            </div>
          ))}
        </div>
      </Frame>
      <Caption
        title="Production assets"
        body="All five files live under /assets. SVG only — sharp at every size, tiny, version-controllable. Click any path above to open the raw file."
      />
    </div>
  );
}

function App() {
  return (
    <DesignCanvas title="edgepush · brand · LOCKED">
      <DCSection id="locked" title="00  ── Locked">
        <DCArtboard id="hero" label="Icon A + Wordmark W3" width={1240} height={620}>
          <LockedHero />
        </DCArtboard>
        <DCArtboard id="assets" label="Production files" width={1240} height={520}>
          <AssetIndex />
        </DCArtboard>
      </DCSection>

      <DCSection id="favicon" title="01  ── Favicon">
        <DCArtboard id="set" label="Favicon · sizes 16 → 180" width={1240} height={520}>
          <FaviconSet />
        </DCArtboard>
        <DCArtboard id="tab" label="In a browser tab" width={1240} height={520}>
          <BrowserTab />
        </DCArtboard>
      </DCSection>

      <DCSection id="chosen" title="02  ── Construction">
        <DCArtboard id="lockups" label="Mark + wordmark lockups" width={1240} height={500}>
          <Lockups />
        </DCArtboard>
        <DCArtboard id="construction" label="Construction & color" width={1240} height={780}>
          <MarkConstruction />
        </DCArtboard>
      </DCSection>

      <DCSection id="context" title="03  ── In product">
        <DCArtboard id="dash" label="Dashboard top-nav" width={1240} height={540}>
          <DashboardNav />
        </DCArtboard>
        <DCArtboard id="cli" label="CLI splash" width={1240} height={620}>
          <CliSplashClean />
        </DCArtboard>
      </DCSection>

      <DCSection id="rules" title="04  ── Don'ts">
        <DCArtboard id="donts" label="Never do these" width={1240} height={460}>
          <Donts />
        </DCArtboard>
      </DCSection>

      <DCSection id="explore" title="05  ── Earlier explorations (archive)">
        <DCArtboard id="marks" label="Eight mark directions" width={1240} height={760}>
          <MarkExploration />
        </DCArtboard>
        <DCArtboard id="words" label="Four wordmark variants" width={1240} height={620}>
          <WordmarkExploration />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
