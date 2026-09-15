import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DataFormPage, { Field, FormSection } from '@/components/form/DataFormPage';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

type Props = {
  table: 'suppliers' | 'employees';
  label: string;
  listPath: string;
  /** supplier => Company, employee => Position */
  secondaryLabel: string;
  secondaryField: 'company' | 'position';
};

export default function ContactFormPage({ table, label, listPath, secondaryLabel, secondaryField }: Props) {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    name: '', [secondaryField]: '', phone: '', email: '', address: '', notes: '', is_active: true,
  });

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      const { data } = await (supabase as any).from(table).select('*').eq('id', id).maybeSingle();
      if (data) setForm(data);
    })();
  }, [id, user, table]);

  const set = (patch: any) => setForm((f: any) => ({ ...f, ...patch }));

  const handleSave = async () => {
    if (!form.name?.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    const payload = {
      user_id: user?.id,
      name: form.name,
      [secondaryField]: form[secondaryField] || null,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      notes: form.notes || null,
      is_active: !!form.is_active,
    };
    const q = id
      ? (supabase as any).from(table).update(payload).eq('id', id)
      : (supabase as any).from(table).insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${label} saved`);
    navigate(listPath);
  };

  const sections: FormSection[] = [
    {
      id: 'details',
      title: 'Details',
      description: `Basic information for this ${label.toLowerCase()}.`,
      content: (
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Name" required>
            <Input value={form.name || ''} onChange={e => set({ name: e.target.value })} />
          </Field>
          <Field label={secondaryLabel}>
            <Input value={form[secondaryField] || ''} onChange={e => set({ [secondaryField]: e.target.value })} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone || ''} onChange={e => set({ phone: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input value={form.email || ''} onChange={e => set({ email: e.target.value })} />
          </Field>
          <Field label="Address" className="md:col-span-2">
            <Textarea rows={3} value={form.address || ''} onChange={e => set({ address: e.target.value })} />
          </Field>
        </div>
      ),
    },
    {
      id: 'additional',
      title: 'Additional Info',
      content: (
        <div className="space-y-4">
          <Field label="Notes">
            <Textarea rows={4} value={form.notes || ''} onChange={e => set({ notes: e.target.value })} />
          </Field>
          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox checked={!!form.is_active} onCheckedChange={c => set({ is_active: !!c })} />
            Active
          </label>
        </div>
      ),
    },
  ];

  return (
    <DataFormPage
      breadcrumb="Home / Contacts"
      title={id ? `Edit ${label}` : `New ${label}`}
      sections={sections}
      onSave={handleSave}
      saving={saving}
      onBack={() => navigate(listPath)}
    />
  );
}
