'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { build, type Model, type Viewer } from '../lib/model';
import type { PersonRef, Snapshot } from '../lib/types';

export type Layer = { type: 'emp' | 'proj' | 'task'; id: string } | null;

type Ctx = {
  snap: Snapshot;
  M: Model;
  /** The signed-in person. */
  me: PersonRef;
  /** Signed in through dev mode with a mocked role. */
  dev: boolean;
  layer: Layer;
  open: (type: NonNullable<Layer>['type'], id: string) => void;
  close: () => void;
  toast: (msg: string) => void;
  toastMsg: string;
};

const DataCtx = createContext<Ctx | null>(null);

export function DataProvider({ snapshot, viewer, me, dev, children }: { snapshot: Snapshot; viewer: Viewer; me: PersonRef; dev: boolean; children: ReactNode }) {
  // "Today" comes from when the data was read, so server and browser render the same thing.
  const M = useMemo(() => build(snapshot, viewer, snapshot.generatedAt), [snapshot, viewer]);
  const [layer, setLayer] = useState<Layer>(null);
  const [toastMsg, setToastMsg] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const open = useCallback((type: NonNullable<Layer>['type'], id: string) => setLayer({ type, id }), []);
  const close = useCallback(() => setLayer(null), []);
  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToastMsg(''), 2800);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setLayer(null);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = layer ? 'hidden' : '';
  }, [layer]);

  const value = useMemo(() => ({ snap: snapshot, M, me, dev, layer, open, close, toast, toastMsg }), [snapshot, M, me, dev, layer, open, close, toast, toastMsg]);
  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}

export function useData(): Ctx {
  const c = useContext(DataCtx);
  if (!c) throw new Error('useData must be used inside DataProvider');
  return c;
}

/** State remembered in localStorage when available. Falls back to memory. */
export function useStored<T extends string>(key: string, initial: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(initial);
  useEffect(() => {
    try {
      const s = localStorage.getItem('maqo.cc.' + key);
      if (s) setV(s as T);
    } catch {}
  }, [key]);
  const set = useCallback(
    (nv: T) => {
      setV(nv);
      try {
        localStorage.setItem('maqo.cc.' + key, nv);
      } catch {}
    },
    [key],
  );
  return [v, set];
}
