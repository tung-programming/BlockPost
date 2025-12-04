import { useNavigate } from "react-router-dom";

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Hero Card */}
        <div className="bg-slate-900/60 backdrop-blur-lg border border-slate-800 rounded-2xl p-8 md:p-12 shadow-2xl">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-5xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              BlockPost
            </h1>
            <p className="text-xl md:text-2xl text-slate-300">
              Web3-native social media where posts have on-chain proof of originality.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button
              onClick={() => navigate("/auth")}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
            >
              Get Started
            </button>
            <button
              onClick={() => navigate("/feed")}
              className="px-8 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg font-semibold transition-colors"
            >
              Explore Feed (demo)
            </button>
          </div>

          {/* How It Works Section */}
          <div className="border-t border-slate-700 pt-8">
            <h2 className="text-2xl font-bold text-center mb-6">How it works</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-slate-800/50 rounded-lg p-6 text-center">
                <div className="text-3xl mb-3">🔐</div>
                <h3 className="font-semibold mb-2">Content → Hashed</h3>
                <p className="text-slate-400 text-sm">SHA-256 / pHash algorithms secure your content</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-6 text-center">
                <div className="text-3xl mb-3">⛓️</div>
                <h3 className="font-semibold mb-2">Hash → Stored on Blockchain</h3>
                <p className="text-slate-400 text-sm">Immutable proof stored on-chain</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-6 text-center">
                <div className="text-3xl mb-3">✅</div>
                <h3 className="font-semibold mb-2">Viewers → Verify originality</h3>
                <p className="text-slate-400 text-sm">Instant verification of content authenticity</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
