import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, storage } from "./firebase/config";
import { firestoreOperations } from "./firebase/firestoreRefs";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { ethers } from "ethers";

function Profile() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    displayName: "",
    bio: "",
    dob: "",
  });
  const [profilePic, setProfilePic] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);
  const [connectingWallet, setConnectingWallet] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    // Check if user is authenticated
    if (!auth.currentUser) {
      navigate("/login");
      return;
    }

    // Fetch user data from Firestore
    fetchUserData();
  }, [navigate]);

  const fetchUserData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Check if this is a wallet-based login
      const walletLoginUserId = localStorage.getItem('walletLoginUserId');
      const userId = walletLoginUserId || user.uid;

      const result = await firestoreOperations.getUser(userId);
      
      if (result.success) {
        setUserData({ id: userId, ...result.data });
        setEditFormData({
          displayName: result.data.displayName || "",
          bio: result.data.bio || "",
          dob: result.data.dob || "",
        });
      } else {
        setError("Failed to load profile data");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleConnectWallet = async () => {
    setConnectingWallet(true);
    setError("");
    setSuccess("");

    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        setError("MetaMask is not installed. Please install MetaMask extension.");
        setConnectingWallet(false);
        return;
      }

      // Request account access
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const walletAddress = accounts[0];

      const walletLoginUserId = localStorage.getItem('walletLoginUserId');
      const userId = walletLoginUserId || auth.currentUser.uid;
      const userEmail = userData.email || auth.currentUser?.email;

      // Check if wallet is already linked to another account
      const isLinked = await firestoreOperations.isWalletLinked(walletAddress);
      
      if (isLinked) {
        // Check if it's linked to this user
        const result = await firestoreOperations.getUserByWallet(walletAddress);
        if (result.success && result.data.id !== userId) {
          setError("This wallet is already linked to another account.");
          setConnectingWallet(false);
          return;
        }
      }

      // Link wallet to user
      await firestoreOperations.linkWallet(
        walletAddress,
        userId,
        userEmail
      );

      setSuccess("Wallet connected successfully!");
      
      // Refresh user data
      await fetchUserData();
    } catch (error) {
      console.error("Wallet connection error:", error);
      setError("Failed to connect wallet. Please try again.");
    } finally {
      setConnectingWallet(false);
    }
  };

  const handleEditChange = (e) => {
    setEditFormData({
      ...editFormData,
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

  const handleSaveProfile = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const user = auth.currentUser;
      const walletLoginUserId = localStorage.getItem('walletLoginUserId');
      const userId = walletLoginUserId || user.uid;
      
      let profilePicUrl = userData.profilePicUrl || "";

      // Upload new profile picture if changed
      if (profilePic) {
        const storageRef = ref(storage, `profilePics/${userId}`);
        await uploadBytes(storageRef, profilePic);
        profilePicUrl = await getDownloadURL(storageRef);
      }

      // Update user document
      await firestoreOperations.updateUser(userId, {
        displayName: editFormData.displayName,
        bio: editFormData.bio,
        dob: editFormData.dob,
        profilePicUrl: profilePicUrl,
        updatedAt: new Date().toISOString(),
      });

      setSuccess("Profile updated successfully!");
      setIsEditing(false);
      setProfilePic(null);
      setProfilePicPreview(null);
      
      // Refresh user data
      await fetchUserData();
    } catch (error) {
      console.error("Error updating profile:", error);
      setError("Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const truncateAddress = (address) => {
    if (!address) return "Not connected";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Failed to load profile</p>
          <button
            onClick={() => navigate("/feed")}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Back to Feed
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Navigation Bar */}
      <nav className="bg-slate-900 border-b border-slate-800 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/feed" className="text-blue-400 hover:text-blue-300 font-medium">
            ← Back to Feed
          </Link>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            BlockPost
          </h1>
          <div className="w-24"></div> {/* Spacer for centering */}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-4 md:p-6">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/50 rounded-lg text-green-400 text-sm">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Profile Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 md:p-8 mb-6">
          {!isEditing ? (
            // View Mode
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Avatar */}
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center font-bold text-4xl overflow-hidden">
                {userData.profilePicUrl ? (
                  <img
                    src={userData.profilePicUrl}
                    alt={userData.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  userData.username?.[0]?.toUpperCase() || "?"
                )}
              </div>

              {/* User Info */}
              <div className="flex-1">
                <h2 className="text-3xl font-bold mb-2">
                  {userData.displayName || userData.username || "User"}
                </h2>
                <div className="flex flex-col gap-2 text-slate-400 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-300">
                      @{userData.username || "unknown"}
                    </span>
                    <span>•</span>
                    <span className="text-sm">{truncateAddress(userData.walletAddress)}</span>
                  </div>
                  <div className="text-sm">
                    Joined {new Date(userData.createdAt).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                </div>
                <p className="text-slate-300">{userData.bio || "No bio yet"}</p>
              </div>

              {/* Edit Profile Button */}
              <button
                onClick={() => setIsEditing(true)}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg font-medium transition-colors"
              >
                Edit Profile
              </button>
            </div>
          ) : (
            // Edit Mode
            <div className="space-y-6">
              <h3 className="text-xl font-bold mb-4">Edit Profile</h3>

              {/* Profile Picture Upload */}
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center overflow-hidden mb-3">
                  {profilePicPreview ? (
                    <img
                      src={profilePicPreview}
                      alt="Profile preview"
                      className="w-full h-full object-cover"
                    />
                  ) : userData.profilePicUrl ? (
                    <img
                      src={userData.profilePicUrl}
                      alt={userData.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl text-slate-500">👤</span>
                  )}
                </div>
                <label className="cursor-pointer px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-medium transition-colors">
                  Change Picture
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePicChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Edit Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Display Name</label>
                  <input
                    type="text"
                    name="displayName"
                    value={editFormData.displayName}
                    onChange={handleEditChange}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-100"
                    placeholder="Your display name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Bio</label>
                  <textarea
                    name="bio"
                    value={editFormData.bio}
                    onChange={handleEditChange}
                    rows="3"
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-100 resize-none"
                    placeholder="Tell us about yourself..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Date of Birth</label>
                  <input
                    type="date"
                    name="dob"
                    value={editFormData.dob}
                    onChange={handleEditChange}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-100"
                    max={new Date().toISOString().split("T")[0]}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setProfilePic(null);
                    setProfilePicPreview(null);
                    setEditFormData({
                      displayName: userData.displayName || "",
                      bio: userData.bio || "",
                      dob: userData.dob || "",
                    });
                  }}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Wallet Connection Section */}
        {!userData.walletLinked && !isEditing && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-bold mb-2">Connect MetaMask Wallet</h3>
            <p className="text-slate-400 text-sm mb-4">
              Connect your wallet to start posting content on BlockPost. Your wallet address
              will be linked to your account for on-chain verification.
            </p>
            <button
              onClick={handleConnectWallet}
              disabled={connectingWallet}
              className="w-full md:w-auto px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center justify-center gap-3"
            >
              <span className="text-xl">🦊</span>
              {connectingWallet ? "Connecting..." : "Connect MetaMask"}
            </button>
          </div>
        )}

        {/* Posts Section */}
        <div>
          <h3 className="text-2xl font-bold mb-4">Your posts</h3>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
            <div className="text-6xl mb-4">📝</div>
            <p className="text-slate-400 text-lg mb-2">Posts Management</p>
            <p className="text-slate-500 text-sm">
              Coming soon - IPFS integration for decentralized content storage
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Profile;
