import { useEffect, useRef } from 'react';

export function useOutsideAlerter(ref: React.RefObject<any>, onOutsideClick: () => void) {
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target)) {
        onOutsideClick();
      }
    }

    if (ref) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      if (ref) {
        document.removeEventListener('mousedown', handleClickOutside);
      }
    };
  }, [ref, onOutsideClick]);
}
