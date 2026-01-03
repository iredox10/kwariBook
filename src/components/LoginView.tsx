import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { account } from '../api/appwrite';
import { ID } from 'appwrite';
import { Phone, Mail, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: () => void;
}

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const { t } = useTranslation();
  const [method, setStepMethod] = useState<'phone' | 'email'>('email');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [userId, setUserId] = useState('');
  const [step, setStep] = useState<'input' | 'verify' | 'sent'>('input');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      let formattedPhone = phone.trim();
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '+234' + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+234' + formattedPhone;
      }

      const session = await account.createPhoneToken(ID.unique(), formattedPhone);
      console.log('OTP Sent to:', formattedPhone);
      setUserId(session.userId);
      setStep('verify');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP. Please check the number.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Redirect URL back to the app
      const redirectUrl = window.location.origin;
      await account.createMagicURLToken(ID.unique(), email, redirectUrl);
      setStep('sent');
    } catch (err: any) {
      setError(err.message || 'Failed to send login link.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await account.createSession(userId, otp);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'sent') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="inline-flex p-4 bg-kwari-green/10 text-kwari-green rounded-2xl">
            <CheckCircle2 size={48} />
          </div>
          <h1 className="text-3xl font-black text-gray-900">Check your Email</h1>
          <p className="text-gray-500">
            We've sent a login link to <span className="font-bold text-gray-800">{email}</span>. 
            Please click the link in your email to log in.
          </p>
          <button
            onClick={() => setStep('input')}
            className="text-kwari-green font-bold hover:underline"
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="inline-flex p-4 bg-kwari-green/10 text-kwari-green rounded-2xl mb-4">
            {method === 'phone' ? <Phone size={32} /> : <Mail size={32} />}
          </div>
          <h1 className="text-3xl font-black text-gray-900">{t('appName')}</h1>
          <p className="text-gray-500 mt-2">
            {step === 'input' 
              ? `Enter your ${method} to start` 
              : 'Enter the code sent to your phone'}
          </p>
        </div>

        {step === 'input' && (
          <div className="flex p-1 bg-gray-100 rounded-2xl mb-4">
            <button
              onClick={() => { setStepMethod('email'); setError(''); }}
              className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${
                method === 'email' ? 'bg-white shadow-sm text-kwari-green' : 'text-gray-500'
              }`}
            >
              Email
            </button>
            <button
              onClick={() => { setStepMethod('phone'); setError(''); }}
              className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${
                method === 'phone' ? 'bg-white shadow-sm text-kwari-green' : 'text-gray-500'
              }`}
            >
              Phone
            </button>
          </div>
        )}

        <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 shadow-sm">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm font-bold rounded-xl border border-red-100">
              {error}
            </div>
          )}

          {step === 'input' ? (
            method === 'phone' ? (
              <form onSubmit={handleSendOTP} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">+234</span>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-16 p-4 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-kwari-green/10 focus:border-kwari-green transition-all font-bold"
                      placeholder="801 234 5678"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full p-4 bg-kwari-green text-white font-black rounded-2xl shadow-lg shadow-green-100 flex items-center justify-center space-x-2 hover:bg-opacity-90 disabled:opacity-50 transition-all"
                >
                  {loading ? <Loader2 className="animate-spin" /> : (
                    <>
                      <span>Send Code</span>
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSendMagicLink} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-4 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-kwari-green/10 focus:border-kwari-green transition-all font-bold"
                    placeholder="name@example.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full p-4 bg-kwari-green text-white font-black rounded-2xl shadow-lg shadow-green-100 flex items-center justify-center space-x-2 hover:bg-opacity-90 disabled:opacity-50 transition-all"
                >
                  {loading ? <Loader2 className="animate-spin" /> : (
                    <>
                      <span>Send Magic Link</span>
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
              </form>
            )
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Verification Code</label>
                <input
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full p-4 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-kwari-green/10 focus:border-kwari-green transition-all text-center text-2xl tracking-[1em] font-black"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full p-4 bg-kwari-green text-white font-black rounded-2xl shadow-lg shadow-green-100 flex items-center justify-center space-x-2 hover:bg-opacity-90 disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 className="animate-spin" /> : <span>Verify & Login</span>}
              </button>
              <button
                type="button"
                onClick={() => setStep('input')}
                className="w-full text-center text-sm font-bold text-gray-400 hover:text-gray-600"
              >
                Change {method}
              </button>
            </form>
          )}
        </div>
        
        <p className="text-center text-xs text-gray-400">
          By continuing, you agree to KwariBook's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
