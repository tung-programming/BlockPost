import { useState, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "./firebase/config";
import { firestoreOperations } from "./firebase/firestoreRefs";
import { ethers } from "ethers";
import axios from "axios";
import CreatePost from "./CreatePost";

function Feed() {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [userData, setUserData] = useState(null);
  const [connectingWallet, setConnectingWallet] = useState(false);
  const [walletError, setWalletError] = useState("");
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [postsError, setPostsError] = useState("");
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);

  useEffect(() => {
    // Fetch user data to check wallet link status
    fetchUserData();
    // Fetch posts from backend
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoadingPosts(true);
      setPostsError("");
      
      const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      const response = await axios.get(`${API_URL}/posts`);
      
      if (response.data.success) {
        setPosts(response.data.posts);
        console.log(`Fetched ${response.data.posts.length} posts from backend`);
      } else {
        setPostsError('Failed to load posts');
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      setPostsError('Failed to connect to backend');
    } finally {
      setLoadingPosts(false);
    }
  };

  const fetchUserData = async () => {
    try {
      const walletLoginActive = localStorage.getItem('walletLoginActive');
      const walletLoginUserId = localStorage.getItem('walletLoginUserId');
      
      let userId;
      
      if (walletLoginActive === 'true' && walletLoginUserId) {
        userId = walletLoginUserId;
      } else if (auth.currentUser) {
        userId = auth.currentUser.uid;
      } else {
        return;
      }

      const result = await firestoreOperations.getUser(userId);
      
      if (result.success) {
        setUserData({ id: userId, ...result.data });
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const handleConnectWallet = async () => {
    setConnectingWallet(true);
    setWalletError("");

    try {
      if (!window.ethereum) {
        setWalletError("MetaMask is not installed");
        setConnectingWallet(false);
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const walletAddress = accounts[0];

      const walletLoginActive = localStorage.getItem('walletLoginActive');
      const walletLoginUserId = localStorage.getItem('walletLoginUserId');
      const walletLoginEmail = localStorage.getItem('walletLoginEmail');
      
      let userId, userEmail;
      
      if (walletLoginActive === 'true' && walletLoginUserId) {
        userId = walletLoginUserId;
        userEmail = walletLoginEmail || userData?.email;
      } else if (auth.currentUser) {
        userId = auth.currentUser.uid;
        userEmail = auth.currentUser.email || userData?.email;
      } else {
        setWalletError("No active session");
        setConnectingWallet(false);
        return;
      }

      const isLinked = await firestoreOperations.isWalletLinked(walletAddress);
      
      if (isLinked) {
        const result = await firestoreOperations.getUserByWallet(walletAddress);
        if (result.success && result.data.id !== userId) {
          setWalletError("Wallet linked to another account");
          setConnectingWallet(false);
          return;
        }
      }

      await firestoreOperations.linkWallet(walletAddress, userId, userEmail);
      await fetchUserData();
      
      // Clear error after 3 seconds if success
      setTimeout(() => setWalletError(""), 3000);
    } catch (error) {
      console.error("Wallet connection error:", error);
      setWalletError("Failed to connect wallet");
    } finally {
      setConnectingWallet(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      // Check if this is a wallet login or Firebase Auth login
      const walletLoginActive = localStorage.getItem('walletLoginActive');
      
      if (walletLoginActive === 'true') {
        // Wallet login - just clear localStorage
        localStorage.removeItem('walletLoginUserId');
        localStorage.removeItem('walletAddress');
        localStorage.removeItem('walletLoginEmail');
        localStorage.removeItem('walletLoginActive');
      } else {
        // Firebase Auth login - sign out properly
        await signOut(auth);
      }
      
      console.log("User logged out");
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
      alert("Failed to logout. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      ORIGINAL: "bg-green-600/20 text-green-400 border-green-600",
      EXACT_DUPLICATE: "bg-red-600/20 text-red-400 border-red-600",
      VISUAL_MATCH: "bg-amber-600/20 text-amber-400 border-amber-600",
      AUDIO_MATCH: "bg-purple-600/20 text-purple-400 border-purple-600",
    };

    const labels = {
      ORIGINAL: "Original on-chain",
      EXACT_DUPLICATE: "Exact duplicate detected",
      VISUAL_MATCH: "Visual match (pHash)",
      AUDIO_MATCH: "Audio match",
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const truncateAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Sidebar */}
      <aside className="hidden md:flex md:w-64 bg-slate-900 border-r border-slate-800 flex-col p-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            BlockPost
          </h1>
        </div>

        <nav className="flex-1 space-y-2">
          <NavLink
            to="/feed"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800"
              }`
            }
          >
            <span className="text-xl">🏠</span>
            <span className="font-medium">Home</span>
          </NavLink>

          <button 
            onClick={() => setIsCreatePostOpen(true)}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors w-full text-left"
          >
            <span className="text-xl">✍️</span>
            <span className="font-medium">Post</span>
          </button>

          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800"
              }`
            }
          >
            <span className="text-xl">👤</span>
            <span className="font-medium">Profile</span>
          </NavLink>

          <a
            href="#"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <span className="text-xl">⚙️</span>
            <span className="font-medium">Settings</span>
          </a>
        </nav>

        <div className="mt-auto pt-4 border-t border-slate-800 space-y-3">
          {userData && !userData.walletLinked && (
            <button
              onClick={handleConnectWallet}
              disabled={connectingWallet}
              className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors text-sm flex items-center justify-center gap-2"
            >
              <span className="text-lg">🦊</span>
              {connectingWallet ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
          {walletError && (
            <p className="text-xs text-red-400 text-center">{walletError}</p>
          )}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors text-sm flex items-center justify-center gap-2"
          >
            <span className="text-lg">🚪</span>
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Navbar */}
        <header className="bg-slate-900 border-b border-slate-800 p-4">
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search posts or users..."
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button className="px-4 py-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-lg font-medium transition-colors">
              Wallet
            </button>
          </div>
        </header>

        {/* Feed Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4 md:p-6">
            <h2 className="text-2xl font-bold mb-6">Feed</h2>

            {loadingPosts ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : postsError ? (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-6 text-center">
                <p className="text-red-400">{postsError}</p>
                <button
                  onClick={fetchPosts}
                  className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium"
                >
                  Retry
                </button>
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-slate-800/50 rounded-lg p-12 text-center">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-slate-400 text-lg">No posts yet</p>
                <p className="text-slate-500 text-sm mt-2">Be the first to create content!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {posts.map((post) => (
                  <article
                    key={post.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-6"
                  >
                    {/* Post Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center font-bold text-lg">
                          {post.walletAddress.slice(2, 3).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold hover:text-blue-400 transition-colors">
                            {truncateAddress(post.walletAddress)}
                          </div>
                          <div className="text-xs text-slate-500">
                            IPFS: {post.ipfsCid.substring(0, 8)}...
                          </div>
                        </div>
                      </div>
                      <span className="text-sm text-slate-400">{formatTimestamp(post.timestamp)}</span>
                    </div>

                    {/* Post Caption */}
                    {post.caption && (
                      <p className="mb-4 text-slate-200">{post.caption}</p>
                    )}

                    {/* IPFS Media Content */}
                    <div className="mb-4 bg-slate-800 rounded-lg overflow-hidden">
                      {post.assetType === 'video' && (
                        <video
                          src={post.gatewayUrl}
                          controls
                          className="w-full max-h-96 object-contain"
                          preload="metadata"
                        >
                          Your browser does not support video playback.
                        </video>
                      )}
                      {post.assetType === 'image' && (
                        <img
                          src={post.gatewayUrl}
                          alt={post.fileName}
                          className="w-full max-h-96 object-contain"
                        />
                      )}
                      {post.assetType === 'audio' && (
                        <div className="p-6">
                          <audio
                            src={post.gatewayUrl}
                            controls
                            className="w-full"
                          >
                            Your browser does not support audio playback.
                          </audio>
                        </div>
                      )}
                      {!['video', 'image', 'audio'].includes(post.assetType) && (
                        <div className="p-6 text-center">
                          <p className="text-slate-400 mb-2">📄 {post.fileName}</p>
                          <a
                            href={post.gatewayUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-sm"
                          >
                            View on IPFS →
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Status Badge and Info */}
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        {getStatusBadge(post.status)}
                        <span className="text-xs text-slate-500">
                          Verified via VideoGuard
                        </span>
                      </div>
                      <a
                        href={post.gatewayUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        🔗 IPFS
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar (Optional) */}
        <aside className="hidden xl:block xl:w-80 bg-slate-900 border-l border-slate-800 p-6">
          <div className="sticky top-6">
            <h3 className="text-lg font-bold mb-4">How Verification Works</h3>
            <div className="bg-slate-800/50 rounded-lg p-4 space-y-3 text-sm">
              <p className="text-slate-300">
                Every post is hashed using SHA-256 and perceptual hashing (pHash) algorithms.
              </p>
              <p className="text-slate-300">
                Hashes are stored on-chain for permanent verification.
              </p>
              <p className="text-slate-300">
                Visual and audio similarity detection helps identify duplicates.
              </p>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-bold mb-4">On-Chain Stats</h3>
              <div className="bg-slate-800/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Posts</span>
                  <span className="font-semibold">1,234</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Verified Original</span>
                  <span className="font-semibold text-green-400">892</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Duplicates Found</span>
                  <span className="font-semibold text-red-400">342</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Create Post Modal */}
      <CreatePost
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
        onPostCreated={fetchPosts}
      />
    </div>
  );
}

export default Feed;
