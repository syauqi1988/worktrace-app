import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { usePlanGate } from '@/hooks/usePlanGate';
import UpgradeModal from '@/components/UpgradeModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, X } from 'lucide-react';

const PREDEFINED_TAGS = ['VIP', 'Repeat'];

export default function CustomerFormPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const fromJobForm = searchParams.get('from') === 'jobs';
  const { checkCustomerLimit, upgradeOpen, setUpgradeOpen, upgradeReason } = usePlanGate();

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [tinNumber, setTinNumber] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isEdit || !user || !id) return;
    async function fetch() {
      const { data } = await supabase.from('customers').select('*').eq('id', id).single();
      if (data) {
        const c = data as any;
        setName(c.name || '');
        setPhone(c.phone || '');
        setEmail(c.email || '');
        setAddress(c.address || '');
        setTinNumber(c.tin_number || '');
        setTags(c.tags || []);
      }
      setLoading(false);
    }
    fetch();
  }, [isEdit, user, id]);

  const toggleTag = (tag: string) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const addCustomTag = () => {
    const val = customTagInput.trim();
    if (val && !tags.includes(val)) {
      setTags(prev => [...prev, val]);
    }
    setCustomTagInput('');
  };

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Sila masukkan nama pelanggan';
    if (!phone.trim()) newErrors.phone = 'Sila masukkan nombor telefon';
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        address: address.trim() || null,
        tin_number: tinNumber.trim() || null,
        tags,
      };

      if (isEdit) {
        const { error } = await supabase.from('customers').update(payload).eq('id', id);
        if (error) throw error;
        toast({ title: 'Pelanggan berjaya dikemaskini!' });
        navigate(`/customers/${id}`);
      } else {
        payload.user_id = user!.id;
        const { data, error } = await supabase.from('customers').insert(payload).select('id').single();
        if (error) throw error;
        toast({ title: 'Pelanggan berjaya disimpan!' });
        if (fromJobForm) {
          navigate('/jobs/new');
        } else {
          navigate(`/customers/${data.id}`);
        }
      }
    } catch (err: any) {
      toast({ title: 'Ralat', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-xl pb-28 md:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(isEdit ? `/customers/${id}` : '/customers')} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">{isEdit ? 'Edit Pelanggan' : 'Pelanggan Baru'}</h1>
      </div>

      {/* Name */}
      <div className="space-y-1.5">
        <Label>Nama Pelanggan *</Label>
        <Input
          value={name}
          onChange={e => { setName(e.target.value); setErrors(prev => ({ ...prev, name: '' })); }}
          placeholder="e.g. Ahmad bin Zaki"
          className={errors.name ? 'border-destructive' : ''}
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
      </div>

      {/* Phone */}
      <div className="space-y-1.5">
        <Label>Nombor Telefon *</Label>
        <Input
          type="text"
          value={phone}
          onChange={e => { setPhone(e.target.value); setErrors(prev => ({ ...prev, phone: '' })); }}
          placeholder="e.g. 0123456789"
          className={errors.phone ? 'border-destructive' : ''}
        />
        <p className="text-xs text-muted-foreground">Format: 0123456789</p>
        {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <Label>E-mel</Label>
        <Input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="e.g. ahmad@email.com"
        />
      </div>

      {/* Address */}
      <div className="space-y-1.5">
        <Label>Alamat</Label>
        <Textarea
          value={address}
          onChange={e => setAddress(e.target.value)}
          rows={3}
          placeholder="Alamat lengkap..."
        />
      </div>

      {/* Tags */}
      <div className="space-y-1.5">
        <Label>Tag</Label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {PREDEFINED_TAGS.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                tags.includes(tag) ? 'bg-primary text-primary-foreground' : 'bg-sidebar-background text-muted-foreground'
              }`}
            >
              {tag}
            </button>
          ))}
          {tags.filter(t => !PREDEFINED_TAGS.includes(t)).map(tag => (
            <span key={tag} className="text-xs font-medium px-3 py-1.5 rounded-full bg-primary text-primary-foreground flex items-center gap-1">
              {tag}
              <button type="button" onClick={() => toggleTag(tag)}><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={customTagInput}
            onChange={e => setCustomTagInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
            placeholder="Tag baru + Enter"
            className="h-8 text-sm flex-1"
          />
          <Button size="sm" type="button" variant="outline" onClick={addCustomTag} className="h-8 px-2"><Plus className="h-3.5 w-3.5" /></Button>
        </div>
      </div>

      {/* TIN Number (only if LHDN enabled) */}
      {profile?.lhdn_enabled && (
        <div className="space-y-1.5">
          <Label>No. TIN (LHDN)</Label>
          <Input
            value={tinNumber}
            onChange={e => setTinNumber(e.target.value)}
            placeholder="e.g. C12345678900"
          />
          <p className="text-xs text-muted-foreground">Untuk tujuan e-invois LHDN</p>
        </div>
      )}

      {/* Submit */}
      <Button onClick={handleSubmit} disabled={submitting} className="w-full rounded-lg h-11">
        {submitting ? 'Menyimpan...' : isEdit ? 'Kemaskini Pelanggan' : 'Simpan Pelanggan'}
      </Button>
    </div>
  );
}
