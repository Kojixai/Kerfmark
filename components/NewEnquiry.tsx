'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from './Icon';
import { Drawer } from './ui';
import { useStore } from '@/lib/store';
import type { Sector } from '@/lib/types';

export function NewEnquiry({ open, onClose }: { open: boolean; onClose: () => void }) {
  const clients = useStore((s) => s.clients);
  const newEnquiry = useStore((s) => s.newEnquiry);
  const router = useRouter();
  const [client, setClient] = useState('C05');
  const [title, setTitle] = useState('Pair of gilded consoles');
  const [sector, setSector] = useState<Sector>('Residential');
  const [brief, setBrief] = useState('');
  const [file, setFile] = useState('');
  return (
    <Drawer open={open} title="New enquiry" onClose={onClose}>
      <div className="stack">
        <div className="field">
          <label>Client</label>
          <select
            className="inp"
            value={client}
            onChange={(e) => {
              setClient(e.target.value);
              setSector(clients.find((c) => c.id === e.target.value)!.sector);
            }}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Project title</label>
          <input className="inp" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label>Sector</label>
          <div className="seg">
            {(['Residential', 'Marine', 'Aviation'] as Sector[]).map((s) => (
              <button key={s} className={sector === s ? 'on' : ''} onClick={() => setSector(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Brief</label>
          <textarea className="inp" style={{ minHeight: 90 }} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="What they asked for, site, timing" />
        </div>
        <div className="field">
          <label>Drawings</label>
          <label className="dropzone">
            <Icon name="upload-simple" />
            <span>{file || 'Choose PDF drawings'}</span>
            <input type="file" accept=".pdf" hidden onChange={(e) => setFile(e.target.files?.[0]?.name ?? '')} />
          </label>
        </div>
        <button
          className="btn dark"
          disabled={!title.trim()}
          onClick={() => {
            const id = newEnquiry({ client, title: title.trim(), sector, brief, file: file || undefined });
            onClose();
            router.push(`/projects/${id}`);
          }}
        >
          <Icon name="plus" s />
          Create enquiry
        </button>
      </div>
    </Drawer>
  );
}
