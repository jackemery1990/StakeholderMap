import type { StakeholderPositionDTO } from '../../shared';

// --- Relationship palette (1 = blocker … 5 = advocate) -----------------------
interface RelationshipMeta {
  value: number;
  label: string;
  color: string;
}

const RELATIONSHIPS: RelationshipMeta[] = [
  { value: 1, label: 'Blocker', color: '#E24B4A' },
  { value: 2, label: 'Sceptic', color: '#EF9F27' },
  { value: 3, label: 'Neutral', color: '#888780' },
  { value: 4, label: 'Supporter', color: '#97C459' },
  { value: 5, label: 'Advocate', color: '#1D9E75' },
];

const NEUTRAL = '#888780';
function relationshipColor(relationship: number): string {
  return RELATIONSHIPS.find((r) => r.value === relationship)?.color ?? NEUTRAL;
}

// --- Geometry ----------------------------------------------------------------
// viewBox is fixed; the SVG scales to its container via width:100%/height:auto.
const VIEW_W = 600;
const VIEW_H = 440;
// Plot rectangle (the tinted quadrant area), leaving margins for axis labels.
const PLOT_X0 = 56; // left  — room for "Power" label + low/high markers
const PLOT_X1 = 580; // right
const PLOT_Y0 = 28; // top   — room for the name label above the highest dot
const PLOT_Y1 = 384; // bottom — room for "Interest" label + low/high markers
const MID_X = (PLOT_X0 + PLOT_X1) / 2; // interest = 5.5 divider
const MID_Y = (PLOT_Y0 + PLOT_Y1) / 2; // power = 5.5 divider
const R = 13; // dot radius

