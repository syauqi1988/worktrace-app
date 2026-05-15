import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { ArrowLeft } from 'lucide-react';
import TagInput from '@/components/customers/TagInput';
import { ColoredTag, normalizeTags } from '@/components/customers/TagBadge';

export default function CustomerFormPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const fromJobForm = searchParams.get('from') === 'jobs';
  const { checkCustomerLimit, upgradeOpen, setUpgradeOpen, upgradeReason } = usePlanGate();

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [tinNumber, setTinNumber] = useState('');
  const [tags, setTags] = useState<ColoredTag[]>([]);
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
        setTags(normalizeTags(c.tags_v2, c.tags));
      }
      setLoading(false);
    }
    fetch();
  }, [isEdit, user, id]);

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = t('customerForm.errName');
    if (!phone.trim()) newErrors.phone = t('customerForm.errPhone');
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    if (!isEdit && user) {
      const allowed = await checkCustomerLimit(user.id);
      if (!allowed) return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        address: address.trim() || null,
        tin_number: tinNumber.trim() || null,
        tags_v2: tags,
        tags: tags.map(tg => tg.label),
      };

      if (isEdit) {
        const { error } = await supabase.from('customers').update(payload).eq('id', id);
        if (error) throw error;
        toast({ title: t('customerForm.savedEdit') });
        navigate(`/customers/${id}`);
      } else {
        payload.user_id = user!.id;
        const { data, error } = await supabase.from('customers').insert(payload).select('id').single();
        if (error) throw error;
        toast({ title: t('customerForm.savedNew') });
        if (fromJobForm) {
          navigate('/jobs/new');
        } else {
          navigate(`/customers/${data.id}`);
        }
      }
    } catch (err: any) {
      toast({ title: t('forms.errorLabel'), description: err.message, variant: 'destructive' });
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
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">{isEdit ? t('customerForm.edit') : t('customerForm.new')}</h1>
      </div>

      <div className="space-y-1.5">
        <Label>{t('customerForm.name')}</Label>
        <Input
          value={name}
          onChange={e => { setName(e.target.value); setErrors(prev => ({ ...prev, name: '' })); }}
          placeholder={t('customerForm.namePlaceholder')}
          className={errors.name ? 'border-destructive' : ''}
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>{t('customerForm.phone')}</Label>
        <Input
          type="text"
          value={phone}
          onChange={e => { setPhone(e.target.value); setErrors(prev => ({ ...prev, phone: '' })); }}
          placeholder={t('customerForm.phonePlaceholder')}
          className={errors.phone ? 'border-destructive' : ''}
        />
        <p className="text-xs text-muted-foreground">{t('customerForm.phoneHint')}</p>
        {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>{t('customerForm.email')}</Label>
        <Input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder={t('customerForm.emailPlaceholder')}
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t('customerForm.address')}</Label>
        <Textarea
          value={address}
          onChange={e => setAddress(e.target.value)}
          rows={3}
          placeholder={t('customerForm.addressPlaceholder')}
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t('customerForm.tags')}</Label>
        <TagInput tags={tags} onChange={setTags} />
      </div>

      {profile?.lhdn_enabled && (
        <div className="space-y-1.5">
          <Label>{t('customerForm.tin')}</Label>
          <Input
            value={tinNumber}
            onChange={e => setTinNumber(e.target.value)}
            placeholder="e.g. C12345678900"
          />
          <p className="text-xs text-muted-foreground">{t('customerForm.tinHint')}</p>
        </div>
      )}

      <Button onClick={handleSubmit} disabled={submitting} className="w-full rounded-lg h-11">
        {submitting ? t('forms.saving') : isEdit ? t('customerForm.saveEdit') : t('customerForm.saveNew')}
      </Button>
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} reason={upgradeReason} />
    </div>
  );
}
