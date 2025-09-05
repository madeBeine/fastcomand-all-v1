import React from 'react';
import { Dialog, DialogContent, DialogClose, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useLockBodyScroll } from '@/hooks/use-lock-body-scroll';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClass?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, maxWidthClass = 'sm:max-w-2xl' }) => {
  useLockBodyScroll(isOpen);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className={`bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full ${maxWidthClass} mx-auto max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-4 border-b">
          {title ? <DialogTitle>{title}</DialogTitle> : <div />}
          <div>
            <DialogClose asChild>
              <button className="p-2"><X /></button>
            </DialogClose>
          </div>
        </div>

        <div className="p-4">{children}</div>

        {footer ? (
          <div className="p-4 border-t flex justify-end gap-2">{footer}</div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default Modal;
