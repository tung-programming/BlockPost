import { useState } from "react";
import { Link } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "./firebase/config";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (error) {
      console.error("Password reset error:", error);
      
      if (error.code === "auth/user-not-found") {
        setError("No account found with this email address.");
      } else if (error.code === "auth/invalid-email") {
        setError("Invalid email address.");
      } else {
        setError("Failed to send reset email. Please try again.");
      }
    } finally {
      setLoading(false);
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
            <h1 className="text-3xl font-bold mb-2 text-slate-900">Reset Password</h1>
            <p className="text-slate-600 text-sm">
              Enter your email to receive a password reset link
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-green-700 text-sm font-medium mb-2">
                ✓ Password reset email sent!
              </p>
              <p className="text-green-600 text-sm">
                Check your inbox (and spam folder) for the reset link.
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Info Message */}
          {!success && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-blue-700 text-sm">
                💡 <strong>Pro tip:</strong> Check your spam folder if you don't see the email
                in your inbox.
              </p>
            </div>
          )}

          {/* Form */}
          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                  placeholder="Enter your email"
                  required
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl font-semibold transition-all hover:scale-105 shadow-lg text-white"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => {
                  setSuccess(false);
                  setEmail("");
                }}
                className="w-full py-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl font-medium transition-all hover:shadow-md text-slate-700"
              >
                Send Another Email
              </button>
            </div>
          )}

          {/* Back to Login Link */}
          <div className="mt-6 text-center space-y-2">
            <Link
              to="/login"
              className="block text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              ← Back to Login
            </Link>
            <Link to="/" className="block text-slate-500 hover:text-slate-700 text-sm transition-colors">
              Back to home
            </Link>
          </div>

          {/* Additional Info */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-slate-500 text-xs text-center">
              Reset links expire after 1 hour for security reasons
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
