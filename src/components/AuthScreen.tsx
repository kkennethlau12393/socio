import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface AuthScreenProps {
  onComplete: () => void;
}

const ALLOWED_DOMAINS = [
  { domain: 'ucl.ac.uk', name: 'University College London' },
  { domain: 'lse.ac.uk', name: 'London School of Economics' },
  { domain: 'kcl.ac.uk', name: "King's College London" },
  { domain: 'imperial.ac.uk', name: 'Imperial College London' }
];

const DEV_ALLOWED_EMAILS = [
  'kenneth@tomlau.com',
  'kenneth@socio-app.com',
  'misha@socio-app.com'
];

export const AuthScreen = ({ onComplete }: AuthScreenProps) => {
  const [isSignUp, setIsSignUp] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const { signUp, signIn, signInWithProvider } = useAuth();

  const validateEmailDomain = (email: string): boolean => {
    const emailLower = email.toLowerCase();
    if (DEV_ALLOWED_EMAILS.includes(emailLower)) {
      return true;
    }
    return ALLOWED_DOMAINS.some(({ domain }) => emailLower.endsWith(`@${domain}`));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isSignUp) {
      if (!validateEmailDomain(email)) {
        setError('Please use a valid university email from UCL, LSE, KCL, or Imperial College London');
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    }

    setLoading(true);

    if (isSignUp) {
      const { error: authError } = await signUp(email, password, { firstName, lastName });
      setLoading(false);

      if (authError) {
        setError(authError.message);
      } else {
        setRegisteredEmail(email);
        setShowVerificationMessage(true);
      }
    } else {
      const { error: authError } = await signIn(email, password);
      setLoading(false);

      if (authError) {
        setError(authError.message);
      } else {
        onComplete();
      }
    }
  };

  if (showVerificationMessage) {
    return (
      <div className="h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-sm p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-[#45C4A0]/10 rounded-full mb-6">
              <svg className="w-10 h-10 text-[#45C4A0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-[#1e293b] mb-3">
              Check Your Email
            </h1>

            <p className="text-gray-600 mb-2">
              We've sent a verification link to:
            </p>

            <p className="text-[#45C4A0] font-semibold mb-6">
              {registeredEmail}
            </p>

            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm text-gray-600 mb-3">
                Please click the link in the email to verify your account and complete registration.
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-[#45C4A0] font-bold">•</span>
                  <span>Check your spam folder if you don't see the email</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#45C4A0] font-bold">•</span>
                  <span>The link will expire in 24 hours</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => {
                setShowVerificationMessage(false);
                setIsSignUp(false);
                setEmail('');
                setPassword('');
                setFirstName('');
                setLastName('');
                setConfirmPassword('');
              }}
              className="w-full py-3 bg-[#45C4A0] text-white font-semibold rounded-xl hover:bg-[#3ab592] transition-all shadow-sm"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white flex items-center justify-center p-4 overflow-hidden">
      <div className="w-full max-w-md max-h-full overflow-y-auto">
        <div className="bg-white rounded-3xl shadow-sm p-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-[#45C4A0] rounded-2xl mb-3">
              <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[#1e293b] mb-1">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h1>
            <p className="text-sm text-gray-600">
              {isSignUp ? 'Join your campus community' : 'Sign in to continue'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {isSignUp && (
              <>
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1.5">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C4A0] focus:border-transparent transition-all"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C4A0] focus:border-transparent transition-all"
                    placeholder="Smith"
                  />
                </div>
              </>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                {isSignUp ? 'University Email' : 'Email'}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C4A0] focus:border-transparent transition-all"
                placeholder={isSignUp ? 'your.name@university.edu' : 'your@email.com'}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C4A0] focus:border-transparent transition-all"
                placeholder="••••••••"
              />
            </div>

            {isSignUp && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#45C4A0] focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#45C4A0] text-white font-semibold rounded-xl hover:bg-[#3ab592] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Please wait...' : (isSignUp ? 'Sign Up' : 'Sign In')}
            </button>
          </form>

          <div className="mt-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              <button
                onClick={() => {
                  setError('');
                  alert('University SSO login will redirect to your institutional login page');
                }}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 border-2 border-[#45C4A0] bg-[#45C4A0]/5 rounded-xl hover:bg-[#45C4A0]/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5 text-[#45C4A0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                  <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                </svg>
                <span className="text-sm font-semibold text-[#45C4A0]">Sign in with University SSO</span>
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={async () => {
                    setError('');
                    setLoading(true);
                    const { error: providerError } = await signInWithProvider('google');
                    if (providerError) {
                      setError(`Google Sign-In: ${providerError.message}. Please configure Google OAuth in your Supabase dashboard under Authentication > Providers.`);
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="text-sm font-medium text-gray-700">Google</span>
                </button>

                <button
                  onClick={async () => {
                    setError('');
                    setLoading(true);
                    const { error: providerError } = await signInWithProvider('azure');
                    if (providerError) {
                      setError(`Microsoft Sign-In: ${providerError.message}. Please configure Azure/Microsoft OAuth in your Supabase dashboard under Authentication > Providers.`);
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" viewBox="0 0 23 23">
                    <path fill="#f3f3f3" d="M0 0h23v23H0z"/>
                    <path fill="#f35325" d="M1 1h10v10H1z"/>
                    <path fill="#81bc06" d="M12 1h10v10H12z"/>
                    <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                    <path fill="#ffba08" d="M12 12h10v10H12z"/>
                  </svg>
                  <span className="text-sm font-medium text-gray-700">Microsoft</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="text-sm text-gray-600 hover:text-[#45C4A0] transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
