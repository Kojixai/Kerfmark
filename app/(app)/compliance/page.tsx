'use client';

import { Icon } from '@/components/Icon';
import { Due, Kpi, useCan } from '@/components/ui';
import { useStore } from '@/lib/store';
import { STAFF } from '@/lib/demo/reference';
import { days, dshort } from '@/lib/format';

const CAT_ICON: Record<string, string> = { Fire: 'fire-extinguisher', Electrical: 'lightning', Insurance: 'shield-check', Building: 'buildings' };

export default function CompliancePage() {
  const compliance = useStore((s) => s.compliance);
  const logCompliance = useStore((s) => s.logCompliance);
  const canLog = useCan('compliance');

  const cats = [...new Set(compliance.map((c) => c.cat))];
  const over = compliance.filter((c) => days(c.next) < 0).length;
  const soon = compliance.filter((c) => days(c.next) >= 0 && days(c.next) <= 30).length;
  const certs = STAFF.reduce((a, s) => a + s.certs.filter((c) => days(c.exp) < 60).length, 0);

  return (
    <div className="fade">
      <div className="grid g4">
        <Kpi l="Overdue" v={over} d={over ? 'Fix these first' : 'Nothing overdue'} ic="warning" cls={over ? 'down' : 'up'} />
        <Kpi l="Due in 30 days" v={soon} d="Reminders sent to owners" ic="clock" />
        <Kpi l="Certificates expiring" v={certs} d={`Across ${STAFF.length} people`} ic="graduation-cap" />
        <Kpi l="Last fire drill" v="12 Aug 2026" d="Next due Feb 2027" ic="fire-extinguisher" />
      </div>
      {cats.map((cat) => (
        <div key={cat} className="card flush mt16">
          <div className="hd">
            <h2>
              <Icon name={CAT_ICON[cat] ?? 'hammer'} s />
              {cat}
            </h2>
          </div>
          <div className="scroll-x">
            <table className="t">
              <thead>
                <tr>
                  <th>Check</th>
                  <th>Legal basis</th>
                  <th>How often</th>
                  <th>Last done</th>
                  <th>Next</th>
                  <th>Owner</th>
                  {canLog && <th />}
                </tr>
              </thead>
              <tbody>
                {compliance
                  .filter((c) => c.cat === cat)
                  .map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 500, minWidth: 180 }}>{c.n}</td>
                      <td className="small muted">{c.basis}</td>
                      <td className="small">{c.freq}</td>
                      <td className="num small" style={{ whiteSpace: 'nowrap' }}>
                        {dshort(c.last)}
                      </td>
                      <td>
                        <Due d={c.next} />
                      </td>
                      <td className="small" style={{ whiteSpace: 'nowrap' }}>
                        {c.owner}
                      </td>
                      {canLog && (
                        <td className="r">
                          <button className="btn sm" onClick={() => logCompliance(c.id)}>
                            <Icon name="upload-simple" s />
                            Log
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
