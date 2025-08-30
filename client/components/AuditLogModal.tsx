import React, { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import { useSettings } from '@/contexts/SettingsContext';
import { Button } from '@/components/ui/button';

const AuditLogModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { getAuditLog } = useSettings();
  const [logs, setLogs] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    (async () => {
      try {
        const data = await getAuditLog();
        if (mounted) setLogs(data);
      } catch (e) { console.error(e); }
    })();
    return () => { mounted = false; };
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="سجل التغييرات">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="col-span-1 p-2 border rounded max-h-96 overflow-auto">
          {logs.length === 0 && <div className="text-sm text-gray-500">لا توجد سجلات</div>}
          {logs.map(l => (
            <div key={l.id} className="p-2 border-b last:border-b-0 cursor-pointer" onClick={() => setSelected(l)}>
              <div className="text-sm font-medium">{l.type}</div>
              <div className="text-xs text-gray-500">{l.user?.name || l.user?.id} — {new Date(l.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
        <div className="col-span-2 p-2 border rounded">
          {!selected && <div className="text-sm text-gray-500">اختر سجل لعرض التفاصيل</div>}
          {selected && (
            <div>
              <div className="text-sm font-medium mb-2">تفاصيل</div>
              <pre className="text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded overflow-auto max-h-80">{JSON.stringify(selected, null, 2)}</pre>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard?.writeText(JSON.stringify(selected)); }}>نسخ</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default AuditLogModal;
