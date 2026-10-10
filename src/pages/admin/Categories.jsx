import { useEffect, useState } from "react";
import { Plus, Trash2, FolderKanban } from "lucide-react";
import client from "../../api/client";
import { Card, Spinner, Button, Input, EmptyState } from "../../components/ui/Kit";
import { Modal } from "../../components/ui/Modal";
import { extractErrorMessage } from "../../utils/helpers";

export default function Categories() {
  const [categories, setCategories] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await client.get("/categories");
    setCategories(data);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await client.post("/categories", form);
      setOpen(false);
      setForm({ name: "", description: "" });
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    await client.delete(`/categories/${id}`);
    load();
  };

  if (!categories) return <Spinner />;

  return (
    <>
      <div className="flex justify-end mb-6">
        <Button icon={Plus} onClick={() => setOpen(true)}>New category</Button>
      </div>

      {categories.length === 0 ? (
        <EmptyState icon={FolderKanban} title="No categories yet" description="Create categories to help organize and filter courses." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((c) => (
            <Card key={c.id} className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-medium text-text">{c.name}</h3>
                {c.description && <p className="text-xs text-muted mt-1">{c.description}</p>}
                <p className="text-xs text-gold-dark font-medium mt-2">{c.course_count} course{c.course_count !== 1 ? "s" : ""}</p>
              </div>
              <button onClick={() => remove(c.id)} className="p-1.5 text-muted hover:text-danger shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New category">
        <form onSubmit={create} className="space-y-4">
          <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          {error && <p className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{error}</p>}
          <Button type="submit" className="w-full" loading={saving}>Create category</Button>
        </form>
      </Modal>
    </>
  );
}
