'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Part } from '@/lib/types';

type View = 'persp' | 'front' | 'top';

function woodTexture(base: string, dark: [number, number, number], seed: number) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, 512, 512);
  let r = seed;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 260; i++) {
    const x = rnd() * 512;
    g.strokeStyle = `rgba(${dark[0] + rnd() * 30},${dark[1] + rnd() * 18},${dark[2]},${0.12 + rnd() * 0.22})`;
    g.lineWidth = 0.5 + rnd() * 2.5;
    g.beginPath();
    g.moveTo(x, 0);
    for (let y = 0; y <= 512; y += 32) g.lineTo(x + Math.sin(y / 60 + i) * 6, y);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function materialFor(sku: string, tex: Record<string, THREE.Texture>) {
  if (/^(BRS|HDL)/.test(sku)) return new THREE.MeshStandardMaterial({ color: 0xd4ae62, metalness: 0.55, roughness: 0.3 });
  if (/WAL/.test(sku)) return new THREE.MeshStandardMaterial({ map: tex.walnut, roughness: 0.55 });
  if (/OAK/.test(sku)) return new THREE.MeshStandardMaterial({ map: tex.oak, roughness: 0.6 });
  if (/HNY|ANI/.test(sku)) return new THREE.MeshStandardMaterial({ map: tex.anigre, roughness: 0.5 });
  if (/PLY/.test(sku)) return new THREE.MeshStandardMaterial({ color: 0xd9c7a3, roughness: 0.8 });
  if (/MDF-18/.test(sku)) return new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.7 });
  return new THREE.MeshStandardMaterial({ color: 0xbfb6aa, roughness: 0.7 });
}

