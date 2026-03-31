import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft } from 'lucide-react';
import logo from '@/assets/logo.svg';

export default function LoginPage() {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const { signInWithOtp, verifyOtp } = useAuth();

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Sila masukkan emel yang sah');
      return;
    }
    setError('');
    setSending(true);
    const result = await signInWithOtp(email);
    setSending(false);
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
      navigate(result.isNewUser ? '/onboarding' : '/dashboard');
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    await signInWithOtp(email);
    setResendTimer(30);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — desktop only */}
      <div className="hidden md:flex md:w-1/2 bg-navy flex-col items-center justify-center">
        <img src="/src/assets/logo-new.png" alt="WorkTrace" className="h-12 mb-4 opacity-100 bg-transparent border-transparent border-0" />
        <p className="text-navy-foreground/80 text-lg">Jejak Kerja. Senang Collect.</p>
      </div>

      {/* Right panel / mobile full */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Mobile logo */}
        <div className="md:hidden mb-8">
          <img src={logo} alt="WorkTrace" className="h-10" style={{ background: 'transparent' }} />
        </div>

        <div className="w-full max-w-sm">
          {step === 'email' ? (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Masuk atau Daftar</h1>
                <p className="text-muted-foreground mt-1">Kami akan hantar kod OTP ke emel anda</p>
              </div>
              <div>
                <Input
                  type="email"
                  placeholder="emel@contoh.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  className="h-11 rounded-lg"
                  autoFocus
                />
                {error && <p className="text-destructive text-sm mt-2">{error}</p>}
              </div>
              <Button type="submit" className="w-full h-11 rounded-lg" disabled={sending}>
                {sending ? 'Menghantar...' : 'Hantar Kod OTP'}
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
              <button
                onClick={() => { setStep('email'); setOtp(['', '', '', '', '', '']); setError(''); }}
                className="flex items-center text-muted-foreground hover:text-foreground text-sm mb-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
              </button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Semak emel anda</h1>
                <p className="text-muted-foreground mt-1">Kod 6-digit telah dihantar ke <span className="font-medium text-foreground">{email}</span></p>
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
                {verifying ? 'Mengesahkan...' : 'Sahkan Kod'}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                {resendTimer > 0 ? (
                  <>Hantar semula dalam {resendTimer}s</>
                ) : (
                  <button onClick={handleResend} className="text-primary hover:underline">Hantar semula kod</button>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
