import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, storage } from "./firebase/config";
import { firestoreOperations } from "./firebase/firestoreRefs";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { ethers } from "ethers";

function ProfileSetup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    displayName: "",
    bio: "",
    dob: "",
  });
  const [profilePic, setProfilePic] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Check if user is authenticated
    if (!auth.currentUser) {
      navigate("/login");
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePic(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
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

      let profilePicUrl = "";

      // Upload profile picture if provided
      if (profilePic) {
        const storageRef = ref(storage, `profilePics/${userId}`);
        await uploadBytes(storageRef, profilePic);
        profilePicUrl = await getDownloadURL(storageRef);
      }

      // Prepare user data
      const userData = {
        username: formData.username.toLowerCase(),
        displayName: formData.displayName || formData.username,
        bio: formData.bio || "",
        dob: formData.dob,
        profilePicUrl: profilePicUrl,
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
      <div className="max-w-2xl w-full">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Complete Your Profile</h1>
            <p className="text-slate-400 text-sm">
              Tell us about yourself to get started
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Picture */}
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center overflow-hidden mb-3">
                {profilePicPreview ? (
                  <img
                    src={profilePicPreview}
                    alt="Profile preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl text-slate-500">👤</span>
                )}
              </div>
              <label className="cursor-pointer px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-medium transition-colors">
                Upload Profile Picture (Optional)
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePicChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Username <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-100"
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
              <label className="block text-sm font-medium mb-2">
                Display Name
              </label>
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-100"
                placeholder="Your full name"
                disabled={loading}
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium mb-2">Bio</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows="3"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-100 resize-none"
                placeholder="Tell us about yourself..."
                disabled={loading}
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Date of Birth <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-100"
                required
                disabled={loading}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>

            {/* Wallet Connection */}
            <div className="border border-slate-700 rounded-lg p-4 bg-slate-800/50">
              <h3 className="font-semibold mb-2">Connect MetaMask Wallet (Optional)</h3>
              <p className="text-sm text-slate-400 mb-4">
                Required only if you want to post content. You can connect later from your
                profile.
              </p>

              {walletAddress ? (
                <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/50 rounded-lg">
                  <span className="text-green-400 text-xl">✓</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-400">Wallet Connected</p>
                    <p className="text-xs text-green-400/70">{walletAddress}</p>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectWallet}
                  className="w-full py-3 bg-orange-600 hover:bg-orange-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-3"
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
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg font-medium transition-colors"
              >
                Remind Me Later
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
              >
                {loading ? "Setting up..." : "Complete Setup"}
              </button>
            </div>
          </form>

          {/* Info */}
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/50 rounded-lg">
            <p className="text-sm text-blue-400">
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
