export const GetStarted = ({ onGetStarted }: { onGetStarted: () => void }) => {
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0" style={{
            backgroundImage: 'url(https://images.pexels.com/photos/1438072/pexels-photo-1438072.jpeg?auto=compress&cs=tinysrgb&w=1920)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(2px)'
          }}></div>
        </div>
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      <div className="relative z-10 max-w-md w-full px-6 text-center animate-fade-in">
        <div className="mb-12">
          <div className="mb-6">
            <h1 className="text-8xl font-cursive text-[#45C4A0] mb-2">socio</h1>
          </div>
          <p className="text-xl text-white/90 font-light">Connect with your campus community</p>
        </div>

        <button
          onClick={onGetStarted}
          className="w-full py-4 bg-[#45C4A0] text-white font-semibold rounded-2xl hover:bg-[#3ab592] transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Get Started
        </button>

        <p className="mt-8 text-sm text-white/60">
          Join thousands of students already using Socio
        </p>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
      `}</style>
    </div>
  );
};
