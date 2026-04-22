'use client';

import { useContext } from 'react';
import { VistaContext, type VistaState } from '../VistaProvider';

export function useVista(): VistaState {
  const ctx = useContext(VistaContext);
  if (!ctx) throw new Error('useVista must be used within <VistaProvider>');
  return ctx;
}
