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
  const [postsWithUsernames, setPostsWithUsernames] = useState([]);

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
      const response = await axios.get(`${API_URL}/assets`);
      
      if (response.data.success) {
        console.log('[FEED] Backend response:', response.data);
        console.log('[FEED] Number of assets received:', response.data.assets?.length || 0);
        console.log('[FEED] Asset types:', response.data.assets?.map(a => a.assetType).join(', '));
        
        // Fetch metadata JSON for each asset from IPFS
        const assetsWithMetadata = await Promise.all(
          response.data.assets.map(async (asset) => {
            try {
              console.log(`[FEED] Fetching metadata for ${asset.id} from ${asset.metadataGatewayUrl}`);
              // Fetch metadata JSON from IPFS
              const metadataResponse = await axios.get(asset.metadataGatewayUrl);
              console.log(`[FEED] Metadata received for ${asset.id}:`, metadataResponse.data);
              return {
                ...asset,
                metadata: metadataResponse.data
              };
            } catch (err) {
              console.error(`[FEED] Failed to fetch metadata for ${asset.id}:`, err);
              // Return asset without metadata if fetch fails
              return {
                ...asset,
                metadata: {
                  creator: 'Unknown',
                  createdAt: asset.timestamp,
                  assetType: asset.assetType,
                  title: null,
                  description: null
                }
              };
            }
          })
        );
        
        console.log('[FEED] ✓ Final posts with metadata:', assetsWithMetadata);
        setPosts(assetsWithMetadata);
        console.log(`[FEED] Fetched ${assetsWithMetadata.length} assets with metadata from backend`);
      } else {
        setPostsError('Failed to load assets');
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
      setPostsError('Failed to connect to backend');
    } finally {
      setLoadingPosts(false);
    }
  };

  const enrichPostsWithUsernames = async (posts) => {
    try {
      const enrichedPosts = await Promise.all(
        posts.map(async (post) => {
          try {
            // Try to get user by wallet address
            const result = await firestoreOperations.getUserByWallet(post.walletAddress);
            if (result.success && result.data) {
              return {
                ...post,
                username: result.data.username || null,
                displayName: result.data.displayName || null
              };
            }
          } catch (error) {
            console.error(`Error fetching username for ${post.walletAddress}:`, error);
          }
          return {
            ...post,
            username: null,
            displayName: null
          };
        })
      );
      setPostsWithUsernames(enrichedPosts);
    } catch (error) {
      console.error('Error enriching posts with usernames:', error);
      setPostsWithUsernames(posts.map(post => ({ ...post, username: null, displayName: null })));
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
      ORIGINAL: "bg-green-50 text-green-700 border-green-200",
      EXACT_DUPLICATE: "bg-red-50 text-red-700 border-red-200",
      VISUAL_MATCH: "bg-amber-50 text-amber-700 border-amber-200",
      AUDIO_MATCH: "bg-purple-50 text-purple-700 border-purple-200",
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
    <div className="min-h-screen flex bg-slate-50" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/15 blur-[80px] animate-blob" />
        <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-gradient-to-br from-purple-400/15 to-blue-400/10 blur-[80px] animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-5%] left-[30%] w-[450px] h-[450px] rounded-full bg-gradient-to-br from-blue-500/15 to-violet-400/10 blur-[80px] animate-blob animation-delay-4000" />
      </div>

      {/* Left Sidebar */}
      <aside className="hidden md:flex md:w-64 bg-white/80 backdrop-blur-md border-r border-slate-200 flex-col p-4 relative z-10">
        <div className="mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center font-bold text-lg text-white">
              B
            </div>
            <h1 className="text-2xl font-bold text-blue-600">
              BlockPost
            </h1>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <NavLink
            to="/feed"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-700 hover:bg-slate-100"
              }`
            }
          >
            <span className="text-xl">🏠</span>
            <span className="font-medium">Home</span>
          </NavLink>

          <button 
            onClick={() => setIsCreatePostOpen(true)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 hover:bg-slate-100 transition-all w-full text-left"
          >
            <span className="text-xl">✍️</span>
            <span className="font-medium">Post</span>
          </button>

          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-700 hover:bg-slate-100"
              }`
            }
          >
            <span className="text-xl">👤</span>
            <span className="font-medium">Profile</span>
          </NavLink>

          <a
            href="#"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 hover:bg-slate-100 transition-all"
          >
            <span className="text-xl">⚙️</span>
            <span className="font-medium">Settings</span>
          </a>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 disabled:bg-slate-200 disabled:cursor-not-allowed transition-all hover:scale-105 shadow-lg text-white w-full"
          >
            <span className="text-xl">🚪</span>
            <span className="font-medium">{loggingOut ? "Logging out..." : "Logout"}</span>
          </button>
        </nav>

        {/* On-Chain Stats */}
        <div className="mt-4 px-2">
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-900 mb-3">On-Chain Stats</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600">Total Posts</span>
                <span className="text-sm font-bold text-slate-900">1,234</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600">Verified Original</span>
                <span className="text-sm font-bold text-green-600">892</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600">Duplicates Found</span>
                <span className="text-sm font-bold text-red-600">342</span>
              </div>
            </div>
          </div>
        </div>

        {/* Wallet Connect Button (if needed) */}
        {userData && !userData.walletLinked && (
          <div className="px-2 mt-4">
            <button
              onClick={handleConnectWallet}
              disabled={connectingWallet}
              className="w-full px-4 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 disabled:cursor-not-allowed rounded-xl font-semibold transition-all hover:scale-105 shadow-lg text-sm flex items-center justify-center gap-2 text-white"
            >
              <span className="text-lg">🦊</span>
              {connectingWallet ? "Connecting..." : "Connect Wallet"}
            </button>
            {walletError && (
              <p className="text-xs text-red-600 text-center mt-2">{walletError}</p>
            )}
          </div>
        )}

        {/* How Verification Works */}
        <div className="mt-auto pt-4 px-2">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <h3 className="text-xs font-bold text-slate-900 mb-3 text-center">How Verification Works</h3>
            <div className="space-y-2 text-xs text-slate-600 text-center">
              <p>Every post is hashed using SHA-256 and perceptual hashing (pHash)</p>
              <p>Hashes stored on-chain for permanent verification</p>
              <p>Visual and audio similarity detection identifies duplicates</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 text-center mt-3">© 2025 BlockPost</p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* Top Navbar */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 p-4">
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search posts or users..."
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
              />
            </div>
            <button className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl font-medium transition-all hover:shadow-md text-slate-700">
              Wallet
            </button>
          </div>
        </header>

        {/* Feed Area */}
        <main className="flex-1 overflow-y-auto bg-transparent">
          <div className="max-w-4xl mx-auto p-4 md:p-6">
            <h2 className="text-2xl font-bold mb-6 text-slate-900">Feed</h2>

            {loadingPosts ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : postsError ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                <p className="text-red-600">{postsError}</p>
                <button
                  onClick={fetchPosts}
                  className="mt-4 px-6 py-2 bg-red-500 hover:bg-red-600 rounded-xl font-medium text-white transition-all hover:scale-105 shadow-lg"
                >
                  Retry
                </button>
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-12 text-center border border-slate-200 shadow-soft">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-slate-700 text-lg font-semibold">No posts yet</p>
                <p className="text-slate-500 text-sm mt-2">Be the first to create content!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {postsWithUsernames.map((post) => (
                  <article
                    key={post.id}
                    className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-6 shadow-soft hover:shadow-card transition-all"
                  >
                    {/* Repost Banner */}
                    {post.status === 'REPOST_DETECTED' && post.repost && (
                      <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold">
                          <span>⚠️</span>
                          <span>Repost of original content by {truncateAddress(post.repost.originalCreator)}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {post.repost.matchType} • {post.repost.confidence}% confidence
                        </div>
                      </div>
                    )}

                    {/* Post Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {post.username ? (
                          <Link to={`/user/${post.username}`}>
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center font-bold text-lg text-white hover:scale-110 transition-transform cursor-pointer">
                              {post.username.charAt(0).toUpperCase()}
                            </div>
                          </Link>
                        ) : (
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center font-bold text-lg text-white">
                            {post.walletAddress.slice(2, 3).toUpperCase()}
                          </div>
                        )}
                        <div>
                          {post.username ? (
                            <Link 
                              to={`/user/${post.username}`}
                              className="font-semibold hover:text-blue-600 transition-colors text-slate-900 hover:underline"
                            >
                              @{post.username}
                            </Link>
                          ) : (
                            <div className="font-semibold text-slate-900">
                              {truncateAddress(post.walletAddress)}
                            </div>
                          )}
                          <div className="text-xs text-slate-500">
                            {post.username ? truncateAddress(post.walletAddress) : `IPFS: ${post.ipfsCid.substring(0, 8)}...`}
                          </div>
                        </div>
                      </div>
                      <span className="text-sm text-slate-500">{formatTimestamp(post.timestamp)}</span>
                    </div>

                    {/* Post Title */}
                    {post.title && (
                      <h3 className="text-xl font-bold mb-2 text-slate-900">{post.title}</h3>
                    )}

                    {/* Post Description */}
                    {post.description && (
                      <p className="mb-4 text-slate-700">{post.description}</p>
                    )}

                    {/* IPFS Media Content */}
                    <div className="mb-4 bg-slate-100 rounded-xl overflow-hidden">
                      {post.assetType === 'video' && (
                        <video
                          src={post.mediaGatewayUrl}
                          controls
                          className="w-full max-h-96 object-contain"
                          preload="metadata"
                        >
                          Your browser does not support video playback.
                        </video>
                      )}
                      {post.assetType === 'image' && (
                        <img
                          src={post.mediaGatewayUrl}
                          alt={post.metadata?.title || post.metadata?.fileName || 'Image'}
                          className="w-full max-h-96 object-contain"
                        />
                      )}
                      {post.assetType === 'audio' && (
                        <div className="p-6">
                          <audio
                            src={post.mediaGatewayUrl}
                            controls
                            className="w-full"
                          >
                            Your browser does not support audio playback.
                          </audio>
                        </div>
                      )}
                      {!['video', 'image', 'audio'].includes(post.assetType) && (
                        <div className="p-6 text-center">
                          <p className="text-slate-700 mb-2">📄 {post.fileName}</p>
                          <a
                            href={post.mediaGatewayUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
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
                        <span className="text-xs text-slate-600">
                          Verified via VideoGuard
                        </span>
                      </div>
                      <a
                        href={post.gatewayUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
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
