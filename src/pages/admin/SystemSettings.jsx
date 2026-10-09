import { useEffect, useState } from "react";
import { Save, Database, Mail, Palette } from "lucide-react";
import client from "../../api/client";
import { Card, Button, Input } from "../../components/ui/Kit";

export default function SystemSettings() {
  const [settings, setSettings] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [storage, setStorage] = useState(null);

  useEffect(() => {
    client.get("/settings").then(({ data }) => setSettings(data));
    client.get("/admin/storage").then(({ data }) => setStorage(data));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await client.put("/admin/settings", settings);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!settings) return null;

  return (
    <form onSubmit={save} className="max-w-2xl space-y-6">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-4 h-4 text-gold-dark" />
            <h3 className="font-display font-semibold text-ink">Site configuration</h3>
          </div>
          <div className="space-y-4">
            <Input label="Site name" value={settings.site_name} onChange={(e) => setSettings({ ...settings, site_name: e.target.value })} />
            <Input label="Support email" type="email" value={settings.support_email} onChange={(e) => setSettings({ ...settings, support_email: e.target.value })} />
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-text">Theme color</span>
              <input type="color" value={settings.theme_color} onChange={(e) => setSettings({ ...settings, theme_color: e.target.value })} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
              <span className="text-xs font-mono text-muted">{settings.theme_color}</span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-4 h-4 text-gold-dark" />
            <h3 className="font-display font-semibold text-ink">Registrations</h3>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={settings.allow_registrations} onChange={(e) => setSettings({ ...settings, allow_registrations: e.target.checked })} className="w-4 h-4 accent-gold" />
            <span className="text-sm text-text">Allow new user registrations</span>
          </label>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-4 h-4 text-gold-dark" />
            <h3 className="font-display font-semibold text-ink">Storage</h3>
          </div>
          <p className="text-sm text-muted">{storage ? `${storage.used_mb} MB used by uploaded files` : "Loading..."}</p>
          <p className="text-xs text-muted-light mt-2">
            Automated backups aren't wired into this UI — run <code className="font-mono bg-paper px-1.5 py-0.5 rounded">mysqldump</code> on a
            schedule (cron) for production backups. See the README for a sample script.
          </p>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" icon={Save} loading={saving}>Save settings</Button>
          {saved && <span className="text-sm text-emerald font-medium">Saved!</span>}
        </div>
      </form>
  );
}
