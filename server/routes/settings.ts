import { RequestHandler } from "express";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.resolve(process.cwd(), "server", "data");
const PUBLISHED_FILE = path.join(DATA_DIR, "published_settings.json");
const VERSIONS_FILE = path.join(DATA_DIR, "settings_versions.json");
const AUDIT_FILE = path.join(DATA_DIR, "settings_audit_log.json");

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    // ignore
  }
}

async function readJson(file: string, defaultValue: any) {
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    return defaultValue;
  }
}

async function writeJson(file: string, data: any) {
  await ensureDataDir();
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf-8");
}

function diffKeys(oldObj: any, newObj: any) {
  const keys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);
  const diffs: any[] = [];
  keys.forEach(k => {
    const oldVal = (oldObj || {})[k];
    const newVal = (newObj || {})[k];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      diffs.push({ key: k, old: oldVal, new: newVal });
    }
  });
  return diffs;
}

export function validateSettings(content: any) {
  const issues: { path: string; message: string; severity: 'warning' | 'error' }[] = [];
  const safe = (p: any, d: any) => (p === undefined || p === null ? d : p);
  try {
    const rates = safe(content?.currencies?.rates, {});
    Object.keys(rates).forEach((k) => {
      if (typeof rates[k] !== 'number' || !(rates[k] > 0)) {
        issues.push({ path: `currencies.rates.${k}`, message: 'سعر الصرف يجب أن يكون رقمًا موجبًا', severity: 'error' });
      }
    });
  } catch {}

  try {
    const types = safe(content?.shipping?.types, []);
    const byKey: Record<string, any[]> = {};
    types.forEach((t: any) => {
      if (!(t?.pricePerKgMRU > 0)) issues.push({ path: `shipping.types.${t?.id || ''}.pricePerKgMRU`, message: 'MRU/كجم يجب أن يكون موجبًا', severity: 'error' });
      if (t?.durationDays !== undefined && t.durationDays < 0) issues.push({ path: `shipping.types.${t?.id || ''}.durationDays`, message: 'المدة لا يمكن أن تكون سالبة', severity: 'error' });
      const key = `${t?.kind || ''}|${t?.country || ''}`;
      byKey[key] = byKey[key] || [];
      byKey[key].push(t);
    });
    Object.keys(byKey).forEach((k) => {
      const arr = byKey[k].filter((x) => x.effectiveFrom || x.effectiveTo);
      arr.sort((a, b) => new Date(a.effectiveFrom || '1970-01-01').getTime() - new Date(b.effectiveFrom || '1970-01-01').getTime());
      for (let i = 0; i < arr.length - 1; i++) {
        const a = arr[i];
        const b = arr[i + 1];
        const aTo = new Date(a.effectiveTo || '2999-12-31').getTime();
        const bFrom = new Date(b.effectiveFrom || '1970-01-01').getTime();
        if (aTo >= bFrom) {
          issues.push({ path: `shipping.types`, message: `تداخل في فترات الفعالية للنوع ${k}`, severity: 'error' });
        }
      }
    });
  } catch {}

  try {
    const drawers = safe(content?.warehouse?.drawers, []);
    const ids = new Set<string>();
    drawers.forEach((d: any) => {
      if (!d?.id || typeof d.id !== 'string') issues.push({ path: 'warehouse.drawers', message: 'كل درج يجب أن يملك معرفًا فريدًا', severity: 'error' });
      if (ids.has(d.id)) issues.push({ path: `warehouse.drawers.${d.id}`, message: 'معرف الدرج مكرر', severity: 'error' });
      ids.add(d.id);
      if (!(d?.capacity >= 1)) issues.push({ path: `warehouse.drawers.${d.id}.capacity`, message: 'سعة الدرج يجب أن تكون 1 على الأقل', severity: 'error' });
    });
    if (!(safe(content?.warehouse?.fullAlertThresholdPercent, 90) >= 1 && safe(content?.warehouse?.fullAlertThresholdPercent, 90) <= 100)) {
      issues.push({ path: 'warehouse.fullAlertThresholdPercent', message: 'نسبة التنبيه يجب أن تكون بين 1 و 100', severity: 'error' });
    }
  } catch {}

  try {
    const p = safe(content?.ordersInvoices?.defaultCommissionPercent, 5);
    if (!(p >= 0 && p <= 100)) issues.push({ path: 'ordersInvoices.defaultCommissionPercent', message: 'نسبة العمولة يجب أن تكون بين 0 و 100', severity: 'error' });
  } catch {}

  try {
    const pct = safe(content?.delivery?.courierProfitPercent, 20);
    if (!(pct >= 0 && pct <= 100)) issues.push({ path: 'delivery.courierProfitPercent', message: 'نسبة الموصل يجب أن تكون بين 0 و 100', severity: 'error' });
  } catch {}

  return issues;
}

