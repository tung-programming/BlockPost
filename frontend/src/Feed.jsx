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
  const [stats, setStats] = useState({ total: 0, verified: 0, reposts: 0 });
  const [walletAccount, setWalletAccount] = useState(null);

  useEffect(() => {
    // Fetch user data to check wallet link status
    fetchUserData();
    // Fetch posts from backend
    fetchPosts();
    // Restore wallet connection from localStorage
    restoreWalletConnection();
  }, []);
  
  // Effect to fetch user data when wallet account changes
  useEffect(() => {
    if (walletAccount) {
      fetchUserDataByWallet(walletAccount);
    }
  }, [walletAccount]);

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
              const metadata = metadataResponse.data;
              
              // Fetch user info from Firestore if wallet address exists
              let userInfo = null;
              if (metadata.creator) {
                try {
                  const userResult = await firestoreOperations.getUserByWallet(metadata.creator);
                  if (userResult.success) {
                    userInfo = userResult.data;
                  }
                } catch (err) {
                  console.log('Could not fetch user info for wallet:', metadata.creator);
                }
              }
              
              console.log(`[FEED] ✓ Post ${asset.id} author:`, {
                creatorName: metadata.creatorName,
                creatorUsername: metadata.creatorUsername,
                creator: metadata.creator
              });
              
              return {
                ...asset,
                metadata,
                userInfo
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
                },
                userInfo: null
              };
            }
          })
        );
        
        // Calculate real stats
        const totalPosts = assetsWithMetadata.length;
        const verifiedOriginals = assetsWithMetadata.filter(p => p.status === 'ORIGINAL').length;
        const repostCount = assetsWithMetadata.filter(p => p.status === 'REPOST_DETECTED').length;
        
        setStats({
          total: totalPosts,
          verified: verifiedOriginals,
          reposts: repostCount
        });
        
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

  const restoreWalletConnection = async () => {
    try {
      // Check if wallet was previously connected
      const savedWalletAccount = localStorage.getItem('connectedWalletAccount');
      
      if (savedWalletAccount && window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_accounts", []);
        
        // Check if the saved account is still connected
        if (accounts.includes(savedWalletAccount)) {
          setWalletAccount(savedWalletAccount);
          console.log("Restored wallet connection:", savedWalletAccount);
        } else {
          // Clear saved wallet if not connected anymore
          localStorage.removeItem('connectedWalletAccount');
        }
      }
      
      // Set up account change listener
      if (window.ethereum && !window.ethereum._accountsChangedListenerAdded) {
        window.ethereum.on('accountsChanged', async (accounts) => {
          if (accounts.length > 0) {
            const newAccount = accounts[0];
            setWalletAccount(newAccount);
            localStorage.setItem('connectedWalletAccount', newAccount);
            console.log("Wallet account changed to:", newAccount);
          } else {
            setWalletAccount(null);
            localStorage.removeItem('connectedWalletAccount');
            console.log("Wallet disconnected");
          }
        });
        window.ethereum._accountsChangedListenerAdded = true;
      }
    } catch (error) {
      console.error("Error restoring wallet connection:", error);
    }
  };

  const fetchUserDataByWallet = async (walletAddress) => {
    try {
      console.log("Fetching user data for wallet:", walletAddress);
      const result = await firestoreOperations.getUserByWallet(walletAddress);
      
      if (result.success && result.data) {
        setUserData({ id: result.data.id, ...result.data });
        console.log("Loaded profile for wallet:", walletAddress, result.data);
      } else {
        console.log("No profile found for wallet:", walletAddress);
        // Clear user data if wallet has no profile
        setUserData(null);
      }
    } catch (error) {
      console.error("Error fetching user data by wallet:", error);
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

  const handleWalletClick = async () => {
    try {
      if (!window.ethereum) {
        alert("MetaMask is not installed. Please install MetaMask to connect your wallet.");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Always request permissions to show account selector
      try {
        await window.ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }]
        });
      } catch (permError) {
        // User cancelled - that's okay
        if (permError.code === 4001) {
          return;
        }
      }
      
      // Get the selected account
      const accounts = await provider.send("eth_requestAccounts", []);
      
      if (accounts.length > 0) {
        const selectedAccount = accounts[0];
        setWalletAccount(selectedAccount);
        // Persist wallet connection
        localStorage.setItem('connectedWalletAccount', selectedAccount);
        console.log("Connected wallet:", selectedAccount);
      }

    } catch (error) {
      console.error("Error connecting wallet:", error);
      if (error.code === 4001) {
        // User rejected - just return, don't show error
        return;
      } else {
        alert("Failed to connect wallet. Please try again.");
      }
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
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/15 blur-[80px] animate-blob" />
        <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-gradient-to-br from-purple-400/15 to-blue-400/10 blur-[80px] animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-5%] left-[30%] w-[450px] h-[450px] rounded-full bg-gradient-to-br from-blue-500/15 to-violet-400/10 blur-[80px] animate-blob animation-delay-4000" />
      </div>

      {/* 3-Column Layout Container */}
      <div className="flex h-screen relative z-10">
        {/* Left Sidebar */}
        <aside className="hidden md:flex md:w-64 bg-white/80 backdrop-blur-md border-r border-slate-200 flex-col p-4 flex-shrink-0">
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
            <span className="text-xl">✍</span>
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
            <span className="text-xl">⚙</span>
            <span className="font-medium">Settings</span>
          </a>
        </nav>

        <div className="mt-auto pt-4 border-t border-slate-200 space-y-3">
          {userData && !userData.walletLinked && (
            <button
              onClick={handleConnectWallet}
              disabled={connectingWallet}
              className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 disabled:cursor-not-allowed rounded-xl font-semibold transition-all hover:scale-105 shadow-lg text-sm flex items-center justify-center gap-2 text-white"
            >
              <span className="text-lg">🦊</span>
              {connectingWallet ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
          {walletError && (
            <p className="text-xs text-red-600 text-center">{walletError}</p>
          )}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-slate-200 disabled:cursor-not-allowed rounded-xl font-semibold transition-all hover:scale-105 shadow-lg text-sm flex items-center justify-center gap-2 text-white"
          >
            <span className="text-lg">🚪</span>
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </aside>

      {/* Main Content Column */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 p-4 flex-shrink-0">
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search posts or users..."
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
              />
            </div>
            <button 
              onClick={handleWalletClick}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-xl font-semibold transition-all hover:scale-105 shadow-lg text-white flex items-center gap-2"
            >
              <span className="text-lg">🦊</span>
              {walletAccount ? `${walletAccount.slice(0, 6)}...${walletAccount.slice(-4)}` : 'Connect Wallet'}
            </button>
          </div>
        </header>

        {/* Feed Area - Scrollable */}
        <div className="flex-1 overflow-y-auto bg-transparent">
          <div className="max-w-4xl mx-auto p-4 md:p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Feed</h2>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="font-medium">{posts.length} Post{posts.length !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {loadingPosts ? (
              <div className="flex flex-col justify-center items-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-blue-600 mb-4"></div>
                <p className="text-slate-600 font-medium">Loading posts...</p>
              </div>
            ) : postsError ? (
              <div className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-8 text-center shadow-lg">
                <div className="text-5xl mb-4">⚠️</div>
                <p className="text-red-600 font-semibold text-lg mb-2">Failed to load posts</p>
                <p className="text-red-500 text-sm mb-4">{postsError}</p>
                <button
                  onClick={fetchPosts}
                  className="px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 rounded-xl font-semibold text-white transition-all hover:scale-105 shadow-lg"
                >
                  🔄 Retry
                </button>
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-16 text-center border-2 border-blue-200 shadow-lg">
                <div className="text-7xl mb-6 animate-bounce">📭</div>
                <p className="text-slate-900 text-2xl font-bold mb-2">No posts yet</p>
                <p className="text-slate-600 text-base mb-6">Be the first to create content on BlockPost!</p>
                <button
                  onClick={() => setIsCreatePostOpen(true)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl font-semibold text-white transition-all hover:scale-105 shadow-lg inline-flex items-center gap-2"
                >
                  <span>✍️</span>
                  <span>Create First Post</span>
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {posts.map((post) => (
                  <article
                    key={post.id}
                    className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-lg hover:shadow-xl transition-all"
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

                    <div className="p-6">
                      {/* Post Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {/* Clickable Avatar */}
                          {(post.metadata?.creatorUsername || post.userInfo?.username) ? (
                            <Link to={`/user/${post.metadata?.creatorUsername || post.userInfo?.username}`}>
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center font-bold text-lg text-white shadow-md ring-2 ring-white hover:scale-110 transition-transform cursor-pointer">
                                {post.metadata?.creatorName ? post.metadata.creatorName.charAt(0).toUpperCase() :
                                 post.metadata?.creatorUsername ? post.metadata.creatorUsername.charAt(0).toUpperCase() :
                                 post.userInfo?.displayName ? post.userInfo.displayName.charAt(0).toUpperCase() :
                                 post.userInfo?.username ? post.userInfo.username.charAt(0).toUpperCase() :
                                 post.metadata?.creator ? post.metadata.creator.slice(2, 3).toUpperCase() : 'U'}
                              </div>
                            </Link>
                          ) : (
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center font-bold text-lg text-white shadow-md ring-2 ring-white">
                              {post.metadata?.creator ? post.metadata.creator.slice(2, 3).toUpperCase() : 'U'}
                            </div>
                          )}
                          
                          <div>
                            {/* Clickable Username */}
                            {(post.metadata?.creatorUsername || post.userInfo?.username) ? (
                              <Link 
                                to={`/user/${post.metadata?.creatorUsername || post.userInfo?.username}`}
                                className="font-bold text-slate-900 hover:text-blue-600 transition-colors cursor-pointer hover:underline"
                              >
                                {post.metadata?.creatorName || 
                                 post.userInfo?.displayName || 
                                 `@${post.metadata?.creatorUsername || post.userInfo?.username}`}
                              </Link>
                            ) : (
                              <div className="font-bold text-slate-900">
                                {post.metadata?.creator ? truncateAddress(post.metadata.creator) : 'Unknown Creator'}
                              </div>
                            )}
                            
                            {/* Username handle */}
                            {(post.metadata?.creatorUsername || post.userInfo?.username) && (
                              <div className="text-xs text-slate-500">
                                @{post.metadata?.creatorUsername || post.userInfo?.username}
                              </div>
                            )}
                            
                            {/* Wallet address / Timestamp */}
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                              {(post.metadata?.creatorUsername || post.userInfo?.username) && post.metadata?.creator && (
                                <span>{truncateAddress(post.metadata.creator)} • </span>
                              )}
                              <span>🕒</span>
                              {post.metadata?.createdAt ? formatTimestamp(post.metadata.createdAt) : formatTimestamp(post.timestamp)}
                            </div>
                          </div>
                        </div>
                        {/* Asset Type Badge */}
                        <div className="flex items-center gap-2">
                          {post.assetType === 'video' && (
                            <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold flex items-center gap-1">
                              🎥 Video
                            </span>
                          )}
                          {post.assetType === 'image' && (
                            <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded-lg text-xs font-semibold flex items-center gap-1">
                              🖼️ Image
                            </span>
                          )}
                          {post.assetType === 'audio' && (
                            <span className="px-2 py-1 bg-pink-50 text-pink-600 rounded-lg text-xs font-semibold flex items-center gap-1">
                              🎵 Audio
                            </span>
                          )}
                          {post.assetType === 'text' && (
                            <span className="px-2 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-semibold flex items-center gap-1">
                              📝 Text
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Post Title */}
                      {post.metadata?.title && (
                        <h3 className="text-xl font-bold mb-2 text-slate-900 leading-tight">{post.metadata.title}</h3>
                      )}

                      {/* Post Description */}
                      {post.metadata?.description && (
                        <p className="mb-4 text-slate-600 leading-relaxed">{post.metadata.description}</p>
                      )}

                      {/* IPFS Media Content */}
                      <div className="mb-4 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-inner">
                        {post.assetType === 'video' && (
                          <video
                            src={post.mediaGatewayUrl}
                            controls
                            className="w-full max-h-96 object-contain bg-black"
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
                          <div className="p-6 bg-gradient-to-br from-pink-50 to-purple-50">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-500 rounded-lg flex items-center justify-center text-2xl shadow-md">
                                🎵
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900">Audio File</div>
                                <div className="text-xs text-slate-600">{post.metadata?.fileName || 'audio.mp3'}</div>
                              </div>
                            </div>
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
                            <div className="text-4xl mb-2">📄</div>
                            <p className="text-slate-700 mb-3 font-medium">{post.metadata?.fileName || 'File'}</p>
                            <a
                              href={post.mediaGatewayUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all hover:scale-105 shadow-md"
                            >
                              <span>View on IPFS</span>
                              <span>→</span>
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Status Badge and Info */}
                      <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-slate-200">
                        <div className="flex items-center gap-3">
                          {post.status === 'ORIGINAL' && (
                            <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md flex items-center gap-1">
                              <span>✓</span>
                              <span>Original</span>
                            </span>
                          )}
                          {post.status === 'REPOST_DETECTED' && (
                            <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md flex items-center gap-1">
                              <span>⚠</span>
                              <span>Repost</span>
                            </span>
                          )}
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="font-medium">Verified via VideoGuard</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={post.mediaGatewayUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all hover:scale-105"
                            title="View media file on IPFS"
                          >
                            <span>🎬</span>
                            <span>Media</span>
                          </a>
                          <a
                            href={post.metadataGatewayUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all hover:scale-105"
                            title="View metadata JSON on IPFS"
                          >
                            <span>📋</span>
                            <span>Metadata</span>
                          </a>
                          {post.onChain && (
                            <a
                              href={`https://amoy.polygonscan.com/tx/${post.onChain.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all hover:scale-105"
                              title="View transaction on PolygonScan"
                            >
                              <span>🔗</span>
                              <span>Blockchain</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Right Sidebar */}
      <aside className="hidden xl:flex xl:w-80 bg-white/80 backdrop-blur-md border-l border-slate-200 p-6 flex-col flex-shrink-0 overflow-y-auto">
        <div className="space-y-6">
          {/* How Verification Works */}
          <div>
              <h3 className="text-lg font-bold mb-4 text-slate-900 flex items-center gap-2">
                <span className="text-2xl">🔐</span>
                How Verification Works
              </h3>
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 space-y-3 text-sm border border-blue-100 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="text-lg">🔢</span>
                  <p className="text-slate-700">
                    Every post is hashed using <span className="font-semibold text-blue-600">SHA-256</span> and <span className="font-semibold text-purple-600">perceptual hashing (pHash)</span> algorithms.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-lg">⛓️</span>
                  <p className="text-slate-700">
                    Hashes are stored on-chain for <span className="font-semibold text-green-600">permanent verification</span>.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-lg">🎯</span>
                  <p className="text-slate-700">
                    Visual and audio similarity detection helps <span className="font-semibold text-orange-600">identify duplicates</span>.
                  </p>
                </div>
              </div>
            </div>

            {/* On-Chain Stats */}
            <div>
              <h3 className="text-lg font-bold mb-4 text-slate-900 flex items-center gap-2">
                <span className="text-2xl">📊</span>
                Live Network Stats
              </h3>
              <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl p-4 space-y-3 text-sm border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                  <span className="text-slate-600 flex items-center gap-2">
                    <span className="text-blue-500">📝</span>
                    Total Posts
                  </span>
                  <span className="font-bold text-xl text-slate-900">{stats.total}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                  <span className="text-slate-600 flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    Verified Original
                  </span>
                  <span className="font-bold text-xl text-green-600">{stats.verified}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                  <span className="text-slate-600 flex items-center gap-2">
                    <span className="text-amber-500">⚠</span>
                    Reposts Detected
                  </span>
                  <span className="font-bold text-xl text-amber-600">{stats.reposts}</span>
                </div>
              </div>
              
              {/* Network Info */}
              <div className="mt-3 p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-200">
                <p className="text-xs text-slate-600 text-center">
                  <span className="font-semibold text-blue-600">Polygon Amoy Testnet</span>
                  <br/>
                  Real-time blockchain verification
                </p>
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
