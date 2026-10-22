import { useEffect, useLayoutEffect, useRef } from "react";

/** Keep keyboard focus inside an open modal and restore the trigger on close. */
export function useModalFocus(open: boolean, onClose: () => void, busy = false) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  const blocked = useRef(busy);
  useLayoutEffect(()=>{close.current=onClose;blocked.current=busy;},[onClose,busy]);
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    const controls = () => Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')).filter(el => !el.closest('[hidden],[inert]') && el.getAttribute('aria-hidden') !== 'true');
    (controls()[0] || dialog).focus();
    const keydown = (event: KeyboardEvent) => {
      const dialogs=document.querySelectorAll('[role="dialog"][aria-modal="true"]');
      if(dialogs[dialogs.length-1]!==dialog)return;
      if (event.key === 'Escape' && !blocked.current) { event.preventDefault(); event.stopPropagation(); close.current(); }
      if (event.key !== 'Tab') return;
      const list = controls();
      if (!list.length) { event.preventDefault(); dialog.focus(); return; }
      const first = list[0], last = list[list.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); if (previous?.isConnected) previous.focus({preventScroll:true}); };
  }, [open]);
  return ref;
}