// Interest 1→10 maps left→right.
function mapX(interest: number): number {
  return PLOT_X0 + ((interest - 1) / 9) * (PLOT_X1 - PLOT_X0);
}
// Power 1→10 maps bottom→top: SVG y grows downward, so invert here.
function mapY(power: number): number {
  return PLOT_Y1 - ((power - 1) / 9) * (PLOT_Y1 - PLOT_Y0);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

// --- Labels ------------------------------------------------------------------
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// Prefer the full name when it's short enough to read on the grid, else the
// first name only.
function shortLabel(name: string): string {
  if (name.length <= 12) return name;
  return name.trim().split(/\s+/)[0];
}

// --- Overlap resolution ------------------------------------------------------
interface PlacedDot extends StakeholderPositionDTO {
  x: number;
  y: number;
}

// Walk the list; nudge any dot that lands within 2R of an earlier one just
// clear of it. Deterministic (no randomness) so renders are stable. Basic by
// design — it resolves against already-placed dots, not globally.
function layout(stakeholders: StakeholderPositionDTO[]): PlacedDot[] {
  const placed: PlacedDot[] = [];
  const minDist = R * 2;

  for (const s of stakeholders) {
    let x = mapX(s.interest);
    let y = mapY(s.power);

    for (const p of placed) {
      let dx = x - p.x;
      let dy = y - p.y;
      let dist = Math.hypot(dx, dy);
      if (dist < minDist) {
        if (dist === 0) {
          // Exact overlap: push along a deterministic diagonal.
          const angle = (placed.length * Math.PI) / 3;
          dx = Math.cos(angle);
          dy = Math.sin(angle);
          dist = 1;
        }
        const push = minDist - dist + 1;
        x += (dx / dist) * push;
        y += (dy / dist) * push;
      }
    }

    // Keep dots inside the viewBox even after nudging.
    x = clamp(x, R + 2, VIEW_W - R - 2);
    y = clamp(y, R + 2, VIEW_H - R - 2);
    placed.push({ ...s, x, y });
  }

  return placed;
}

// --- Quadrant tints + labels -------------------------------------------------
interface Quadrant {
  label: string;
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const QUADRANTS: Quadrant[] = [
  // Top-left: high power, low interest.
  { label: 'Keep satisfied', color: '#F1EFE8', x: PLOT_X0, y: PLOT_Y0, w: MID_X - PLOT_X0, h: MID_Y - PLOT_Y0 },
  // Top-right: high power, high interest.
  { label: 'Manage closely', color: '#FAEEDA', x: MID_X, y: PLOT_Y0, w: PLOT_X1 - MID_X, h: MID_Y - PLOT_Y0 },
  // Bottom-left: low power, low interest.
  { label: 'Monitor', color: '#F7F6F1', x: PLOT_X0, y: MID_Y, w: MID_X - PLOT_X0, h: PLOT_Y1 - MID_Y },
  // Bottom-right: low power, high interest.
  { label: 'Keep informed', color: '#EAE8E0', x: MID_X, y: MID_Y, w: PLOT_X1 - MID_X, h: PLOT_Y1 - MID_Y },
];

interface StakeholderGridProps {
  stakeholders: StakeholderPositionDTO[];
}

export default function StakeholderGrid({ stakeholders }: StakeholderGridProps) {
  const dots = layout(stakeholders);

  return (
    <div>
      {/* Legend */}
      <ul
        style={{
          listStyle: 'none',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          padding: 0,
          margin: '8px 0 12px',
          fontSize: '13px',
        }}
      >
        {RELATIONSHIPS.map((r) => (
          <li key={r.value} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              aria-hidden
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: r.color,
                display: 'inline-block',
              }}
            />
            {r.label}
          </li>
        ))}
      </ul>

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label="Power versus interest grid of stakeholders"
        style={{ width: '100%', height: 'auto', display: 'block', fontFamily: 'system-ui, sans-serif' }}
      >
        {/* Quadrant tints */}
        {QUADRANTS.map((q) => (
          <rect key={q.label} x={q.x} y={q.y} width={q.w} height={q.h} fill={q.color} />
        ))}

        {/* Plot border */}
        <rect
          x={PLOT_X0}
          y={PLOT_Y0}
          width={PLOT_X1 - PLOT_X0}
          height={PLOT_Y1 - PLOT_Y0}
          fill="none"
          stroke="#E0DED6"
          strokeWidth={1}
        />

        {/* Midlines at power = 5.5 and interest = 5.5 */}
        <line x1={MID_X} y1={PLOT_Y0} x2={MID_X} y2={PLOT_Y1} stroke="#CFCDC4" strokeWidth={1} />
        <line x1={PLOT_X0} y1={MID_Y} x2={PLOT_X1} y2={MID_Y} stroke="#CFCDC4" strokeWidth={1} />

        {/* Quadrant labels (top-left corner of each) */}
        {QUADRANTS.map((q) => (
          <text
            key={`${q.label}-label`}
            x={q.x + 8}
            y={q.y + 16}
            fontSize={11}
            fontWeight={600}
            fill="#9B9A90"
          >
            {q.label}
          </text>
        ))}

        {/* Axis labels */}
        <text
          x={18}
          y={MID_Y}
          fontSize={13}
          fontWeight={600}
          fill="#555"
          textAnchor="middle"
          transform={`rotate(-90 18 ${MID_Y})`}
        >
          Power
        </text>
        <text x={MID_X} y={VIEW_H - 10} fontSize={13} fontWeight={600} fill="#555" textAnchor="middle">
          Interest
        </text>

        {/* low / high markers */}
        <text x={PLOT_X0 - 8} y={PLOT_Y0 + 8} fontSize={10} fill="#999" textAnchor="end">
          high
        </text>
        <text x={PLOT_X0 - 8} y={PLOT_Y1} fontSize={10} fill="#999" textAnchor="end">
          low
        </text>
        <text x={PLOT_X0} y={PLOT_Y1 + 20} fontSize={10} fill="#999" textAnchor="middle">
          low
        </text>
        <text x={PLOT_X1} y={PLOT_Y1 + 20} fontSize={10} fill="#999" textAnchor="middle">
          high
        </text>

        {/* Dots */}
        {dots.map((d) => (
          <g key={d.id}>
            <text x={d.x} y={d.y - R - 5} fontSize={11} fill="#222" textAnchor="middle">
              {shortLabel(d.name)}
            </text>
            <circle cx={d.x} cy={d.y} r={R} fill={relationshipColor(d.relationship)} />
            <text
              x={d.x}
              y={d.y}
              fontSize={10}
              fontWeight={700}
              fill="#fff"
              textAnchor="middle"
              dominantBaseline="central"
            >
              {initials(d.name)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
