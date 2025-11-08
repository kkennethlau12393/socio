import { useState } from 'react';
import { Mail, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface EmailVerificationScreenProps {
  email: string;
}

export const EmailVerificationScreen = ({ email }: EmailVerificationScreenProps) => {
  const { signOut } = useAuth();
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckVerification = async () => {
    setIsChecking(true);
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleBackToLogin = async () => {
    await signOut();
  };

  return (
    <div className="h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-sm p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#45C4A0]/10 rounded-full mb-6">
            <Mail className="w-10 h-10 text-[#45C4A0]" />
          </div>

          <h1 className="text-2xl font-bold text-[#1e293b] mb-3">
            Verify Your Email
          </h1>

          <p className="text-gray-600 mb-2">
            We've sent a verification link to:
          </p>

          <p className="text-[#45C4A0] font-semibold mb-6">
            {email}
          </p>

          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm text-gray-600 mb-3">
              Please check your email and click the verification link to continue.
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
            onClick={handleCheckVerification}
            disabled={isChecking}
            className="w-full py-3 bg-[#45C4A0] text-white font-semibold rounded-xl hover:bg-[#3ab592] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-3"
          >
            {isChecking ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                I've Verified My Email
              </>
            )}
          </button>

          <button
            onClick={handleBackToLogin}
            className="w-full py-3 text-gray-600 hover:text-[#45C4A0] transition-colors font-medium"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};
