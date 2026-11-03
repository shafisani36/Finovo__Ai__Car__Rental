import { createContext } from 'react';
import type Lenis from 'lenis';

export interface SmoothScrollContextValue {
  getLenis: () => Lenis | null;
}

export const SmoothScrollContext = createContext<SmoothScrollContextValue>({
  getLenis: () => null,
});
