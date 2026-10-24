'use client';

import type { Part } from '@/lib/types';
import type { NestResult } from '@/lib/nest';

const metal = (sku: string) => /^(BRS|HDL)/.test(sku);

/**
 * A workshop-style drawing generated from the parts themselves: front elevation and plan, with
 * overall dimensions and a title block. Because it is drawn from the cutting list, any edit to a
 * part shows up here, which is the point: the drawing, price and 3D model can never disagree.
 */
export function Drawing({ parts, title, client, rev, selected, onPick }: { parts: Part[]; title: string; client: string; rev?: string; selected?: string | null; onPick?: (id: string) => void }) {
  const VW = 760;
  const VH = 600;
  if (!parts.length)
    return (
      <svg viewBox={`0 0 ${VW} ${VH}`}>
        <rect width={VW} height={VH} fill="#fff" />
        <text x={VW / 2} y={VH / 2} textAnchor="middle" fontSize="12" fill="#7c8589" fontFamily="var(--mono)">
          No parts on this item. Priced from labour and subcontract only.
        </text>
      </svg>
    );

  // Overall sizes are the furniture's, not the handles' or trims'.
  const body = parts.filter((p) => !metal(p.sku)).length ? parts.filter((p) => !metal(p.sku)) : parts;
  const minX = Math.min(...body.map((p) => p.x - p.w / 2));
  const maxX = Math.max(...body.map((p) => p.x + p.w / 2));
  const maxY = Math.max(...body.map((p) => p.y + p.h / 2));
  const minY = Math.min(0, ...body.map((p) => p.y - p.h / 2));
  const minZ = Math.min(...body.map((p) => p.z - p.d / 2));
  const maxZ = Math.max(...body.map((p) => p.z + p.d / 2));
  const W = maxX - minX;
  const H = maxY - minY;
  const D = maxZ - minZ;
  const s = Math.min((VW - 110) / W, (VH - 230) / (H + D));
  const ox = 50 + (VW - 110 - W * s) / 2;
  const oy = 44;
  const py = oy + H * s + 64; // plan origin

  const fx = (x: number) => ox + (x - minX) * s;
  const fy = (y: number) => oy + (maxY - y) * s;
  const pz = (z: number) => py + (maxZ - z) * s;

  const front = [...parts].sort((a, b) => a.z + a.d / 2 - (b.z + b.d / 2));
  const plan = [...parts].sort((a, b) => a.y + a.h / 2 - (b.y + b.h / 2));
  const stroke = (p: Part) => (p.id === selected ? '#a88648' : '#16191b');
  const sw = (p: Part) => (p.id === selected ? 2 : 0.8);
  const fill = (p: Part) => (p.id === selected ? '#f6f0e4' : metal(p.sku) ? '#c9a35a' : '#fff');

  const dim = (x1: number, y1: number, x2: number, y2: number, t: string, v?: boolean) => (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#2457a6" strokeWidth=".6" />
      <line x1={x1 - (v ? 3 : 0)} y1={y1 - (v ? 0 : 3)} x2={x1 + (v ? 3 : 0)} y2={y1 + (v ? 0 : 3)} stroke="#2457a6" strokeWidth=".6" />
      <line x1={x2 - (v ? 3 : 0)} y1={y2 - (v ? 0 : 3)} x2={x2 + (v ? 3 : 0)} y2={y2 + (v ? 0 : 3)} stroke="#2457a6" strokeWidth=".6" />
      <text
        x={(x1 + x2) / 2 + (v ? -5 : 0)}
        y={(y1 + y2) / 2 - 4}
        fontSize="9"
        fill="#2457a6"
        textAnchor="middle"
        fontFamily="var(--mono)"
        transform={v ? `rotate(-90 ${(x1 + x2) / 2 - 5} ${(y1 + y2) / 2 - 4})` : undefined}
      >
        {t}
      </text>
    </g>
  );

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} style={{ fontFamily: 'var(--mono)' }}>
      <rect width={VW} height={VH} fill="#fff" />
      <text x={ox} y={26} fontSize="9" fill="#7c8589">
        FRONT ELEVATION
      </text>
      {front.map((p) => (
        <rect
          key={p.id}
          x={fx(p.x - p.w / 2)}
          y={fy(p.y + p.h / 2)}
          width={Math.max(p.w * s, 0.6)}
          height={Math.max(p.h * s, 0.6)}
          fill={fill(p)}
          stroke={stroke(p)}
          strokeWidth={sw(p)}
          style={{ cursor: onPick ? 'pointer' : undefined }}
          onClick={() => onPick?.(p.id)}
        >
          <title>{p.name}</title>
        </rect>
      ))}
      {dim(fx(minX), fy(minY) + 18, fx(maxX), fy(minY) + 18, String(Math.round(W)))}
      {dim(fx(minX) - 16, fy(maxY), fx(minX) - 16, fy(minY), String(Math.round(H)), true)}

      <text x={ox} y={py - 12} fontSize="9" fill="#7c8589">
        PLAN
      </text>
      {plan.map((p) => (
        <rect
          key={p.id}
          x={fx(p.x - p.w / 2)}
          y={pz(p.z + p.d / 2)}
          width={Math.max(p.w * s, 0.6)}
          height={Math.max(p.d * s, 0.6)}
          fill={fill(p)}
          stroke={stroke(p)}
          strokeWidth={sw(p)}
          onClick={() => onPick?.(p.id)}
          style={{ cursor: onPick ? 'pointer' : undefined }}
        >
          <title>{p.name}</title>
        </rect>
      ))}
      {dim(fx(minX), pz(minZ) + 16, fx(maxX), pz(minZ) + 16, String(Math.round(W)))}
      {dim(fx(maxX) + 16, pz(maxZ), fx(maxX) + 16, pz(minZ), String(Math.round(D)), true)}

      <g fontSize="8" fill="#16191b">
        <rect x={VW - 240} y={VH - 92} width={220} height={80} fill="#fff" stroke="#16191b" strokeWidth=".8" />
        <text x={VW - 232} y={VH - 76}>
          {client.toUpperCase().slice(0, 34)}
        </text>
        <text x={VW - 232} y={VH - 62}>
          {title.toUpperCase().slice(0, 34)}
          {rev ? ` REV ${rev}` : ''}
        </text>
        <text x={VW - 232} y={VH - 48}>
          {Math.round(W)} x {Math.round(D)} x {Math.round(H)} MM
        </text>
        <text x={VW - 232} y={VH - 34}>
          {parts.length} PARTS
        </text>
        <text x={VW - 232} y={VH - 20} fill="#7c8589">
          BRACKENBURY HOME · NOT TO SCALE
        </text>
      </g>
    </svg>
  );
}

export function SheetView({ result, label, scale = 0.085 }: { result: NestResult; label?: string; scale?: number }) {
  return (
    <div className="sheets">
      {result.sheets.map((sh, i) => {
        const waste = 1 - sh.used / (result.sheetL * result.sheetW);
        return (
          <div key={i} className="sheet" style={{ width: result.sheetL * scale, height: result.sheetW * scale }} title={`${label ?? ''} sheet ${i + 1}`}>
            {sh.pcs.map((p, j) => (
              <div
                key={j}
                className={`pc ${p.grain !== '-' ? 'grain' : ''} ${p.rotated ? 'rot' : ''}`}
                style={{ left: p.x * scale, top: p.y * scale, width: p.pl * scale, height: p.pw * scale }}
                title={`${p.name} ${Math.round(p.L)} x ${Math.round(p.W)}${p.rotated ? ' (turned)' : ''}`}
              >
                {p.pl * scale > 42 && p.pw * scale > 9 ? p.name.replace('End panel', 'End').replace('Division', 'Div').replace('Plinth', 'Pl.') : ''}
              </div>
            ))}
            <span className="waste">{Math.round(waste * 100)}% offcut</span>
          </div>
        );
      })}
    </div>
  );
}
