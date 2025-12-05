import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "./firebase/config";
import { firestoreOperations } from "./firebase/firestoreRefs";
import { ethers } from "ethers";

function ProfileSetup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    displayName: "",
    bio: "",
    dob: "",
  });
  const [walletAddress, setWalletAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Check if user is authenticated (either Firebase Auth or wallet login)
    const walletLoginActive = localStorage.getItem('walletLoginActive');
    
    if (!auth.currentUser && walletLoginActive !== 'true') {
      navigate("/login");
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleConnectWallet = async () => {
    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        setError("MetaMask is not installed. Please install MetaMask extension.");
        return;
      }

      // Request account access - force account selection popup
      await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const address = accounts[0];

      // Check if wallet is already linked to another account
      const isLinked = await firestoreOperations.isWalletLinked(address);
      
      if (isLinked) {
        setError("This wallet is already linked to another account.");
        return;
      }

      setWalletAddress(address);
      setError("");
      console.log("Wallet connected:", address);
    } catch (error) {
      console.error("Wallet connection error:", error);
      setError("Failed to connect wallet. Please try again.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("No authenticated user found");
      }

      const walletLoginUserId = localStorage.getItem('walletLoginUserId');
      const userId = walletLoginUserId || user.uid;
      const userEmail = user.email || localStorage.getItem('walletLoginEmail');

      // Generate avatar initial from email or username
      const avatarInitial = (userEmail || formData.username).charAt(0).toUpperCase();

      // Save profile data to Firestore
      const userData = {
        username: formData.username.toLowerCase(),
        displayName: formData.displayName || formData.username,
        bio: formData.bio || "",
        dob: formData.dob,
        avatarInitial: avatarInitial,
        email: userEmail,
        profileComplete: true,
        updatedAt: new Date().toISOString(),
      };

      // Update user document
      await firestoreOperations.updateUser(userId, userData);

      // Link wallet if connected
      if (walletAddress) {
        await firestoreOperations.linkWallet(walletAddress, userId, userEmail);
      }

      console.log("Profile setup complete");
      navigate("/feed");
    } catch (error) {
      console.error("Profile setup error:", error);
      setError("Failed to complete profile setup. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // Mark as reminded later and go to feed
    navigate("/feed");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 relative overflow-hidden" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-blue-400/30 to-purple-400/20 blur-[80px] animate-blob" />
        <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-gradient-to-br from-purple-400/25 to-blue-400/15 blur-[80px] animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-5%] left-[30%] w-[450px] h-[450px] rounded-full bg-gradient-to-br from-blue-500/20 to-violet-400/15 blur-[80px] animate-blob animation-delay-4000" />
      </div>

      <div className="max-w-2xl w-full relative z-10">
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
            <h1 className="text-3xl font-bold mb-2 text-slate-900">Complete Your Profile</h1>
            <p className="text-slate-600 text-sm">
              Tell us about yourself to get started
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Preview */}
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg mb-3">
                {formData.username ? formData.username.charAt(0).toUpperCase() : (auth.currentUser?.email?.charAt(0).toUpperCase() || '?')}
              </div>
              <p className="text-sm text-slate-600 text-center">Your avatar is generated from your username</p>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                placeholder="Choose a unique username"
                required
                disabled={loading}
                pattern="[a-zA-Z0-9_]+"
                title="Username can only contain letters, numbers, and underscores"
              />
              <p className="text-xs text-slate-500 mt-1">
                This will be your @handle on BlockPost
              </p>
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700">
                Display Name
              </label>
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                placeholder="Your full name"
                disabled={loading}
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700">Bio</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows="3"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 resize-none"
                placeholder="Tell us about yourself..."
                disabled={loading}
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                required
                disabled={loading}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>

            {/* Wallet Connection */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
              <h3 className="font-semibold mb-2 text-slate-900">Connect MetaMask Wallet (Optional)</h3>
              <p className="text-sm text-slate-600 mb-4">
                Required only if you want to post content. You can connect later from your
                profile.
              </p>

              {walletAddress ? (
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                  <span className="text-green-600 text-xl">✓</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-700">Wallet Connected</p>
                    <p className="text-xs text-green-600">{walletAddress}</p>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectWallet}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-600 rounded-xl font-medium transition-all hover:scale-105 shadow-lg flex items-center justify-center gap-3 text-white"
                >
                  <span className="text-xl">🦊</span>
                  Connect MetaMask
                </button>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleSkip}
                className="flex-1 py-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl font-medium transition-all hover:shadow-md text-slate-700"
              >
                Remind Me Later
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl font-semibold transition-all hover:scale-105 shadow-lg text-white"
              >
                {loading ? "Setting up..." : "Complete Setup"}
              </button>
            </div>
          </form>

          {/* Info */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-700">
              💡 You can always update your profile and connect your wallet later from the
              Profile settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileSetup;