/** Interactive model built straight from the cutting list. Tap a part to select it. */
export function Viewer3D({ parts, selected, onPick, height = 520 }: { parts: Part[]; selected?: string | null; onPick?: (id: string | null) => void; height?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const api = useRef<{ setParts: (p: Part[]) => void; select: (id?: string | null) => void; setView: (v: View) => void; setExplode: (v: number) => void } | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const [view, setView] = useState<View>('persp');
  const [explode, setExplode] = useState(0);

  useEffect(() => {
    const el = box.current!;
    const R = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    R.setPixelRatio(Math.min(devicePixelRatio, 2));
    R.setSize(el.clientWidth, el.clientHeight);
    R.toneMapping = THREE.ACESFilmicToneMapping;
    R.outputColorSpace = THREE.SRGBColorSpace;
    el.prepend(R.domElement);
    const S = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(32, el.clientWidth / el.clientHeight, 10, 30000);
    S.add(new THREE.HemisphereLight(0xffffff, 0xb9b2a6, 1.6));
    const dl = new THREE.DirectionalLight(0xffffff, 2.2);
    dl.position.set(1500, 2500, 2000);
    S.add(dl);
    const dl2 = new THREE.DirectionalLight(0xfff1dd, 0.8);
    dl2.position.set(-2000, 800, -1000);
    S.add(dl2);
    const tex = {
      walnut: woodTexture('#5a3b26', [30, 18, 10], 7),
      oak: woodTexture('#b8915e', [110, 80, 40], 11),
      anigre: woodTexture('#d8bf98', [150, 120, 80], 5),
    };
    const group = new THREE.Group();
    S.add(group);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(4000, 64), new THREE.ShadowMaterial({ opacity: 0.08 }));
    floor.rotation.x = -Math.PI / 2;
    S.add(floor);

    let meshes: THREE.Mesh[] = [];
    let th = -0.6,
      ph = 0.32,
      dist = 4200,
      ex = 0,
      v: View = 'persp',
      sel: string | null | undefined = null;
    const target = new THREE.Vector3(0, 420, 0);

    const applySel = () =>
      meshes.forEach((m) => {
        const mat = m.material as THREE.MeshStandardMaterial;
        const on = m.userData.id === sel;
        mat.emissive = new THREE.Color(on ? 0xa88648 : 0x000000);
        mat.emissiveIntensity = on ? 0.55 : 0;
        mat.transparent = !!sel && !on;
        mat.opacity = sel && !on ? 0.35 : 1;
      });

    const setParts = (parts: Part[]) => {
      meshes.forEach((m) => {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      });
      group.clear();
      meshes = parts.map((p) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(Math.max(p.w, 1), Math.max(p.h, 1), Math.max(p.d, 1)), materialFor(p.sku, tex));
        m.position.set(p.x, p.y, p.z);
        m.userData = { id: p.id, base: new THREE.Vector3(p.x, p.y, p.z), dir: new THREE.Vector3(...p.dir) };
        m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 })));
        group.add(m);
        return m;
      });
      if (parts.length) {
        const bb = new THREE.Box3().setFromObject(group);
        const size = bb.getSize(new THREE.Vector3());
        target.set(0, size.y / 2, 0);
        dist = Math.max(1800, Math.max(size.x, size.y * 1.6, size.z) * 1.9);
      }
      applySel();
    };

    const place = () => {
      if (v === 'front') cam.position.set(0, target.y, dist);
      else if (v === 'top') cam.position.set(0, dist, 1);
      else cam.position.set(Math.sin(th) * Math.cos(ph) * dist, target.y + Math.sin(ph) * dist, Math.cos(th) * Math.cos(ph) * dist);
      cam.lookAt(target);
    };

    let drag: { x: number; y: number; m: number } | null = null;
    const ray = new THREE.Raycaster();
    const mv = new THREE.Vector2();
    const cv = R.domElement;
    const down = (e: PointerEvent) => {
      drag = { x: e.clientX, y: e.clientY, m: 0 };
      cv.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - drag.x,
        dy = e.clientY - drag.y;
      drag.m += Math.abs(dx) + Math.abs(dy);
      drag.x = e.clientX;
      drag.y = e.clientY;
      if (v === 'persp') {
        th -= dx * 0.006;
        ph = Math.max(-0.1, Math.min(1.4, ph + dy * 0.005));
      }
    };
    const up = (e: PointerEvent) => {
      if (drag && drag.m < 6) {
        const r = cv.getBoundingClientRect();
        mv.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(mv, cam);
        const h = ray.intersectObjects(meshes, false)[0];
        pickRef.current?.(h ? (h.object.userData.id as string) : null);
      }
      drag = null;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      dist = Math.max(800, Math.min(14000, dist * (1 + e.deltaY * 0.001)));
    };
    cv.addEventListener('pointerdown', down);
    cv.addEventListener('pointermove', move);
    cv.addEventListener('pointerup', up);
    cv.addEventListener('wheel', wheel, { passive: false });

    const ro = new ResizeObserver(() => {
      R.setSize(el.clientWidth, el.clientHeight);
      cam.aspect = el.clientWidth / el.clientHeight;
      cam.updateProjectionMatrix();
    });
    ro.observe(el);

    let raf = 0;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const loop = () => {
      meshes.forEach((m) => {
        const d = m.userData;
        m.position.copy(d.base).addScaledVector(d.dir, ex * 420);
      });
      if (!drag && v === 'persp' && !reduce) th += 0.0009;
      place();
      R.render(S, cam);
      raf = requestAnimationFrame(loop);
    };
    loop();

    api.current = {
      setParts,
      select: (id) => {
        sel = id;
        applySel();
      },
      setView: (x) => (v = x),
      setExplode: (x) => (ex = x),
    };
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      cv.removeEventListener('pointerdown', down);
      cv.removeEventListener('pointermove', move);
      cv.removeEventListener('pointerup', up);
      cv.removeEventListener('wheel', wheel);
      meshes.forEach((m) => {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      });
      Object.values(tex).forEach((t) => t.dispose());
      R.dispose();
      cv.remove();
      api.current = null;
    };
  }, []);

  useEffect(() => {
    api.current?.setParts(parts);
  }, [parts]);
  useEffect(() => {
    api.current?.select(selected);
  }, [selected, parts]);
  useEffect(() => {
    api.current?.setView(view);
  }, [view]);
  useEffect(() => {
    api.current?.setExplode(explode / 100);
  }, [explode]);

  return (
    <div className="viewer" ref={box} style={{ height }}>
      <div className="hud">
        <div className="seg">
          {(
            [
              ['persp', '3D'],
              ['front', 'Front'],
              ['top', 'Top'],
            ] as [View, string][]
          ).map(([k, l]) => (
            <button key={k} className={view === k ? 'on' : ''} onClick={() => setView(k)}>
              {l}
            </button>
          ))}
        </div>
        <span className="sp" />
        <span className="small muted">Explode</span>
        <input type="range" min={0} max={100} value={explode} onChange={(e) => setExplode(+e.target.value)} style={{ width: 160 }} aria-label="Explode" />
      </div>
    </div>
  );
}
