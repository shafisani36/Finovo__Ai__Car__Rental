import { useContext } from 'react';
import { SmoothScrollContext, type SmoothScrollContextValue } from './SmoothScrollContext';

export function useSmoothScroll(): SmoothScrollContextValue {
  return useContext(SmoothScrollContext);
}
