import { useEffect, useRef } from 'react';

export function useOutsideAlerter(ref: React.RefObject<any>, onOutsideClick: () => void) {
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target)) {
        onOutsideClick();
      }
    }

    if (ref.current) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      if (ref.current) {
        document.removeEventListener('mousedown', handleClickOutside);
      }
    };
  }, [ref, onOutsideClick]);
}
