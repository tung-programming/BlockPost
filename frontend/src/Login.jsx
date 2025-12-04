import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "./firebase/config";
import { firestoreOperations } from "./firebase/firestoreRefs";
import { ethers } from "ethers";

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  // Email/Password Login
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      
      console.log("User logged in:", userCredential.user.uid);
      
      // Check if user has completed profile setup
      const userResult = await firestoreOperations.getUser(userCredential.user.uid);
      
      if (userResult.success && userResult.data.profileComplete) {
        navigate("/feed");
      } else {
        navigate("/profile-setup");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError(getErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  };

  // Google Auth Login
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      console.log("Google login successful:", result.user.uid);
      
      // Check if user exists in Firestore
      const userResult = await firestoreOperations.getUser(result.user.uid);
      
      if (userResult.success) {
        // User exists, check if profile is complete
        if (userResult.data.profileComplete) {
          navigate("/feed");
        } else {
          navigate("/profile-setup");
        }
      } else {
        // New Google user - create user document and go to profile setup
        await firestoreOperations.setUser(result.user.uid, {
          email: result.user.email,
          createdAt: new Date().toISOString(),
          profileComplete: false,
          walletLinked: false,
        });
        navigate("/profile-setup");
      }
    } catch (error) {
      console.error("Google login error:", error);
      setError(getErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  };

  // MetaMask Wallet Login
  const handleMetaMaskLogin = async () => {
    setLoading(true);
    setError("");

    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        setError("MetaMask is not installed. Please install MetaMask extension.");
        setLoading(false);
        return;
      }

      // Request account access
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const walletAddress = accounts[0];

      console.log("Wallet connected:", walletAddress);

      // Check if wallet is linked to an account
      const result = await firestoreOperations.getUserByWallet(walletAddress);

      if (result.success) {
        // Wallet is linked, check if user has email set
        const userData = result.data;
        
        if (!userData.email) {
          // User hasn't set email yet, prompt them
          const userEmail = prompt(
            "Please link your email to this wallet address to continue:"
          );

          if (userEmail) {
            // Update user with email
            await firestoreOperations.updateUser(userData.id, {
              email: userEmail,
            });
            
            // Check if profile is complete
            if (userData.profileComplete) {
              navigate("/feed");
            } else {
              navigate("/profile-setup");
            }
          } else {
            setError("Email is required to proceed.");
          }
        } else {
          // User has email, check profile completion
          if (userData.profileComplete) {
            navigate("/feed");
          } else {
            navigate("/profile-setup");
          }
        }
      } else {
        // Wallet not linked to any account
        setError(
          "This wallet is not linked to any account. Please sign up first or link your wallet from your profile."
        );
      }
    } catch (error) {
      console.error("MetaMask login error:", error);
      setError("Failed to connect to MetaMask. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (errorCode) => {
    switch (errorCode) {
      case "auth/invalid-email":
        return "Invalid email address.";
      case "auth/user-disabled":
        return "This account has been disabled.";
      case "auth/user-not-found":
        return "No account found with this email.";
      case "auth/wrong-password":
        return "Incorrect password.";
      case "auth/invalid-credential":
        return "Invalid email or password.";
      default:
        return "Login failed. Please try again.";
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
              Welcome Back
            </h1>
            <p className="text-slate-600 text-sm">Sign in to BlockPost</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Email/Password Login Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4 mb-6">
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
                placeholder="Enter your password"
                required
                disabled={loading}
              />
            </div>

            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl font-semibold transition-all hover:scale-105 shadow-lg text-white"
            >
              {loading ? "Signing in..." : "Sign In"}
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

          {/* Social Login Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleGoogleLogin}
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
              Sign in with Google
            </button>

            <button
              onClick={handleMetaMaskLogin}
              disabled={loading}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-100 disabled:cursor-not-allowed rounded-xl font-medium transition-all hover:scale-105 shadow-lg flex items-center justify-center gap-3 text-white"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.38 0L13.94 6.15 15.54 2.29 22.38 0z"/>
                <path d="M1.61 0l8.35 6.21L8.45 2.29 1.61 0zM19.1 17.79l-2.71 4.15 5.81 1.6 1.67-5.66-4.77-.09zM.22 17.88l1.66 5.66 5.81-1.6-2.71-4.15-4.76.09z"/>
              </svg>
              Sign in with MetaMask
            </button>
          </div>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-slate-600 text-sm">
              Don't have an account?{" "}
              <Link to="/signup" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign up
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
    </div>
  );
}

export default Login;