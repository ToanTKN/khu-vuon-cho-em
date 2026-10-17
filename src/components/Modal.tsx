import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';

// A photo viewer can sit above an album without either dialog losing focus.
const dialogs: HTMLElement[] = [];
let originalOverflow = '';
function syncDialogs() {
  dialogs.forEach((dialog, i) => {
    const covered = i !== dialogs.length - 1;
    dialog.inert = covered;
    if (covered) dialog.setAttribute('aria-hidden', 'true');
    else dialog.removeAttribute('aria-hidden');
  });
}

export function Modal({ children, onClose, label, variant = 'default' }: {
  children: ReactNode; onClose: () => void; label: string; variant?: 'default' | 'memory' | 'wish' | 'photo' | 'clear';
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    if (!dialogs.length) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    dialogs.push(dialog);
    dialog.querySelector<HTMLElement>('button')?.focus(); syncDialogs();
    const handler = (event: KeyboardEvent) => {
      if (dialogs[dialogs.length - 1] !== dialog) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); onClose(); }
      if (event.key === 'Tab') {
        const elements = Array.from(dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled),[href],input:not(:disabled),[tabindex="0"]'));
        const first = elements[0], last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
      const index = dialogs.indexOf(dialog);
      if (index !== -1) dialogs.splice(index, 1);
      syncDialogs();
      if (!dialogs.length) document.body.style.overflow = originalOverflow;
      if (previous?.isConnected && !previous.closest('[inert]')) previous.focus();
    };
  }, [onClose]);
  return createPortal(<div className={`modal-backdrop ${variant === 'photo' ? 'photo-backdrop' : ''}`} onClick={onClose}>
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className={`modal-card modal-${variant}`} ref={ref} role="dialog" aria-modal="true" aria-label={label}
      onClick={event => event.stopPropagation()}>
      <button className="close" onClick={onClose} aria-label="Đóng">×</button>{children}
    </motion.div>
  </div>, document.body);
}
