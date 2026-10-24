'use client';

import { Icon } from '@/components/Icon';
import { SOPS } from '@/lib/demo/reference';

export default function ProceduresPage() {
  return (
    <div className="grid g2 fade">
      {SOPS.map((s) => (
        <div key={s.n} className="card">
          <h2 style={{ flexWrap: 'wrap' }}>
            <Icon name="book-open" s />
            {s.n}
            <span className="r">Owner {s.owner}</span>
          </h2>
          <ol className="steps" style={{ marginTop: 8 }}>
            {s.steps.map((x, i) => (
              <li key={i}>
                <b>{i + 1}</b>
                <span>{x}</span>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
