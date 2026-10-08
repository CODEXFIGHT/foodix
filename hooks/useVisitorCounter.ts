/**
 * @fileoverview Hook para rastrear visitantes activos en la carta digital
 * @author JIMMY LOPEZ
 * @date 2026-05-28
 */
'use client';

import { useState, useEffect } from 'react';

const LS_COUNT_KEY   = 'restauros_visit_count';
const LS_LAST_KEY    = 'restauros_last_visit';
const SEED           = 312;
const REVISIT_MS     = 20 * 60 * 1000; // nueva visita cada 20 min

function readCount(): number {
  try {
    return SEED + parseInt(localStorage.getItem(LS_COUNT_KEY) ?? '0', 10);
  } catch { return SEED; }
}

function bumpCount(): number {
  try {
    const next = parseInt(localStorage.getItem(LS_COUNT_KEY) ?? '0', 10) + 1;
    localStorage.setItem(LS_COUNT_KEY, String(next));
    localStorage.setItem(LS_LAST_KEY,  String(Date.now()));
    return SEED + next;
  } catch { return SEED + 1; }
}

function shouldCount(): boolean {
  try {
    const last = parseInt(localStorage.getItem(LS_LAST_KEY) ?? '0', 10);
    return Date.now() - last > REVISIT_MS;
  } catch { return true; }
}

export function useVisitorCounter() {
  const [count,  setCount]  = useState<number | null>(null);
  const [bumped, setBumped] = useState(false);

  useEffect(() => {
    let n: number;
    if (shouldCount()) {
      n = bumpCount();
      setBumped(true);
    } else {
      n = readCount();
    }
    setCount(n);
  }, []);

  return { count, bumped };
}