export const settingsRoutes: RequestHandler = async (req, res) => {
  // This module exports several endpoints by inspecting method and path
  // but since express mounts this as a handler, we'll just route by url.
  const url = req.path || "/";
  const method = req.method;

  // GET /api/settings -> published settings
  if (method === "GET" && (url === "/" || url === "")) {
    const published = await readJson(PUBLISHED_FILE, null);
    if (!published) return res.json({});
    return res.json(published);
  }

  // GET /api/settings/versions
  if (method === "GET" && url === "/versions") {
    const versions = await readJson(VERSIONS_FILE, []);
    return res.json(versions);
  }

  // GET /api/settings/audit-log
  if (method === "GET" && url === "/audit-log") {
    const audit = await readJson(AUDIT_FILE, []);
    return res.json(audit);
  }

  // POST /api/settings/versions -> create new version (draft)
  if (method === "POST" && url === "/versions") {
    const body = req.body || {};
    const author = body.author || { id: 'system', name: 'system' };
    const content = body.content || body.settings || {};
    const message = body.message || 'Update settings';
    const versions = await readJson(VERSIONS_FILE, []);
    const id = 'v_' + Date.now();
    const createdAt = new Date().toISOString();
    const prevPublished = await readJson(PUBLISHED_FILE, null);
    const diffs = diffKeys(prevPublished || {}, content || {});
    const v = { id, createdAt, author, status: 'draft', message, content, diffs };
    versions.unshift(v);
    await writeJson(VERSIONS_FILE, versions);

    // add audit log entry
    const audit = await readJson(AUDIT_FILE, []);
    audit.unshift({ id: 'a_' + Date.now(), type: 'settings.version.created', user: author, createdAt, details: { versionId: id, message, diffs } });
    await writeJson(AUDIT_FILE, audit);

    return res.status(201).json(v);
  }

  // GET /api/settings/validate?versionId=:id
  if (method === 'GET' && url.startsWith('/validate')) {
    const q = req.query as any;
    const vid = q.versionId as string | undefined;
    let content: any = await readJson(PUBLISHED_FILE, {});
    if (vid) {
      const versions = await readJson(VERSIONS_FILE, []);
      const v = versions.find((x: any) => x.id === vid);
      if (v) content = v.content;
    }
    const issues = validateSettings(content);
    return res.json({ issues });
  }

  // POST /api/settings/validate { content }
  if (method === 'POST' && url === '/validate') {
    const content = req.body?.content || {};
    const issues = validateSettings(content);
    return res.json({ issues });
  }

  // PUT /api/settings/versions/:id/publish -> publish version (blocks on errors)
  if (method === "PUT" && url.startsWith("/versions/") && url.endsWith("/publish")) {
    const parts = url.split('/');
    const vid = parts[2];
    const versions = await readJson(VERSIONS_FILE, []);
    const v = versions.find((x: any) => x.id === vid);
    if (!v) return res.status(404).json({ error: 'version_not_found' });

    const issues = validateSettings(v.content);
    const hasErrors = issues.some(i => i.severity === 'error');
    if (hasErrors) return res.status(400).json({ error: 'validation_failed', issues });

    v.status = 'published';
    v.publishedAt = new Date().toISOString();
    await writeJson(PUBLISHED_FILE, v.content);
    await writeJson(VERSIONS_FILE, versions);
    const audit = await readJson(AUDIT_FILE, []);
    audit.unshift({ id: 'a_' + Date.now(), type: 'settings.version.published', user: req.body?.author || { id: 'system' }, createdAt: new Date().toISOString(), details: { versionId: vid, diffs: v.diffs } });
    await writeJson(AUDIT_FILE, audit);
    return res.json({ ok: true, version: v, issues });
  }

  // POST /api/settings/versions/:id/rollback -> rollback published to version
  if (method === "POST" && url.startsWith("/versions/") && url.endsWith("/rollback")) {
    const parts = url.split('/');
    const vid = parts[2];
    const versions = await readJson(VERSIONS_FILE, []);
    const v = versions.find((x: any) => x.id === vid);
    if (!v) return res.status(404).json({ error: 'version_not_found' });
    // create new version as rollback publish
    const id = 'v_' + Date.now();
    const createdAt = new Date().toISOString();
    const author = req.body?.author || { id: 'system' };
    const newV = { id, createdAt, author, status: 'published', message: 'Rollback to ' + vid, content: v.content, diffs: diffKeys(await readJson(PUBLISHED_FILE, {}), v.content) };
    versions.unshift(newV);
    await writeJson(VERSIONS_FILE, versions);
    await writeJson(PUBLISHED_FILE, v.content);
    const audit = await readJson(AUDIT_FILE, []);
    audit.unshift({ id: 'a_' + Date.now(), type: 'settings.version.rollback', user: author, createdAt, details: { fromVersion: vid, toVersion: id } });
    await writeJson(AUDIT_FILE, audit);
    return res.json({ ok: true, version: newV });
  }

  // GET /api/settings/export -> return published settings file
  if (method === "GET" && url === "/export") {
    const published = await readJson(PUBLISHED_FILE, {});
    res.setHeader('Content-Type', 'application/json');
    return res.send(JSON.stringify(published, null, 2));
  }

  // POST /api/settings/import -> import settings JSON and create draft version
  if (method === "POST" && url === "/import") {
    const body = req.body || {};
    const content = body.content;
    if (!content) return res.status(400).json({ error: 'missing_content' });
    const versions = await readJson(VERSIONS_FILE, []);
    const id = 'v_' + Date.now();
    const createdAt = new Date().toISOString();
    const author = body.author || { id: 'system' };
    const v = { id, createdAt, author, status: 'draft', message: 'Import settings', content, diffs: diffKeys(await readJson(PUBLISHED_FILE, {}), content) };
    versions.unshift(v);
    await writeJson(VERSIONS_FILE, versions);
    const audit = await readJson(AUDIT_FILE, []);
    audit.unshift({ id: 'a_' + Date.now(), type: 'settings.import', user: author, createdAt, details: { versionId: id } });
    await writeJson(AUDIT_FILE, audit);
    return res.status(201).json(v);
  }

  return res.status(404).json({ error: 'not_found' });
};
