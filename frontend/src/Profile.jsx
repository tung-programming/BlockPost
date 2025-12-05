import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "./firebase/config";
import { firestoreOperations } from "./firebase/firestoreRefs";
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
  const [connectingWallet, setConnectingWallet] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    // Check if user is authenticated (either Firebase Auth or wallet login)
    const walletLoginActive = localStorage.getItem('walletLoginActive');
    const walletLoginUserId = localStorage.getItem('walletLoginUserId');
    const connectedWallet = localStorage.getItem('connectedWallet');
    
    // Check MetaMask connection and sync with localStorage
    const checkWalletConnection = async () => {
      if (window.ethereum && connectedWallet) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.send("eth_accounts", []);
          if (accounts.length > 0 && accounts[0] !== connectedWallet) {
            // Wallet changed, update localStorage
            localStorage.setItem('connectedWallet', accounts[0]);
            // Try to load profile for new wallet
            const walletResult = await firestoreOperations.getUserByWallet(accounts[0]);
            if (walletResult.success && walletResult.data) {
              localStorage.setItem('walletLoginUserId', walletResult.data.id);
              localStorage.setItem('walletLoginActive', 'true');
              localStorage.setItem('walletAddress', accounts[0]);
              if (walletResult.data.email) {
                localStorage.setItem('walletLoginEmail', walletResult.data.email);
              }
              fetchUserData();
              return;
            }
          }
        } catch (error) {
          console.error('Error checking wallet connection:', error);
        }
      }
    };
    
    if (!auth.currentUser && walletLoginActive !== 'true') {
      navigate("/login");
      return;
    }
    
    if (walletLoginActive === 'true' && !walletLoginUserId) {
      // Invalid wallet session
      localStorage.clear();
      navigate("/login");
      return;
    }

    // Check wallet connection first, then fetch user data
    checkWalletConnection().then(() => {
      fetchUserData();
    });
    
    // Listen for account changes
    if (window.ethereum) {
      const handleAccountsChanged = async (accounts) => {
        if (accounts.length > 0) {
          localStorage.setItem('connectedWallet', accounts[0]);
          console.log("Wallet account changed to:", accounts[0]);
          // Try to load profile for new wallet
          try {
            const walletResult = await firestoreOperations.getUserByWallet(accounts[0]);
            if (walletResult.success && walletResult.data) {
              localStorage.setItem('walletLoginUserId', walletResult.data.id);
              localStorage.setItem('walletLoginActive', 'true');
              localStorage.setItem('walletAddress', accounts[0]);
              if (walletResult.data.email) {
                localStorage.setItem('walletLoginEmail', walletResult.data.email);
              }
              fetchUserData();
            }
          } catch (error) {
            console.log('Error loading profile for wallet:', error);
          }
        } else {
          localStorage.removeItem('connectedWallet');
          console.log("Wallet disconnected");
        }
      };
      
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, [navigate]);

  const fetchUserData = async () => {
    try {
      // Check if this is a wallet-based login
      const walletLoginUserId = localStorage.getItem('walletLoginUserId');
      const walletLoginActive = localStorage.getItem('walletLoginActive');
      
      let userId;
      
      if (walletLoginActive === 'true' && walletLoginUserId) {
        // Wallet login - use userId from localStorage
        userId = walletLoginUserId;
        console.log('Fetching profile for wallet login, userId:', userId);
      } else if (auth.currentUser) {
        // Firebase Auth login - use currentUser.uid
        userId = auth.currentUser.uid;
        console.log('Fetching profile for Firebase Auth login, userId:', userId);
      } else {
        // No valid session
        console.error('No valid session found');
        setError("No active session found");
        setLoading(false);
        return;
      }

      console.log('Calling firestoreOperations.getUser with userId:', userId);
      const result = await firestoreOperations.getUser(userId);
      console.log('Firestore result:', result);
      
      if (result.success) {
        setUserData({ id: userId, ...result.data });
        setEditFormData({
          displayName: result.data.displayName || "",
          bio: result.data.bio || "",
          dob: result.data.dob || "",
        });
        console.log('Profile data loaded successfully');
      } else {
        console.error('Failed to load profile data:', result.error);
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

      // Get userId based on login type
      const walletLoginActive = localStorage.getItem('walletLoginActive');
      const walletLoginUserId = localStorage.getItem('walletLoginUserId');
      const walletLoginEmail = localStorage.getItem('walletLoginEmail');
      
      let userId, userEmail;
      
      if (walletLoginActive === 'true' && walletLoginUserId) {
        userId = walletLoginUserId;
        userEmail = walletLoginEmail || userData.email;
      } else if (auth.currentUser) {
        userId = auth.currentUser.uid;
        userEmail = auth.currentUser.email || userData.email;
      } else {
        setError("No active session found");
        setConnectingWallet(false);
        return;
      }

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

  const handleSaveProfile = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Get userId based on login type
      const walletLoginActive = localStorage.getItem('walletLoginActive');
      const walletLoginUserId = localStorage.getItem('walletLoginUserId');
      
      let userId;
      
      if (walletLoginActive === 'true' && walletLoginUserId) {
        userId = walletLoginUserId;
      } else if (auth.currentUser) {
        userId = auth.currentUser.uid;
      } else {
        setError("No active session found");
        setLoading(false);
        return;
      }
      
      // Update user document
      await firestoreOperations.updateUser(userId, {
        displayName: editFormData.displayName,
        bio: editFormData.bio,
        dob: editFormData.dob,
        updatedAt: new Date().toISOString(),
      });

      setSuccess("Profile updated successfully!");
      setIsEditing(false);
      
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
    <div className="min-h-screen bg-slate-50 relative overflow-hidden" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/15 blur-[80px] animate-blob" />
        <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-gradient-to-br from-purple-400/15 to-blue-400/10 blur-[80px] animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-5%] left-[30%] w-[450px] h-[450px] rounded-full bg-gradient-to-br from-blue-500/15 to-violet-400/10 blur-[80px] animate-blob animation-delay-4000" />
      </div>

      {/* Navigation Bar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 p-4 relative z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/feed" className="text-blue-600 hover:text-blue-700 font-medium">
            ← Back to Feed
          </Link>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            BlockPost
          </h1>
          <div className="w-24"></div> {/* Spacer for centering */}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-4 md:p-6 relative z-10">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Profile Header */}
        <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-3xl p-6 md:p-8 mb-6 shadow-card">
          {!isEditing ? (
            // View Mode
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Avatar */}
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center font-bold text-4xl text-white overflow-hidden shadow-lg">
                {userData.avatarInitial || userData.username?.[0]?.toUpperCase() || userData.email?.[0]?.toUpperCase() || "?"}
              </div>

              {/* User Info */}
              <div className="flex-1">
                <h2 className="text-3xl font-bold mb-2 text-slate-900">
                  {userData.displayName || userData.username || "User"}
                </h2>
                <div className="flex flex-col gap-2 text-slate-600 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-700">
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
                <p className="text-slate-700">{userData.bio || "No bio yet"}</p>
              </div>

              {/* Edit Profile Button */}
              <button
                onClick={() => setIsEditing(true)}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl font-medium transition-all hover:scale-105 shadow-lg text-white"
              >
                Edit Profile
              </button>
            </div>
          ) : (
            // Edit Mode
            <div className="space-y-6">
              <h3 className="text-xl font-bold mb-4 text-slate-900">Edit Profile</h3>

              {/* Avatar Display */}
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg mb-3">
                  {userData.avatarInitial || userData.username?.[0]?.toUpperCase() || "?"}
                </div>
                <p className="text-sm text-slate-600">Avatar is generated from your username</p>
              </div>

              {/* Edit Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-700">Display Name</label>
                  <input
                    type="text"
                    name="displayName"
                    value={editFormData.displayName}
                    onChange={handleEditChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                    placeholder="Your display name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-700">Bio</label>
                  <textarea
                    name="bio"
                    value={editFormData.bio}
                    onChange={handleEditChange}
                    rows="3"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 resize-none"
                    placeholder="Tell us about yourself..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-700">Date of Birth</label>
                  <input
                    type="date"
                    name="dob"
                    value={editFormData.dob}
                    onChange={handleEditChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                    max={new Date().toISOString().split("T")[0]}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditFormData({
                      displayName: userData.displayName || "",
                      bio: userData.bio || "",
                      dob: userData.dob || "",
                    });
                  }}
                  className="flex-1 py-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl font-medium transition-all text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:bg-slate-200 disabled:cursor-not-allowed rounded-xl font-semibold transition-all shadow-lg text-white"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Wallet Connection Section */}
        {!userData.walletLinked && !isEditing && (
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-3xl p-6 mb-6 shadow-card">
            <h3 className="text-lg font-bold mb-2 text-slate-900">Connect MetaMask Wallet</h3>
            <p className="text-slate-600 text-sm mb-4">
              Connect your wallet to start posting content on BlockPost. Your wallet address
              will be linked to your account for on-chain verification.
            </p>
            <button
              onClick={handleConnectWallet}
              disabled={connectingWallet}
              className="w-full md:w-auto px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 disabled:cursor-not-allowed rounded-xl font-medium transition-all hover:scale-105 shadow-lg flex items-center justify-center gap-3 text-white"
            >
              <span className="text-xl">🦊</span>
              {connectingWallet ? "Connecting..." : "Connect MetaMask"}
            </button>
          </div>
        )}

        {/* Posts Section */}
        <div>
          <h3 className="text-2xl font-bold mb-4 text-slate-900">Your posts</h3>

          <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-3xl p-12 text-center shadow-card">
            <div className="text-6xl mb-4">📝</div>
            <p className="text-slate-700 text-lg mb-2 font-semibold">Posts Management</p>
            <p className="text-slate-600 text-sm">
              Coming soon - IPFS integration for decentralized content storage
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Profile;
