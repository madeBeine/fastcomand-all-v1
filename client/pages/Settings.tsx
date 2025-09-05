import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import Modal from '@/components/Modal';
import { 
  Users, Settings as SettingsIcon, UserPlus, Edit, Trash2, 
  Shield, Mail, Phone, MapPin, Globe, Building2, Save,
  Download, Upload, History, Eye, EyeOff, Key
} from 'lucide-react';

const AdminSettings: React.FC = () => {
  const { settings, update } = useSettings();
  const { toast } = useToast();
  const { user } = useAuth();

  // User Management State
  const [showUserModal, setShowUserModal] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'employee' as string,
    permissions: {
      read: true,
      write: false,
      update: false,
      delete: false
    }
  });
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  async function hashPassword(pw: string) {
    try {
      const enc = new TextEncoder();
      const data = enc.encode(pw);
      if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
        const hashBuf = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuf));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      }
      // Fallback (non-cryptographic) for environments without SubtleCrypto
      let hash = 0;
      for (let i = 0; i < pw.length; i++) hash = (hash << 5) - hash + pw.charCodeAt(i), hash |= 0;
      return 'fallback-' + Math.abs(hash).toString(16);
    } catch (e) {
      let hash = 0;
      for (let i = 0; i < pw.length; i++) hash = (hash << 5) - hash + pw.charCodeAt(i), hash |= 0;
      return 'fallback-' + Math.abs(hash).toString(16);
    }
  }

  // Application Settings State
  const [generalSettings, setGeneralSettings] = useState(settings.general);
  const [securitySettings, setSecuritySettings] = useState({
    sessionDuration: settings.auth?.sessionDurationMinutes || 480,
    enable2FA: settings.auth?.enable2FA || false,
    minPasswordLength: settings.auth?.passwordPolicy?.minLength || 8,
    requireUppercase: settings.auth?.passwordPolicy?.requireUpper || true,
    requireNumbers: settings.auth?.passwordPolicy?.requireNumber || true,
    requireSpecialChars: settings.auth?.passwordPolicy?.requireSpecial || false
  });

  // Update local state when settings change
  useEffect(() => {
    setGeneralSettings(settings.general);
  }, [settings.general]);

  // Advanced Roles Management
  const defaultRoles = ['admin', 'employee', 'investor'];

  const adminPages = [
    { key: 'dashboard', label: 'لوحة التحكم' },
    { key: 'orders', label: 'الطلبات' },
    { key: 'shipments', label: 'الشحنات' },
    { key: 'inventory', label: 'المخزن' },
    { key: 'delivery-tasks', label: 'مهام التوصيل' },
    { key: 'invoices', label: 'الفواتير' },
    { key: 'logs', label: 'السجل' },
    { key: 'settings', label: 'الإعدادات' },
    { key: 'orders-settings', label: 'إعدادات الطلبيات' }
  ];

  const investmentPages = [
    { key: 'investment-dashboard', label: 'لوحة التحكم' },
    { key: 'meetings', label: 'الاجتماعات' },
    { key: 'revenue', label: 'الإيرادات' },
    { key: 'expenses', label: 'المصاريف' },
    { key: 'investment-logs', label: 'السجل' },
    { key: 'withdrawals', label: 'السحوبات' },
    { key: 'investors', label: 'إدارة المستثمرين' },
    { key: 'investment-settings', label: 'الإعدادات' }
  ];

  const [rolesList, setRolesList] = useState<string[]>(() => {
    try {
      const rp = settings.rolePermissions || {};
      const keys = Object.keys(rp);
      const combined = Array.from(new Set([...defaultRoles, ...keys]));
      return combined;
    } catch { return [...defaultRoles]; }
  });

  const [selectedRole, setSelectedRole] = useState<string>(rolesList[0] || 'admin');
  const [newRoleName, setNewRoleName] = useState('');
  const [currentSide, setCurrentSide] = useState<'admin' | 'investment'>('admin');

  function readRoleConfig(roleKey: string) {
    const rp = (settings.rolePermissions as any) || {};
    const role = rp[roleKey] || {};
    const systems = role.systems || (
      roleKey === 'admin'
        ? { admin: { enabled: true }, investment: { enabled: true } }
        : roleKey === 'employee'
          ? { admin: { enabled: true }, investment: { enabled: false } }
          : roleKey === 'investor'
            ? { admin: { enabled: false }, investment: { enabled: true } }
            : { admin: { enabled: false }, investment: { enabled: false } }
    );
    const pages = role.pages || { admin: {}, investment: {} };
    // ensure default page entries
    adminPages.forEach(p => { pages.admin[p.key] = pages.admin[p.key] || { state: 'show', perms: { view: true, add: false, edit: false, delete: false } }; });
    investmentPages.forEach(p => { pages.investment[p.key] = pages.investment[p.key] || { state: 'show', perms: { view: true, add: false, edit: false, delete: false } }; });
    return { systems, pages };
  }

  const [roleConfig, setRoleConfig] = useState<any>(() => readRoleConfig(selectedRole));

  useEffect(() => {
    setRoleConfig(readRoleConfig(selectedRole));
  }, [selectedRole, settings.rolePermissions]);

  const addRole = () => {
    const key = newRoleName.trim();
    if (!key) return;
    if (rolesList.includes(key)) { toast({ title: 'خطأ', description: 'هذا الدور موجود بالفعل' }); return; }
    const nextRoles = [...rolesList, key];
    setRolesList(nextRoles);
    setNewRoleName('');
    // init in settings
    const rp = { ...(settings.rolePermissions || {}) } as any;
    rp[key] = { systems: { admin: { enabled: false }, investment: { enabled: false } }, pages: { admin: {}, investment: {} } };
    update({ rolePermissions: rp });
    setSelectedRole(key);
    toast({ title: 'تم الإنشاء', description: 'تم إنشاء دور جديد' });
  };

  const removeRole = (key: string) => {
    if (defaultRoles.includes(key)) { toast({ title: 'تحذير', description: 'لا يمكن حذف الدور الافتراضي' }); return; }
    const nextRoles = rolesList.filter(r => r !== key);
    setRolesList(nextRoles);
    const rp = { ...(settings.rolePermissions || {}) } as any;
    delete rp[key];
    // also reassign users with this role to employee
    const updatedUsers = settings.users.map((u) => u.role === key ? { ...u, role: 'employee' } : u);
    update({ rolePermissions: rp, users: updatedUsers });
    setSelectedRole(nextRoles[0] || 'admin');
    toast({ title: 'تم الحذف', description: 'تم حذف الدور' });
  };

  const saveRoleChanges = async () => {
    try {
      const rp = { ...(settings.rolePermissions || {}) } as any;
      rp[selectedRole] = roleConfig;

      // apply aggregated permissions to users with this role
      const updatedUsers = settings.users.map((u) => {
        if (u.role !== selectedRole) return u;
        // aggregate
        const pages = roleConfig.pages || {};
        let read = false, write = false, updatePerm = false, del = false;
        Object.values(pages).forEach((side: any) => {
          Object.values(side).forEach((pg: any) => {
            read = read || !!pg.perms.view;
            write = write || !!pg.perms.add;
            updatePerm = updatePerm || !!pg.perms.edit;
            del = del || !!pg.perms.delete;
          });
        });
        return { ...u, permissions: { read, write, update: updatePerm, delete: del } };
      });

      await update({ rolePermissions: rp, users: updatedUsers });
      toast({ title: 'تم الحفظ', description: 'تم حفظ صلاحيات الدور وتطبيقها على المستخدمين' });
    } catch (e) {
      toast({ title: 'خطأ', description: 'فشل في حفظ صلاحيات الدور' });
    }
  };

  // Check if current user can manage settings
  const currentUserSettings = settings.users.find(u => 
    (u.email && user?.email && u.email === user.email) || u.name === user?.name
  );
  const canManageSettings = currentUserSettings ? 
    currentUserSettings.permissions.write : 
    (user?.role === 'admin');

  if (!canManageSettings) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                غير مصرح بالوصول
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                ليس لديك صلاحية للوصول إلى إعدادات النظام
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // User Management Functions
  const startAddUser = () => {
    setEditUserId(null);
    setUserForm({
      name: '',
      email: '',
      phone: '',
      role: 'employee',
      permissions: { read: true, write: false, update: false, delete: false }
    });
    setPassword('');
    setPasswordConfirm('');
    setShowUserModal(true);
  };

  const startEditUser = (id: string) => {
    const user = settings.users.find(u => u.id === id);
    if (!user) return;
    
    setEditUserId(id);
    setUserForm({
      name: user.name,
      email: user.email || '',
      phone: user.phone || '',
      role: user.role,
      permissions: { ...user.permissions }
    });
    setPassword('');
    setPasswordConfirm('');
    setShowUserModal(true);
  };

  const submitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name.trim()) {
      toast({ title: 'خطأ', description: 'اسم المستخدم مطلوب' });
      return;
    }

    try {
      let updatedUsers;
      if (editUserId) {
        updatedUsers = await Promise.all(settings.users.map(async (u) => {
          if (u.id !== editUserId) return u;
          const next: any = { ...u, ...userForm };
          if (password || passwordConfirm) {
            if (password !== passwordConfirm) {
              throw new Error('password_mismatch');
            }
            next.passwordHash = await hashPassword(password);
          } else {
            next.passwordHash = u.passwordHash;
          }
          return next;
        }));
      } else {
        if (!password || !passwordConfirm) {
          toast({ title: 'خطأ', description: 'كلمة المرور مطلوبة للمستخدم الجديد' });
          return;
        }
        if (password !== passwordConfirm) {
          toast({ title: 'خطأ', description: 'تأكيد كلمة المرور غير مطابق' });
          return;
        }
        const newUser: any = {
          id: 'u_' + Date.now(),
          ...userForm,
          passwordHash: await hashPassword(password)
        };
        updatedUsers = [newUser, ...settings.users];
      }

      await update({ users: updatedUsers as any });
      try { localStorage.setItem('app_settings_v1', JSON.stringify({ ...settings, users: updatedUsers })); } catch {}
      setShowUserModal(false);
      toast({
        title: 'تم الحفظ',
        description: editUserId ? 'تم تحديث المستخدم بنجاح' : 'تم إضافة المستخدم بنجاح'
      });
    } catch (error: any) {
      if (error?.message === 'password_mismatch') {
        toast({ title: 'خطأ', description: 'تأكيد كلمة المرور غير مطابق' });
      } else {
        toast({ title: 'خطأ', description: 'فشل في ��فظ بيانات المستخدم' });
      }
    }
  };

  const removeUser = async (id: string) => {
    if (settings.users.length <= 1) {
      toast({ title: 'تحذير', description: 'لا يمكن حذف آخر مستخدم في النظام' });
      return;
    }

    if (currentUserSettings?.id === id) {
      toast({ title: 'تحذير', description: 'لا يمكنك حذف حسابك الشخصي' });
      return;
    }

    try {
      const updatedUsers = settings.users.filter(u => u.id !== id);
      await update({ users: updatedUsers });
      toast({ title: 'تم الحذف', description: 'تم حذف المستخدم بنجاح' });
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل في حذف المستخدم' });
    }
  };

  // Application Settings Functions
  const saveGeneralSettings = async () => {
    try {
      await update({ general: generalSettings });
      toast({ title: 'تم الحفظ', description: 'تم حفظ الإعدادات العامة بنجاح' });
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل في حفظ الإعدادات العامة' });
    }
  };

  const saveSecuritySettings = async () => {
    try {
      const authSettings = {
        sessionDurationMinutes: securitySettings.sessionDuration,
        enable2FA: securitySettings.enable2FA,
        passwordPolicy: {
          minLength: securitySettings.minPasswordLength,
          requireUpper: securitySettings.requireUppercase,
          requireNumber: securitySettings.requireNumbers,
          requireSpecial: securitySettings.requireSpecialChars
        }
      };
      await update({ auth: authSettings });
      toast({ title: 'تم الحفظ', description: 'تم حفظ إعدادات الأمان بنجاح' });
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل في حفظ إعدادات الأمان' });
    }
  };

  const exportSettings = async () => {
    try {
      const dataStr = JSON.stringify(settings, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `settings-export-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast({ title: 'تم التصدير', description: 'تم تنزيل ملف الإعدادات بنجاح' });
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل في تصدير الإعدادات' });
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'employee': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'delivery': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'investor': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'مدير';
      case 'employee': return 'موظف';
      case 'delivery': return 'موصل';
      case 'investor': return 'مستثمر';
      default: return role;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <SettingsIcon className="h-8 w-8" />
              إعدادات النظام
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              إدارة المستخدمين وإعدادات التطبيق
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportSettings}>
              <Download className="h-4 w-4 mr-2" />
              تصدير الإعدادات
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              إدارة المستخدمين
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              صلاحيات الأدوار
            </TabsTrigger>
            <TabsTrigger value="application" className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              إعدادات التطبيق
            </TabsTrigger>
          </TabsList>

          {/* User Management Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    قائمة المستخدمين
                  </CardTitle>
                  <Button onClick={startAddUser}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    إضافة مستخدم
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {settings.users.map(user => (
                    <div key={user.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {user.name}
                          </h3>
                          <Badge className={`text-xs mt-1 ${getRoleBadgeColor(user.role)}`}>
                            {getRoleLabel(user.role)}
                          </Badge>
                          {user.role !== 'admin' && (
                            <div className="mt-2">
                              <select
                                value={user.role}
                                onChange={async (e) => {
                                  const updatedUsers = settings.users.map(u => u.id === user.id ? { ...u, role: e.target.value } : u);
                                  await update({ users: updatedUsers });
                                }}
                                className="w-full px-2 py-1 border rounded text-xs"
                              >
                                {Array.from(new Set([...rolesList, 'delivery'])).map(r => (
                                  <option key={r} value={r}>{getRoleLabel(r)}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {user.role !== 'admin' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditUser(user.id)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => removeUser(user.id)}
                            disabled={user.role === 'admin' || settings.users.length <= 1 || currentUserSettings?.id === user.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {user.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </div>
                      )}
                      
                      {user.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                          <Phone className="h-3 w-3" />
                          {user.phone}
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">الصلاحيات:</div>
                        <div className="flex flex-wrap gap-1">
                          {user.permissions.read && <Badge variant="secondary" className="text-xs">قراءة</Badge>}
                          {user.permissions.write && <Badge variant="secondary" className="text-xs">كتابة</Badge>}
                          {user.permissions.update && <Badge variant="secondary" className="text-xs">تعديل</Badge>}
                          {user.permissions.delete && <Badge variant="secondary" className="text-xs">حذف</Badge>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Roles Management Tab */}
          <TabsContent value="roles" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  إدارة الصلاحيات والأدوار
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">قائمة الأدوار</h3>
                        <Badge className="text-xs">{rolesList.length}</Badge>
                      </div>

                      <div className="space-y-2">
                        {rolesList.map(r => (
                          <button
                            key={r}
                            onClick={() => setSelectedRole(r)}
                            className={`w-full text-right px-3 py-2 rounded-md ${selectedRole === r ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                          >
                            {r}
                            <div className="mt-1 text-xs text-gray-500">{r === 'admin' ? 'مدير (غير قابل للتعديل)' : ''}</div>
                          </button>
                        ))}
                      </div>

                      <div className="pt-2">
                        <div className="flex gap-2">
                          <Input value={newRoleName} onChange={(e)=> setNewRoleName(e.target.value)} placeholder="اسم دور جديد" />
                          <Button onClick={addRole} size="sm">إضافة</Button>
                        </div>
                      </div>

                      <div className="pt-2">
                        <Button variant="destructive" size="sm" onClick={() => removeRole(selectedRole)} disabled={['admin','employee','investor'].includes(selectedRole)}>
                          حذف الدور
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-3">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold">تعديل دور: {selectedRole}</h3>
                          <div className="text-sm text-gray-500">تحكم في الجوانب والصفحات لهذا الدور</div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={saveRoleChanges}>
                            حفظ التغييرات
                          </Button>
                        </div>
                      </div>

                      {/* Side toggles */}
                      <div className="flex items-center gap-4 mb-4">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" checked={!!roleConfig?.systems?.admin?.enabled} onChange={(e)=> setRoleConfig({...roleConfig, systems: {...roleConfig.systems, admin: {...(roleConfig.systems?.admin||{}), enabled: e.target.checked}}})} disabled={selectedRole==='admin'} />
                          <span className="text-sm">إظهار جانب الإدارة</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" checked={!!roleConfig?.systems?.investment?.enabled} onChange={(e)=> setRoleConfig({...roleConfig, systems: {...roleConfig.systems, investment: {...(roleConfig.systems?.investment||{}), enabled: e.target.checked}}})} disabled={selectedRole==='admin'} />
                          <span className="text-sm">إظهار جانب الاستثمار</span>
                        </label>
                      </div>

                      {/* Side Pages Tabs */}
                      <div className="mb-4">
                        <div className="flex gap-2">
                          <button onClick={()=> setCurrentSide('admin')} className={`px-3 py-1 rounded ${currentSide==='admin' ? 'bg-brand-blue text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>الإدارة</button>
                          <button onClick={()=> setCurrentSide('investment')} className={`px-3 py-1 rounded ${currentSide==='investment' ? 'bg-brand-orange text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>الاستثمار</button>
                        </div>
                      </div>

                      {/* Pages table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left">
                              <th>الصفحة</th>
                              <th>الحالة</th>
                              <th>عرض</th>
                              <th>إضافة</th>
                              <th>تعديل</th>
                              <th>حذف</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(currentSide==='admin' ? adminPages : investmentPages).map(p => {
                              const entry = roleConfig?.pages?.[currentSide]?.[p.key] || { state: 'show', perms: { view: true, add: false, edit: false, delete: false } };
                              return (
                                <tr key={p.key} className="border-t">
                                  <td className="py-2">{p.label}</td>
                                  <td className="py-2">
                                    <select value={entry.state} onChange={(e)=> setRoleConfig({...roleConfig, pages: {...roleConfig.pages, [currentSide]: {...roleConfig.pages[currentSide], [p.key]: {...entry, state: e.target.value}}}})} className="px-2 py-1 border rounded">
                                      <option value="show">إظهار</option>
                                      <option value="locked">قفل</option>
                                      <option value="hidden">إخفاء</option>
                                    </select>
                                  </td>
                                  <td className="py-2">
                                    <input type="checkbox" checked={!!entry.perms.view} onChange={(e)=> setRoleConfig({...roleConfig, pages: {...roleConfig.pages, [currentSide]: {...roleConfig.pages[currentSide], [p.key]: {...entry, perms: {...entry.perms, view: e.target.checked}}}}})} />
                                  </td>
                                  <td className="py-2">
                                    <input type="checkbox" checked={!!entry.perms.add} onChange={(e)=> setRoleConfig({...roleConfig, pages: {...roleConfig.pages, [currentSide]: {...roleConfig.pages[currentSide], [p.key]: {...entry, perms: {...entry.perms, add: e.target.checked}}}}})} />
                                  </td>
                                  <td className="py-2">
                                    <input type="checkbox" checked={!!entry.perms.edit} onChange={(e)=> setRoleConfig({...roleConfig, pages: {...roleConfig.pages, [currentSide]: {...roleConfig.pages[currentSide], [p.key]: {...entry, perms: {...entry.perms, edit: e.target.checked}}}}})} />
                                  </td>
                                  <td className="py-2">
                                    <input type="checkbox" checked={!!entry.perms.delete} onChange={(e)=> setRoleConfig({...roleConfig, pages: {...roleConfig.pages, [currentSide]: {...roleConfig.pages[currentSide], [p.key]: {...entry, perms: {...entry.perms, delete: e.target.checked}}}}})} />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Application Settings Tab */}
          <TabsContent value="application" className="space-y-6">
            {/* General Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  الإعدادات العامة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      اسم الشركة
                    </label>
                    <Input
                      value={generalSettings.businessName}
                      onChange={(e) => setGeneralSettings({
                        ...generalSettings,
                        businessName: e.target.value
                      })}
                      placeholder="اسم الشركة"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      رابط الشعار
                    </label>
                    <Input
                      value={generalSettings.logoUrl || ''}
                      onChange={(e) => setGeneralSettings({
                        ...generalSettings,
                        logoUrl: e.target.value
                      })}
                      placeholder="https://example.com/logo.png"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      <Phone className="h-4 w-4 inline mr-1" />
                      رقم الهاتف
                    </label>
                    <Input
                      value={generalSettings.phone || ''}
                      onChange={(e) => setGeneralSettings({
                        ...generalSettings,
                        phone: e.target.value
                      })}
                      placeholder="+222 XX XX XX XX"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      <Mail className="h-4 w-4 inline mr-1" />
                      البريد ا��إلكتروني
                    </label>
                    <Input
                      value={generalSettings.email || ''}
                      onChange={(e) => setGeneralSettings({
                        ...generalSettings,
                        email: e.target.value
                      })}
                      placeholder="info@company.com"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      <MapPin className="h-4 w-4 inline mr-1" />
                      العنوان
                    </label>
                    <Input
                      value={generalSettings.address || ''}
                      onChange={(e) => setGeneralSettings({
                        ...generalSettings,
                        address: e.target.value
                      })}
                      placeholder="العنوان الكامل للشركة"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      <Globe className="h-4 w-4 inline mr-1" />
                      اللغة الافتراضية
                    </label>
                    <select
                      value={generalSettings.language}
                      onChange={(e) => setGeneralSettings({
                        ...generalSettings,
                        language: e.target.value as 'ar' | 'en'
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="ar">العربية</option>
                      <option value="en">English</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      العملة الافتراضية
                    </label>
                    <select
                      value={generalSettings.defaultCurrency}
                      onChange={(e) => setGeneralSettings({
                        ...generalSettings,
                        defaultCurrency: e.target.value as 'MRU' | 'USD' | 'AED' | 'EUR'
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="MRU">أوقية موريتانية (MRU)</option>
                      <option value="USD">دولار أمريكي (USD)</option>
                      <option value="AED">درهم إماراتي (AED)</option>
                      <option value="EUR">يورو (EUR)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={saveGeneralSettings}>
                    <Save className="h-4 w-4 mr-2" />
                    حفظ الإعدادات العامة
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  إع��ادات الأمان
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      مدة الجلسة (بالدقائق)
                    </label>
                    <Input
                      type="number"
                      value={securitySettings.sessionDuration}
                      onChange={(e) => setSecuritySettings({
                        ...securitySettings,
                        sessionDuration: Math.max(30, parseInt(e.target.value) || 480)
                      })}
                      min="30"
                      max="1440"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      الحد الأدنى لطول كلمة المرور
                    </label>
                    <Input
                      type="number"
                      value={securitySettings.minPasswordLength}
                      onChange={(e) => setSecuritySettings({
                        ...securitySettings,
                        minPasswordLength: Math.max(6, parseInt(e.target.value) || 8)
                      })}
                      min="6"
                      max="32"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      <Key className="h-4 w-4 inline mr-1" />
                      تفعيل التحقق الثنائي
                    </label>
                    <button
                      onClick={() => setSecuritySettings({
                        ...securitySettings,
                        enable2FA: !securitySettings.enable2FA
                      })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        securitySettings.enable2FA ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          securitySettings.enable2FA ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      وجوب الأحرف الكبيرة
                    </label>
                    <button
                      onClick={() => setSecuritySettings({
                        ...securitySettings,
                        requireUppercase: !securitySettings.requireUppercase
                      })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        securitySettings.requireUppercase ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          securitySettings.requireUppercase ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      وجوب الأرقام
                    </label>
                    <button
                      onClick={() => setSecuritySettings({
                        ...securitySettings,
                        requireNumbers: !securitySettings.requireNumbers
                      })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        securitySettings.requireNumbers ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          securitySettings.requireNumbers ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      وجوب الرموز الخاصة
                    </label>
                    <button
                      onClick={() => setSecuritySettings({
                        ...securitySettings,
                        requireSpecialChars: !securitySettings.requireSpecialChars
                      })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        securitySettings.requireSpecialChars ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          securitySettings.requireSpecialChars ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={saveSecuritySettings}>
                    <Save className="h-4 w-4 mr-2" />
                    حفظ إعد��دات الأمان
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* User Management Modal */}
        {showUserModal && (
          <Modal 
            isOpen={showUserModal} 
            onClose={() => setShowUserModal(false)} 
            title={editUserId ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}
          >
            <form onSubmit={submitUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  الاسم الكامل
                </label>
                <Input
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  placeholder="أدخل الاسم الكامل"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    البريد الإلكتروني
                  </label>
                  <Input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    placeholder="user@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    رقم الهاتف
                  </label>
                  <Input
                    value={userForm.phone}
                    onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                    placeholder="+222 XX XX XX XX"
                  />
                </div>
              </div>

              {/* Password fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    كلمة المرور {editUserId ? '(اتركها فارغة للإبقاء عليها)' : ''}
                  </label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    تأكيد كلمة المرور
                  </label>
                  <Input
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="********"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  الدور الوظيفي
                </label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({
                    ...userForm,
                    role: e.target.value
                  })}
                  disabled={editUserId ? settings.users.find(u=>u.id===editUserId)?.role === 'admin' : false}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-60"
                >
                  {Array.from(new Set([...rolesList, 'delivery'])).map(r => (
                    <option key={r} value={r}>{getRoleLabel(r)}</option>
                  ))}
                </select>
              </div>

              {!(editUserId ? settings.users.find(u=>u.id===editUserId)?.role === 'admin' : userForm.role === 'admin') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الصلاحيات
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={userForm.permissions.read}
                      onChange={(e) => setUserForm({
                        ...userForm,
                        permissions: { ...userForm.permissions, read: e.target.checked }
                      })}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">قراءة</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={userForm.permissions.write}
                      onChange={(e) => setUserForm({
                        ...userForm,
                        permissions: { ...userForm.permissions, write: e.target.checked }
                      })}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">كتابة</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={userForm.permissions.update}
                      onChange={(e) => setUserForm({
                        ...userForm,
                        permissions: { ...userForm.permissions, update: e.target.checked }
                      })}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">تعديل</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={userForm.permissions.delete}
                      onChange={(e) => setUserForm({
                        ...userForm,
                        permissions: { ...userForm.permissions, delete: e.target.checked }
                      })}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">حذف</span>
                  </label>
                </div>
              </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowUserModal(false)}>
                  إلغاء
                </Button>
                <Button type="submit">
                  {editUserId ? 'تحديث المستخدم' : 'إضافة المستخدم'}
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default AdminSettings;
