import React from 'react';
import { useLockBodyScroll } from '../hooks/use-lock-body-scroll';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Settings as SettingsIcon } from 'lucide-react';
import { eventBus } from '@/lib/eventBus';
import { formatDate, formatDateTime, formatNumberEN } from '@/utils/format';

type MeetingStatus =
  | 'open'
  | 'discussion'
  | 'voting'
  | 'approved'
  | 'in-progress'
  | 'done'
  | 'archived';

type ChatMessage = {
  id: string;
  type: 'text' | 'audio' | 'file';
  content: string; // for text or dataURL for files
  fileName?: string;
  mimeType?: string;
  sender: string;
  timestamp: string;
};

type DecisionOption = {
  id: string;
  label: string;
  votes: string[]; // list of voter ids
};

type Decision = {
  id: string;
  title: string;
  options: DecisionOption[];
  accepted?: boolean;
};

type Step = { id: string; title: string; done: boolean };

type Attachment = { id: string; name: string; dataUrl: string; mimeType: string };

type Meeting = {
  id: number;
  title: string;
  owner: string;
  summary: string;
  status: MeetingStatus;
  participants: number;
  date: string; // ISO
  durationMinutes?: number;
  meetingType?: string;
  importance?: 'low' | 'medium' | 'high';
  investors?: string[]; // list of investor names/ids
  cost?: number;
  attachments?: Attachment[];
  chat: ChatMessage[];
  decisions: Decision[];
  steps: Step[];
};

const STORAGE_KEY = 'app_meetings_v3';
const LAST_ID_KEY = 'app_meetings_last_id_v3';

const statusLabel = (s: MeetingStatus) => {
  switch (s) {
    case 'open':
      return 'مفتوح';
    case 'discussion':
      return 'نقاش';
    case 'voting':
      return 'تصويت';
    case 'approved':
      return 'معتمد';
    case 'in-progress':
      return 'تنفيذ';
    case 'done':
      return 'منجز';
    case 'archived':
      return 'مؤرشف';
  }
};

const statusBadge = (s: MeetingStatus) => {
  const base = 'mt-2 px-2 py-1 rounded text-xs';
  switch (s) {
    case 'open':
      return `${base} bg-gray-100 text-gray-800`;
    case 'discussion':
      return `${base} bg-yellow-100 text-yellow-800`;
    case 'voting':
      return `${base} bg-orange-100 text-orange-800`;
    case 'approved':
      return `${base} bg-emerald-100 text-emerald-800`;
    case 'in-progress':
      return `${base} bg-blue-100 text-blue-800`;
    case 'done':
      return `${base} bg-green-100 text-green-800`;
    case 'archived':
      return `${base} bg-gray-200 text-gray-700`;
  }
};

