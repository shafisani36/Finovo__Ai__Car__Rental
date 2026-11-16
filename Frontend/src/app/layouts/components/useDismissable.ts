import { useEffect, type RefObject } from 'react';

/** Closes a drop-down panel when the user clicks outside it or presses Escape. */
export function useDismissable(ref: RefObject<HTMLElement | null>, isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [ref, isOpen, onClose]);
}
