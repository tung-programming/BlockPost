import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "./firebase/config";
import { firestoreOperations } from "./firebase/firestoreRefs";

function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showTerms, setShowTerms] = useState(false);

  useEffect(() => {
    // Load JetBrains Mono font
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
  };

  // Email/Password Signup
  const handleEmailSignup = async (e) => {
    e.preventDefault();
    
    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    // Show terms and conditions
    setShowTerms(true);
  };

  // Proceed with signup after accepting terms
  const proceedWithSignup = async (authMethod = "email") => {
    setLoading(true);
    setError("");

    try {
      let userCredential;

      if (authMethod === "email") {
        userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );
      } else if (authMethod === "google") {
        const provider = new GoogleAuthProvider();
        userCredential = await signInWithPopup(auth, provider);
      }

      const user = userCredential.user;

      // Create user document in Firestore
      await firestoreOperations.setUser(user.uid, {
        email: user.email,
        createdAt: new Date().toISOString(),
        profileComplete: false,
        walletLinked: false,
      });

      console.log("User created:", user.uid);

      // Navigate to profile setup
      navigate("/profile-setup");
    } catch (error) {
      console.error("Signup error:", error);
      setError(getErrorMessage(error.code));
      setShowTerms(false);
    } finally {
      setLoading(false);
    }
  };

  // Google Auth Signup
  const handleGoogleSignup = () => {
    setShowTerms(true);
  };

  const getErrorMessage = (errorCode) => {
    switch (errorCode) {
      case "auth/email-already-in-use":
        return "This email is already registered. Please login instead.";
      case "auth/invalid-email":
        return "Invalid email address.";
      case "auth/operation-not-allowed":
        return "Email/password accounts are not enabled.";
      case "auth/weak-password":
        return "Password is too weak. Please use a stronger password.";
      default:
        return "Signup failed. Please try again.";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 relative overflow-hidden" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-blue-400/30 to-purple-400/20 blur-[80px] animate-blob" />
        <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-gradient-to-br from-purple-400/25 to-blue-400/15 blur-[80px] animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-5%] left-[30%] w-[450px] h-[450px] rounded-full bg-gradient-to-br from-blue-500/20 to-violet-400/15 blur-[80px] animate-blob animation-delay-4000" />
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="bg-white rounded-3xl p-8 shadow-card border border-slate-100">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center font-bold text-xl text-white">
                B
              </div>
              <span className="text-2xl font-bold text-blue-600">
                BlockPost
              </span>
            </div>
            <h1 className="text-3xl font-bold mb-2 text-slate-900">
              Join BlockPost
            </h1>
            <p className="text-slate-600 text-sm">
              Create your account and start posting
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Signup Form */}
          <form onSubmit={handleEmailSignup} className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                placeholder="Enter your email"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                placeholder="Create a password"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                placeholder="Confirm your password"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl font-semibold transition-all hover:scale-105 shadow-lg text-white"
            >
              {loading ? "Creating account..." : "Sign Up"}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-slate-500">Or continue with</span>
            </div>
          </div>

          {/* Google Signup Button */}
          <button
            onClick={handleGoogleSignup}
            disabled={loading}
            className="w-full py-3 bg-white hover:bg-slate-50 disabled:bg-slate-100 disabled:cursor-not-allowed border border-slate-200 rounded-xl font-medium transition-all hover:shadow-md flex items-center justify-center gap-3 text-slate-700"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign up with Google
          </button>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-slate-600 text-sm">
              Already have an account?{" "}
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign in
              </Link>
            </p>
          </div>

          {/* Back to Landing */}
          <div className="mt-4 text-center">
            <Link to="/" className="text-slate-500 hover:text-slate-700 text-sm transition-colors">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>

      {/* Terms and Conditions Modal */}
      {showTerms && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl border border-slate-200">
            <h2 className="text-2xl font-bold mb-4 text-slate-900">Terms and Conditions</h2>
            
            <div className="space-y-4 text-slate-600 text-sm mb-6">
              <p>
                <strong className="text-slate-900">Welcome to BlockPost!</strong> By creating an account, you agree to the
                following terms:
              </p>

              <div>
                <h3 className="font-semibold text-slate-900 mb-2">1. Account Responsibility</h3>
                <p>
                  You are responsible for maintaining the security of your account and any
                  activities that occur under your account.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-2">2. Content Ownership</h3>
                <p>
                  You retain ownership of all content you post. BlockPost creates cryptographic
                  hashes of your content for verification purposes.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-2">3. Blockchain Integration</h3>
                <p>
                  Content hashes are stored on the blockchain. Once posted, these hashes are
                  immutable and cannot be deleted from the blockchain.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-2">4. Wallet Connection</h3>
                <p>
                  Connecting a MetaMask wallet is optional but required for posting content.
                  You are responsible for the security of your wallet.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-2">5. Prohibited Content</h3>
                <p>
                  You may not post content that is illegal, harmful, threatening, abusive,
                  harassing, or violates any laws or regulations.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-2">6. Privacy</h3>
                <p>
                  We collect and store your email, profile information, and wallet address (if
                  linked). This data is used to provide our services.
                </p>
              </div>

              <p className="text-slate-500">
                By clicking "I Accept", you confirm that you have read and agree to these terms
                and conditions.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowTerms(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl font-medium transition-colors text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => proceedWithSignup(formData.email ? "email" : "google")}
                disabled={loading}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl font-semibold transition-all hover:scale-105 shadow-lg text-white"
              >
                {loading ? "Creating account..." : "I Accept"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Signup;