import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Gift, Fingerprint } from 'lucide-react';
import logo from '@/assets/logo-new.png';
import InstallPromptBanner from '@/components/InstallPromptBanner';
import LanguageToggle from '@/components/LanguageToggle';
import { applyReferralFromUrl } from '@/lib/applyReferral';
import { isPasskeySupported, signInWithPasskey, getRememberedEmail, rememberEmail } from '@/lib/passkeys';
import { toast } from 'sonner';

const HCAPTCHA_SITE_KEY = '71b8e45e-eee4-4054-8f94-121a300c9072';

export default function LoginPage() {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState(getRememberedEmail());
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [bioSupported, setBioSupported] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const captchaRef = useRef<HCaptcha>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signInWithOtp, verifyOtp } = useAuth();
  const { t } = useTranslation();
  const refCode = searchParams.get('ref');

  useEffect(() => { isPasskeySupported().then(setBioSupported); }, []);

  // Capture referral code
  useEffect(() => {
    if (refCode) localStorage.setItem('worktrace_ref', refCode);
  }, [refCode]);

  const handleBiometric = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t('login.invalidEmail'));
      return;
    }
    setError('');
    setBioBusy(true);
    const res = await signInWithPasskey(email.trim().toLowerCase());
    setBioBusy(false);
    if (res.ok) {
      rememberEmail(email.trim().toLowerCase());
      try { await applyReferralFromUrl(); } catch {}
      navigate('/dashboard');
      return;
    }
    const err = (res as { ok: false; error: string }).error;
    if (err === 'cancelled') { toast.info(t('login.biometricCancelled')); return; }
    if (err === 'no_passkey') { setError(t('login.biometricNoPasskey')); return; }
    setError(t('login.biometricFailed'));
  };

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(r => r - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t('login.invalidEmail'));
      return;
    }
    if (!captchaToken) {
      setError(t('login.captchaRequired'));
      return;
    }
    setError('');
    setSending(true);
    const result = await signInWithOtp(email, captchaToken);
    setSending(false);
    // Reset captcha (single-use token)
    captchaRef.current?.resetCaptcha();
    setCaptchaToken(null);
    if (result.error) {
      setError(result.error);
    } else {
      setStep('otp');
      setResendTimer(30);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    if (newOtp.every(d => d !== '') && newOtp.join('').length === 6) {
      submitOtp(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newOtp = pasted.split('');
      setOtp(newOtp);
      submitOtp(pasted);
      e.preventDefault();
    }
  };

  const submitOtp = async (token: string) => {
    setError('');
    setVerifying(true);
    const result = await verifyOtp(email, token);
    setVerifying(false);
    if (result.error) {
      setError(result.error);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } else {
      rememberEmail(email.trim().toLowerCase());
      try { await applyReferralFromUrl(); } catch (e) { console.error('applyReferral failed', e); }
      navigate(result.isNewUser ? '/onboarding' : '/dashboard');
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    // Need a fresh captcha token for resend
    const token = await captchaRef.current?.execute({ async: true }).catch(() => null);
    await signInWithOtp(email, token?.response);
    captchaRef.current?.resetCaptcha();
    setResendTimer(30);
  };

  return (
    <>
      <InstallPromptBanner />
      <div className="min-h-screen flex relative">
      <div className="absolute top-3 right-3 z-10">
        <LanguageToggle />
      </div>
      {/* Left panel — desktop only */}
      <div className="hidden md:flex md:w-1/2 bg-primary flex-col items-center justify-center">
        <img src={logo} alt="WorkTrace" className="h-12 mb-4 opacity-100 bg-transparent border-transparent border-0" />
        <p className="text-primary-foreground/80 text-lg">{t('login.tagline')}</p>
      </div>

      {/* Right panel / mobile full */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 bg-card">
        {/* Mobile logo */}
        <div className="md:hidden mb-8">
          <img src={logo} alt="WorkTrace" className="h-10 logo-dark" style={{ background: 'transparent' }} />
        </div>

        {/* Referral welcome banner */}
        {refCode && (
          <div className="w-full max-w-sm mb-4 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <Gift className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium">{t('login.referralTitle')}</p>
              <p>{t('login.referralBody')}</p>
            </div>
          </div>
        )}

        <div className="w-full max-w-sm">
          {step === 'email' ? (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t('login.title')}</h1>
                <p className="text-muted-foreground mt-1">{t('login.subtitle')}</p>
              </div>
              <div>
                <Input
                  type="email"
                  placeholder={t('login.emailPlaceholder')}
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  className="h-11 rounded-lg"
                  autoFocus
                />
                {error && <p className="text-destructive text-sm mt-2">{error}</p>}
              </div>
              <div className="flex justify-center">
                <HCaptcha
                  ref={captchaRef}
                  sitekey={HCAPTCHA_SITE_KEY}
                  onVerify={(token) => setCaptchaToken(token)}
                  onExpire={() => setCaptchaToken(null)}
                  onError={() => setCaptchaToken(null)}
                />
              </div>
              <Button type="submit" className="w-full h-11 rounded-lg" disabled={sending || !captchaToken}>
                {sending ? t('login.sending') : t('login.sendOtp')}
              </Button>
              {bioSupported && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBiometric}
                  disabled={bioBusy || !email}
                  className="w-full h-11 rounded-lg"
                >
                  <Fingerprint className="h-4 w-4 mr-2" />
                  {t('login.useBiometric')}
                </Button>
              )}
            </form>
          ) : (
            <div className="space-y-6">
              <button
                onClick={() => { setStep('email'); setOtp(['', '', '', '', '', '']); setError(''); }}
                className="flex items-center text-muted-foreground hover:text-foreground text-sm mb-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> {t('login.back')}
              </button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t('login.checkEmail')}</h1>
                <p className="text-muted-foreground mt-1">{t('login.sentTo')} <span className="font-medium text-foreground">{email}</span></p>
              </div>
              <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    className="w-12 h-14 text-center text-xl font-semibold border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                  />
                ))}
              </div>
              {error && <p className="text-destructive text-sm text-center">{error}</p>}
              <Button
                onClick={() => submitOtp(otp.join(''))}
                className="w-full h-11 rounded-lg"
                disabled={verifying || otp.some(d => !d)}
              >
                {verifying ? t('login.verifying') : t('login.verify')}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                {resendTimer > 0 ? (
                  <>{t('login.resendIn', { seconds: resendTimer })}</>
                ) : (
                  <button onClick={handleResend} className="text-primary hover:underline">{t('login.resend')}</button>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