const useLocalMeetings = () => {
  const [meetings, setMeetings] = React.useState<Meeting[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Meeting[]) : [];
    } catch (e) {
      return [];
    }
  });

  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(meetings));
  }, [meetings]);

  const addMeeting = (m: Omit<Meeting, 'id'>) => {
    const lastRaw = localStorage.getItem(LAST_ID_KEY);
    const last = lastRaw ? parseInt(lastRaw, 10) : 0;
    const next = last + 1;
    localStorage.setItem(LAST_ID_KEY, String(next));
    const meeting: Meeting = { ...m, id: next };
    setMeetings((s) => [meeting, ...s]);
    return meeting;
  };

  const updateMeeting = (id: number, patch: Partial<Meeting>) => {
    setMeetings((s) => s.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const replaceMeeting = (id: number, full: Meeting) => {
    setMeetings((s) => s.map((m) => (m.id === id ? full : m)));
  };

  return { meetings, addMeeting, updateMeeting, replaceMeeting, setMeetings };
};

const MeetingsPage: React.FC = () => {
  const { meetings, addMeeting, updateMeeting, replaceMeeting } = useLocalMeetings();
  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | MeetingStatus>('all');
  const [tab, setTab] = React.useState<'active' | 'archive'>('active');
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');

  const [selected, setSelected] = React.useState<Meeting | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  useLockBodyScroll(modalOpen || settingsOpen);

  React.useEffect(() => {
    if (meetings.length === 0) {
      const now = new Date().toISOString();
      addMeeting({
        title: 'اجتماع مجلس الإدارة - مراجعة الربع الأول',
        owner: 'أحمد بن زين',
        summary: 'مراجعة أداء الربع الأول ومناقشة الميزا��ية.',
        status: 'open',
        participants: 7,
        date: now,
        durationMinutes: 90,
        meetingType: 'إدارة',
        importance: 'high',
        investors: ['مستثمر 1', 'مستثمر 2'],
        cost: 0,
        attachments: [],
        chat: [],
        decisions: [],
        steps: [],
      });
      addMeeting({
        title: 'إطلاق النسخة 2.0 - خطة التنفيذ',
        owner: 'سارة العمر',
        summary: 'تحديد المهام الأساسية والزمن المتوقع.',
        status: 'in-progress',
        participants: 9,
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
        durationMinutes: 60,
        meetingType: 'منتج',
        importance: 'medium',
        investors: ['مستثمر 3'],
        cost: 1500,
        attachments: [],
        chat: [],
        decisions: [
          {
            id: 'd1',
            title: 'اعتماد موعد الإطلاق',
            options: [
              { id: '1', label: 'نعم', votes: ['u1', 'u2', 'u3', 'u4', 'u5'] },
              { id: '2', label: 'لا', votes: [] },
              { id: '3', label: 'محايد', votes: [] },
            ],
            accepted: true,
          },
        ],
        steps: [
          { id: 's1', title: 'إعداد خطة الإطلاق', done: true },
          { id: 's2', title: 'تجهيز حملات التسويق', done: false },
        ],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openMeeting = (m: Meeting) => { setSelected(m); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setSelected(null); };

  const createMeeting = () => {
    const m = addMeeting({
      title: 'اجتماع جديد',
      owner: 'المستخدم الحالي',
      summary: '',
      status: 'open',
      participants: 3,
      date: new Date().toISOString(),
      durationMinutes: 30,
      meetingType: 'عام',
      importance: 'low',
      investors: [],
      cost: 0,
      attachments: [],
      chat: [],
      decisions: [],
      steps: [],
    });
    openMeeting(m);
  };

  const inDateRange = (iso: string) => {
    if (!fromDate && !toDate) return true;
    const t = new Date(iso).getTime();
    if (fromDate && t < new Date(fromDate).getTime()) return false;
    if (toDate && t > new Date(toDate).getTime() + 24 * 60 * 60 * 1000 - 1) return false;
    return true;
  };

  const filtered = meetings.filter((m) => {
    const archived = m.status === 'archived';
    if (tab === 'active' && archived) return false;
    if (tab === 'archive' && !archived) return false;
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    if (!inDateRange(m.date)) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      m.title.toLowerCase().includes(q) ||
      m.owner.toLowerCase().includes(q) ||
      m.summary.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">إدارة الاجتماعات</h1>
          <p className="text-sm text-muted-foreground">بطاقات أنيقة، نقاش نصي/صوتي، تصويت (يتضمن محايد)، تنفيذ، وأرشيف</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setSettingsOpen(true)} className="px-3 py-2 bg-gray-100 rounded inline-flex items-center gap-2"><SettingsIcon size={16} /> إعدادات</button>
          <button onClick={createMeeting} className="px-3 py-2 bg-brand-blue text-white rounded-md shadow-sm">��جتماع جديد</button>
          <button onClick={() => {
            const d = new Date(); d.setHours(15,0,0,0);
            const m = addMeeting({ title: 'اجتماع سريع', owner: 'المستخدم الحالي', summary: 'نقاش سريع مع قرارات بسيطة.', status: 'open', participants: 3, date: d.toISOString(), durationMinutes: 30, meetingType: 'عام', importance: 'medium', investors: [], cost: 0, attachments: [], chat: [], decisions: [], steps: [] });
            setSelected(m); setModalOpen(true);
          }} className="px-3 py-2 bg-orange-500 text-white rounded-md shadow-sm">اجتماع سريع اليوم 15:00</button>
        </div>
      </div>

      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md max-h-screen overflow-y-auto">
          <SheetHeader>
            <SheetTitle>إعدادات الاجتماعات</SheetTitle>
          </SheetHeader>
          <MeetingsSettingsPanel onClose={() => setSettingsOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="bg-card rounded-2xl shadow-sm border p-3 sm:p-4 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => setTab('active')} className={`px-3 py-1.5 rounded ${tab === 'active' ? 'bg-brand-orange text-white' : 'bg-gray-100'}`}>النشطة</button>
          <button onClick={() => setTab('archive')} className={`px-3 py-1.5 rounded ${tab === 'archive' ? 'bg-brand-orange text-white' : 'bg-gray-100'}`}>الأرشيف</button>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث بالعنوان / صاحب الطرح / الملخص" className="px-3 py-2 border rounded w-full" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="px-2 py-2 border rounded">
            <option value="all">الحالة: الكل</option>
            <option value="open">مفتوح</option>
            <option value="discussion">نقاش</option>
            <option value="voting">تصويت</option>
            <option value="approved">معتمد</option>
            <option value="in-progress">تنفيذ</option>
            <option value="done">منجز</option>
            <option value="archived">مؤرشف</option>
          </select>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="px-3 py-2 border rounded" />
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="px-3 py-2 border rounded" />
        </div>
        <div className="mt-2 text-xs text-muted-foreground">النتائج: {formatNumberEN(filtered.length)}</div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((m) => (
          <div key={m.id} className="bg-card p-4 rounded-2xl shadow hover:shadow-lg transition cursor-pointer border" onClick={() => openMeeting(m)}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground"># {formatNumberEN(m.id)}</div>
                <h2 className="font-semibold text-lg truncate">{m.title}</h2>
                <div className="text-sm text-muted-foreground truncate">مقدم بواسطة: {m.owner}</div>
              </div>
              <div className="text-right">
                <div className="text-sm">{formatDate(m.date)}</div>
                <div className={statusBadge(m.status)}>{statusLabel(m.status)}</div>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{m.summary || '— لا يوجد ملخص —'}</p>
            <div className="flex items-center justify-between mt-4 text-sm">
              <div>المشاركون: {formatNumberEN(m.participants)}</div>
              <div className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); openMeeting(m); }} className="px-2 py-1 text-xs bg-brand-blue text-white rounded">افتح</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modalOpen && selected && (
        <MeetingModal
          meeting={selected}
          onClose={closeModal}
          onReplace={replaceMeeting}
          onUpdate={updateMeeting}
        />
      )}
    </div>
  );
};

const MeetingModal: React.FC<{
  meeting: Meeting;
  onClose: () => void;
  onReplace: (id: number, full: Meeting) => void;
  onUpdate: (id: number, patch: Partial<Meeting>) => void;
}> = ({ meeting, onClose, onReplace, onUpdate }) => {
  const [local, setLocal] = React.useState<Meeting>(meeting);
  const [newMessage, setNewMessage] = React.useState('');
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const [recorderSupported, setRecorderSupported] = React.useState(false);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<BlobPart[]>([]);
  const [recording, setRecording] = React.useState(false);
  const [recordSec, setRecordSec] = React.useState(0);
  const attachRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => setLocal(meeting), [meeting]);
  React.useEffect(() => { setRecorderSupported(!!(navigator.mediaDevices && (window as any).MediaRecorder)); }, []);
  React.useEffect(() => { let t: any; if (recording) { t = setInterval(() => setRecordSec((s) => s + 1), 1000); } return () => clearInterval(t); }, [recording]);

  const save = () => { onReplace(local.id, local); };

  const sendText = () => {
    if (!newMessage.trim()) return;
    const msg: ChatMessage = { id: String(Date.now()), type: 'text', content: newMessage.trim(), sender: 'أنت', timestamp: new Date().toISOString() };
    const updated = { ...local, chat: [...local.chat, msg] };
    setLocal(updated);
    setNewMessage('');
    onUpdate(local.id, { chat: updated.chat });
  };

  const handleFile = async (f?: File) => {
    const file = f || (fileRef.current && fileRef.current.files && fileRef.current.files[0]);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result as string;
      const msg: ChatMessage = { id: String(Date.now()), type: file.type.startsWith('audio') ? 'audio' : 'file', content: data, fileName: file.name, mimeType: file.type, sender: 'أنت', timestamp: new Date().toISOString() };
      const updated = { ...local, chat: [...local.chat, msg] };
      setLocal(updated);
      onUpdate(local.id, { chat: updated.chat });
      if (fileRef.current) fileRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      mediaRecorderRef.current = rec;
      chunksRef.current = [];
      setRecordSec(0);
      rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const msg: ChatMessage = { id: String(Date.now()), type: 'audio', content: dataUrl, sender: 'أنت', timestamp: new Date().toISOString() };
          const updated = { ...local, chat: [...local.chat, msg] };
          setLocal(updated);
          onUpdate(local.id, { chat: updated.chat });
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      rec.start();
      setRecording(true);
    } catch (e) {
      setRecorderSupported(false);
    }
  };

  const stopRecording = () => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== 'inactive') { rec.stop(); }
    setRecording(false);
  };

  const addDecision = (title: string, opts: string[]) => {
    const decision: Decision = { id: String(Date.now()), title, options: opts.map((o, i) => ({ id: `${i}`, label: o, votes: [] })) };
    const updated = { ...local, decisions: [...local.decisions, decision], status: local.status === 'open' ? 'discussion' : local.status };
    setLocal(updated);
    onUpdate(local.id, { decisions: updated.decisions, status: updated.status });
  };

  const startVoting = () => { const updated = { ...local, status: 'voting' as MeetingStatus }; setLocal(updated); onUpdate(local.id, { status: 'voting' }); };

  const vote = (decisionId: string, optionId: string) => {
    const updated = { ...local };
    const dec = updated.decisions.find((d) => d.id === decisionId);
    if (!dec) return;
    dec.options.forEach((o) => { o.votes = o.votes.filter((v) => v !== 'you'); });
    const opt = dec.options.find((o) => o.id === optionId);
    if (!opt) return;
    opt.votes.push('you');

    const votesFor = opt.votes.length;
    if (votesFor > local.participants / 2) {
      dec.accepted = true;
      updated.status = 'in-progress';
      if (updated.steps.length === 0) { updated.steps = [ { id: 'step1', title: 'تنفيذ القرار', done: false } ]; }
      try { eventBus.emit('investment.decision.approved', { meetingId: updated.id, decision: dec.title }); } catch {}
    }

    setLocal(updated);
    onUpdate(local.id, { decisions: updated.decisions, status: updated.status, steps: updated.steps });
  };

  const toggleStep = (id: string) => {
    const updated = { ...local, steps: local.steps.map((s) => (s.id === id ? { ...s, done: !s.done } : s)) };
    const allDone = updated.steps.length > 0 && updated.steps.every((s) => s.done);
    if (allDone) {
      updated.status = 'done';
      try { eventBus.emit('investment.execution.completed', { meetingId: updated.id }); } catch {}
    }
    setLocal(updated);
    onUpdate(local.id, { steps: updated.steps, status: updated.status });
  };

  const addStep = (title: string) => { if (!title.trim()) return; const updated = { ...local, steps: [...local.steps, { id: String(Date.now()), title: title.trim(), done: false }] }; setLocal(updated); onUpdate(local.id, { steps: updated.steps }); };

  const onAttachMeetingFile = (f?: File) => {
    const file = f || (attachRef.current && attachRef.current.files && attachRef.current.files[0]);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result as string;
      const att: Attachment = { id: String(Date.now()) + Math.random().toString(36).slice(2,8), name: file.name, dataUrl: data, mimeType: file.type };
      const updated = { ...local, attachments: [...(local.attachments || []), att] };
      setLocal(updated);
      onUpdate(local.id, { attachments: updated.attachments });
      if (attachRef.current) attachRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const removeMeetingAttachment = (attId: string) => {
    const updated = { ...local, attachments: (local.attachments || []).filter(a => a.id !== attId) };
    setLocal(updated);
    onUpdate(local.id, { attachments: updated.attachments });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-5xl max-h-[92vh] overflow-hidden bg-card rounded-2xl shadow-lg flex flex-col">
        <div className="p-4 border-b flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sticky top-0 bg-card">
          <div className="min-w-0">
            <input
              value={local.title}
              onChange={(e) => { const v = e.target.value; setLocal((s) => ({ ...s, title: v })); }}
              onBlur={(e) => onUpdate(local.id, { title: (e.target as HTMLInputElement).value })}
              className="w-full text-lg sm:text-xl font-semibold truncate px-2 py-1 bg-transparent border-0 focus:outline-none"
            />
            <div className="text-sm text-muted-foreground mt-1">
              <span className="mr-2">مقدم بواسطة</span>
              <input
                value={local.owner}
                onChange={(e) => { const v = e.target.value; setLocal((s) => ({ ...s, owner: v })); }}
                onBlur={(e) => onUpdate(local.id, { owner: (e.target as HTMLInputElement).value })}
                className="inline-block px-2 py-1 border-0 bg-transparent focus:outline-none text-sm font-medium"
              />
              <span className="mx-2">•</span>
              <span>{formatDateTime(local.date)}</span>
              <span className="ml-2 text-sm text-muted-foreground">#{formatNumberEN(local.id)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className={statusBadge(local.status)}>{statusLabel(local.status)}</div>
            <select value={local.status} onChange={(e) => { const st = e.target.value as MeetingStatus; setLocal((s) => ({ ...s, status: st })); onUpdate(local.id, { status: st }); }} className="px-2 py-1 border rounded text-sm">
              <option value="open">مفتوح</option>
              <option value="discussion">نقاش</option>
              <option value="voting">تصويت</option>
              <option value="approved">معتمد</option>
              <option value="in-progress">تنفيذ</option>
              <option value="done">منجز</option>
              <option value="archived">مؤرشف</option>
            </select>
            <button onClick={() => { save(); }} className="px-3 py-1.5 bg-emerald-600 text-white rounded">حفظ</button>
            <button onClick={() => { save(); onClose(); }} className="px-3 py-1.5 bg-brand-blue text-white rounded">إغلاق</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="col-span-2">
              <div className="space-y-3">
                <h4 className="font-semibold">النقاش</h4>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg space-y-2 max-h-72 overflow-y-auto">
                  {local.chat.length === 0 && <div className="text-sm text-muted-foreground">لا توجد رسائل بعد.</div>}
                  {local.chat.map((msg) => (
                    <div key={msg.id} className={`max-w-full sm:max-w-[80%] p-2 rounded shadow-sm ${msg.sender === 'أنت' ? 'ml-auto bg-brand-orange/10' : 'bg-white dark:bg-gray-900'}`}>
                      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                        <div className="truncate">{msg.sender}</div>
                        <div>{formatDateTime(msg.timestamp)}</div>
                      </div>
                      <div className="mt-1 text-sm break-words">
                        {msg.type === 'text' && <div>{msg.content}</div>}
                        {msg.type === 'audio' && (<audio controls src={msg.content} className="w-full" />)}
                        {msg.type === 'file' && (
                          <div className="space-y-1">
                            <div className="text-sm truncate">{msg.fileName}</div>
                            <a className="text-brand-blue text-sm underline" href={msg.content} download={msg.fileName}>تحميل</a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                  <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="اكتب رسالة..." className="flex-1 px-3 py-2 border rounded" />
                  <input ref={fileRef} onChange={() => handleFile()} type="file" accept="image/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" />
                  <div className="flex items-center gap-2">
                    <button onClick={() => fileRef.current && fileRef.current.click()} className="px-3 py-2 bg-gray-100 rounded">أرفق</button>
                    {recorderSupported && !recording && (
                      <button onClick={startRecording} className="px-3 py-2 bg-gray-100 rounded">تسجيل صوتي</button>
                    )}
                    {recorderSupported && recording && (
                      <button onClick={stopRecording} className="px-3 py-2 bg-red-600 text-white rounded">إيقاف ({formatNumberEN(recordSec)}s)</button>
                    )}
                    <button onClick={sendText} className="px-3 py-2 bg-brand-blue text-white rounded">أرسل</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-1">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold">التفاصيل</h4>
                  <textarea
                    value={local.summary}
                    onChange={(e) => setLocal((s) => ({ ...s, summary: e.target.value }))}
                    onBlur={(e) => onUpdate(local.id, { summary: (e.target as HTMLTextAreaElement).value })}
                    placeholder="أضف ملخصاً للاجتماع"
                    className="w-full px-3 py-2 border rounded text-sm resize-none"
                    rows={3}
                  />
                  <div className="mt-2 text-sm flex flex-col gap-2">
                    <label className="inline-flex items-center gap-2">المدة (دقيقة): <input type="number" value={local.durationMinutes || 0} onChange={(e) => { const v = parseInt((e.target as HTMLInputElement).value || '0', 10); setLocal((s) => ({ ...s, durationMinutes: Number.isFinite(v) ? v : 0 })); }} onBlur={(e) => onUpdate(local.id, { durationMinutes: Number((e.target as HTMLInputElement).value || 0) })} className="w-24 ml-2 px-2 py-1 border rounded text-sm" /></label>
                    <label className="inline-flex items-center gap-2">التكلفة (MRU): <input type="number" value={local.cost || 0} onChange={(e) => { const v = parseInt((e.target as HTMLInputElement).value || '0', 10); setLocal((s) => ({ ...s, cost: Number.isFinite(v) ? v : 0 })); }} onBlur={(e) => onUpdate(local.id, { cost: Number((e.target as HTMLInputElement).value || 0) })} className="w-32 ml-2 px-2 py-1 border rounded text-sm" /></label>
                    <label className="block">النوع
                      <select value={local.meetingType || ''} onChange={(e) => { const v = e.target.value; setLocal((s) => ({ ...s, meetingType: v })); onUpdate(local.id, { meetingType: v }); }} className="w-full mt-1 px-3 py-2 border rounded text-sm">
                        <option value="">—</option>
                        <option value="إدارة">إدارة</option>
                        <option value="مالي">مالي</option>
                        <option value="منتج">منتج</option>
                        <option value="تشغيلي">تشغيلي</option>
                      </select>
                    </label>
                    <label className="block">الأهمية
                      <select value={local.importance || 'low'} onChange={(e) => { const v = e.target.value as 'low'|'medium'|'high'; setLocal((s) => ({ ...s, importance: v })); onUpdate(local.id, { importance: v }); }} className="w-full mt-1 px-3 py-2 border rounded text-sm">
                        <option value="low">منخفضة</option>
                        <option value="medium">متوسطة</option>
                        <option value="high">عالية</option>
                      </select>
                    </label>
                    <label className="block">المستثمرون المعنيون (افصل بفواصل)
                      <input value={(local.investors || []).join(', ')} onChange={(e) => { const v = e.target.value.split(',').map(s => s.trim()).filter(Boolean); setLocal((s) => ({ ...s, investors: v })); }} onBlur={(e) => onUpdate(local.id, { investors: (e.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean) })} className="w-full mt-1 px-3 py-2 border rounded text-sm" />
                    </label>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold">القرارات والتصويت</h4>
                  {local.decisions.length === 0 && <div className="text-sm text-muted-foreground">لا توجد قرارات بعد.</div>}
                  <div className="space-y-2">
                    {local.decisions.map((d) => (
                      <div key={d.id} className="p-2 border rounded">
                        <div className="font-medium">{d.title} {d.accepted && <span className="text-green-600">(مقبول)</span>}</div>
                        <div className="space-y-1 mt-2">
                          {d.options.map((o) => (
                            <div key={o.id} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <button onClick={() => vote(d.id, o.id)} className="px-2 py-1 bg-gray-100 rounded text-sm">صوّت</button>
                                <div className="text-sm">{o.label}</div>
                              </div>
                              <div className="text-sm text-muted-foreground">{formatNumberEN(o.votes.length)} أصوات</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <AddDecisionForm onAdd={addDecision} />
                  <div className="mt-2">
                    <button onClick={startVoting} className="px-3 py-1.5 bg-orange-100 text-orange-800 rounded text-sm">بدء التصويت</button>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold">التنفيذ</h4>
                  <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
                    <button onClick={()=> addStep('تحضير العرض')} className="px-2 py-1 bg-gray-100 rounded">أضف خطوة: تحضير العرض</button>
                    <button onClick={()=> addStep('تجهيز الوثائق')} className="px-2 py-1 bg-gray-100 rounded">أضف خطوة: تجهيز الوثائق</button>
                    <button onClick={()=> addDecision('الموافقة على الميزانية', ['نعم','لا','محايد'])} className="px-2 py-1 bg-gray-100 rounded">قالب قرار: ميزانية</button>
                  </div>
                  {local.steps.length === 0 && <div className="text-sm text-muted-foreground">أضف خطوات التنفيذ لمتابعة التقدم.</div>}
                  <div className="space-y-2">
                    {local.steps.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={s.done} onChange={() => toggleStep(s.id)} />
                        <span className={s.done ? 'line-through text-muted-foreground' : ''}>{s.title}</span>
                      </label>
                    ))}
                    <AddStepForm onAdd={(t) => addStep(t)} />
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold">مرفقات الاجتماع</h4>
                  <input ref={attachRef} onChange={() => onAttachMeetingFile()} type="file" accept="image/*,application/pdf" className="hidden" />
                  <div className="flex items-center gap-2 mt-2">
                    <button onClick={() => attachRef.current && attachRef.current.click()} className="px-3 py-2 bg-gray-100 rounded text-sm">أرفق ملف</button>
                    <div className="text-xs text-muted-foreground">PNG, JPG, PDF</div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {(local.attachments || []).map(att => (
                      <div key={att.id} className="p-2 border rounded text-sm">
                        <div className="truncate">{att.name}</div>
                        <div className="flex items-center justify-between mt-1">
                          <a className="text-brand-blue underline" href={att.dataUrl} download={att.name}>تحميل</a>
                          <button onClick={() => removeMeetingAttachment(att.id)} className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs">حذف</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold">الأرشيف</h4>
                  <div className="text-sm text-muted-foreground">يمكنك أرشفة الاجتماع أو استعادته من أعلى النافذة.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AddDecisionForm: React.FC<{ onAdd: (title: string, options: string[]) => void }> = ({ onAdd }) => {
  const [title, setTitle] = React.useState('');
  const [opts, setOpts] = React.useState(['نعم', 'لا', 'محايد']);

  const submit = () => { if (!title.trim()) return; onAdd(title.trim(), opts.filter((o) => o.trim())); setTitle(''); };

  return (
    <div className="mt-2">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان القرار" className="w-full px-2 py-2 border rounded mb-2" />
      <div className="flex gap-2">
        {opts.map((v, i) => (
          <input key={i} value={v} onChange={(e) => setOpts((prev) => prev.map((p, idx) => (idx === i ? e.target.value : p)))} className="flex-1 px-2 py-2 border rounded" />
        ))}
      </div>
      <div className="flex gap-2 mt-2">
        <button onClick={submit} className="px-3 py-1.5 bg-brand-blue text-white rounded">أضف قرار</button>
      </div>
    </div>
  );
};

const AddStepForm: React.FC<{ onAdd: (title: string) => void }> = ({ onAdd }) => {
  const [title, setTitle] = React.useState('');
  const add = () => { if (!title.trim()) return; onAdd(title.trim()); setTitle(''); };
  return (
    <div className="flex gap-2">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="أضف خطوة تنفيذ" className="flex-1 px-2 py-2 border rounded" />
      <button onClick={add} className="px-3 py-2 bg-gray-100 rounded">أضف</button>
    </div>
  );
};

const MeetingsSettingsPanel: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const [days, setDays] = React.useState<number[]>(() => { try { return JSON.parse(localStorage.getItem('meetings_days') || '[]'); } catch { return []; } });
  const [time, setTime] = React.useState<string>(() => localStorage.getItem('meetings_time') || '15:00');
  const [mode, setMode] = React.useState<'onsite'|'online'|'hybrid'>(() => (localStorage.getItem('meetings_mode') as any) || 'onsite');
  const [reminderEnabled, setReminderEnabled] = React.useState<boolean>(() => localStorage.getItem('meetings_reminder') === '1');
  const [reminderType, setReminderType] = React.useState<'hour'|'day'>(() => (localStorage.getItem('meetings_reminder_type') as any) || 'hour');
  const [inviteEmail, setInviteEmail] = React.useState<boolean>(() => localStorage.getItem('meetings_invite_email') !== '0');
  const [inviteWhatsApp, setInviteWhatsApp] = React.useState<boolean>(() => localStorage.getItem('meetings_invite_wa') === '1');
  const [autoMinutes, setAutoMinutes] = React.useState<boolean>(() => localStorage.getItem('meetings_auto_minutes') === '1');
  const [archiveSearch, setArchiveSearch] = React.useState<boolean>(() => localStorage.getItem('meetings_archive_search') !== '0');

  const toggleDay = (d: number) => setDays(prev => { const next = prev.includes(d) ? prev.filter(x => x!==d) : [...prev, d]; try { localStorage.setItem('meetings_days', JSON.stringify(next)); } catch {}; return next; });

  const saveGeneral = () => {
    try { localStorage.setItem('meetings_time', time); localStorage.setItem('meetings_mode', mode); } catch {}
  };
  const saveNotifications = () => {
    try { localStorage.setItem('meetings_reminder', reminderEnabled ? '1' : '0'); localStorage.setItem('meetings_reminder_type', reminderType); localStorage.setItem('meetings_invite_email', inviteEmail ? '1':'0'); localStorage.setItem('meetings_invite_wa', inviteWhatsApp ? '1':'0'); } catch {}
  };
  const saveReports = () => {
    try { localStorage.setItem('meetings_auto_minutes', autoMinutes ? '1':'0'); localStorage.setItem('meetings_archive_search', archiveSearch ? '1':'0'); } catch {}
    onClose?.();
  };

  return (
    <div className="mt-4">
      <Tabs defaultValue="org">
        <TabsList className="flex gap-2 p-2 bg-gray-100 rounded-lg">
          <TabsTrigger value="org">التنظيم</TabsTrigger>
          <TabsTrigger value="notify">الإشعارات</TabsTrigger>
          <TabsTrigger value="reports">التقارير</TabsTrigger>
        </TabsList>
        <TabsContent value="org" className="mt-4">
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium mb-1">أيام الاجتماعات الافتراضية</div>
              <div className="flex flex-wrap gap-2">
                {[0,1,2,3,4,5,6].map(d => (
                  <label key={d} className="px-2 py-1 border rounded text-sm flex items-center gap-1">
                    <input type="checkbox" checked={days.includes(d)} onChange={()=> toggleDay(d)} /> {['أحد','إثن','ثل','أرب','خمس','جمع','سبت'][d]}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium mb-1">وقت الاجتماع الافتراضي</div>
              <input type="time" value={time} onChange={(e)=> setTime(e.target.value)} className="px-3 py-2 border rounded w-full" />
            </div>
            <div>
              <div className="text-sm font-medium mb-1">نمط الاجتماع</div>
              <select value={mode} onChange={(e)=> setMode(e.target.value as any)} className="px-3 py-2 border rounded w-full">
                <option value="onsite">حضوري</option>
                <option value="online">أونلاين</option>
                <option value="hybrid">هجين</option>
              </select>
            </div>
            <div className="flex justify-end"><button className="px-4 py-2 bg-brand-blue text-white rounded" onClick={saveGeneral}>حفظ</button></div>
          </div>
        </TabsContent>

        <TabsContent value="notify" className="mt-4">
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={reminderEnabled} onChange={(e)=> setReminderEnabled(e.target.checked)} /> تفعيل تذكير آلي قبل الاجتماع</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-sm font-medium mb-1">نوع التذكير</div>
                <select value={reminderType} onChange={(e)=> setReminderType(e.target.value as any)} className="px-3 py-2 border rounded w-full"><option value="hour">قبل ساعة</option><option value="day">قبل يوم</option></select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={inviteEmail} onChange={(e)=> setInviteEmail(e.target.checked)} /> إرسال دعوات عبر البريد</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={inviteWhatsApp} onChange={(e)=> setInviteWhatsApp(e.target.checked)} /> إرسال عبر واتساب</label>
            </div>
            <div className="flex justify-end"><button className="px-4 py-2 bg-brand-blue text-white rounded" onClick={saveNotifications}>حفظ</button></div>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={autoMinutes} onChange={(e)=> setAutoMinutes(e.target.checked)} /> إنشاء محضر الاجتماع تلقائياً</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={archiveSearch} onChange={(e)=> setArchiveSearch(e.target.checked)} /> أرشفة الاجتماعات السابقة مع البحث</label>
            <div className="flex justify-end"><button className="px-4 py-2 bg-brand-blue text-white rounded" onClick={saveReports}>حفظ الإعدادات</button></div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MeetingsPage;
