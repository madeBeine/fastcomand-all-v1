import React, { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/contexts/SettingsContext';

const VersionsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { getVersions, publishVersion, rollbackVersion, validateVersion } = useSettings();
  const [versions, setVersions] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [issues, setIssues] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const list = await getVersions();
      setVersions(list);
    })();
  }, [isOpen]);

  const loadIssues = async (id?: string) => {
    setLoading(true);
    try {
      const data = await validateVersion(id);
      setIssues(data.issues || []);
    } finally { setLoading(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إدارة الإصدارات">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="col-span-1 border rounded max-h-96 overflow-auto">
          {versions.map(v => (
            <div key={v.id} className={`p-2 border-b cursor-pointer ${selected?.id===v.id ? 'bg-gray-50 dark:bg-gray-800' : ''}`} onClick={()=>{ setSelected(v); setIssues(null); }}>
              <div className="text-sm font-medium">{v.id} — {v.status}</div>
              <div className="text-xs text-gray-500">{new Date(v.createdAt).toLocaleString()}</div>
              {v.message && <div className="text-xs">{v.message}</div>}
            </div>
          ))}
        </div>
        <div className="col-span-2 space-y-3">
          {!selected && <div className="text-sm text-gray-500">اختر إصدارًا</div>}
          {selected && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Button size="sm" variant="outline" onClick={()=> loadIssues(selected.id)} disabled={loading}>فحص الصحة</Button>
                <Button size="sm" onClick={async ()=> {
                  // run validation first
                  await loadIssues(selected.id);
                  // if there are errors, block publish
                  if (issues && issues.some(i => i.severity === 'error')) {
                    alert('يوجد أخطاء تمنع النشر. أصلحها قبل المتابعة.');
                    return;
                  }
                  // if only warnings, ask confirmation
                  const hasWarnings = issues && issues.some(i => i.severity === 'warning');
                  if (hasWarnings) {
                    const ok = confirm('يوجد تحذيرات في الفحص. هل تريد المتابعة والنشر؟');
                    if (!ok) return;
                  }
                  setLoading(true);
                  try {
                    await publishVersion(selected.id);
                    // refresh versions list and issues
                    const list = await getVersions();
                    setVersions(list);
                    await loadIssues(selected.id);
                  } finally { setLoading(false); }
                }}>نشر</Button>
                <Button size="sm" variant="destructive" onClick={async ()=> { await rollbackVersion(selected.id); const list = await getVersions(); setVersions(list); }}>استرجاع</Button>
              </div>
              <div className="text-sm font-medium">الفروقات (Diff)</div>
              <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded overflow-auto max-h-40">{JSON.stringify(selected.diffs, null, 2)}</pre>
              <div className="text-sm font-medium mt-2">المشكلات</div>
              {issues === null ? (<div className="text-xs text-gray-500">انقر فحص الصحة لعرض النتائج</div>) : (
                <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded overflow-auto max-h-40">{JSON.stringify(issues, null, 2)}</pre>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default VersionsModal;
