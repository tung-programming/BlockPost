import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { firestoreOperations } from "./firebase/firestoreRefs";
import axios from "axios";

function OtherProfile() {
  const { handle } = useParams();
  const [userData, setUserData] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchUserProfile();
  }, [handle]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError("");

      // Fetch user data from Firestore by username
      const userResult = await firestoreOperations.getUserByUsername(handle);
      
      if (userResult.success && userResult.data) {
        setUserData({
          id: userResult.data.id,
          username: userResult.data.username,
          displayName: userResult.data.displayName,
          bio: userResult.data.bio,
          avatarInitial: userResult.data.avatarInitial,
          walletAddress: userResult.data.walletAddress,
          email: userResult.data.email,
          createdAt: userResult.data.createdAt,
        });

        // Fetch posts from backend and filter by wallet address
        const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
        const response = await axios.get(`${API_URL}/posts`);
        
        if (response.data.success) {
          // Filter posts by this user's wallet address
          const filteredPosts = response.data.posts.filter(
            post => post.walletAddress.toLowerCase() === userResult.data.walletAddress?.toLowerCase()
          );
          setUserPosts(filteredPosts);
        }
      } else {
        setError("User not found");
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setError("Failed to load profile");
    } finally {
      setLoading(false);
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
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : error || !userData ? (
          // User not found
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-3xl p-12 text-center shadow-card">
            <div className="text-6xl mb-4">👤</div>
            <h2 className="text-2xl font-bold mb-2 text-slate-900">User Not Found</h2>
            <p className="text-slate-600 mb-6">
              {error || `No user found with handle @${handle}`}
            </p>
            <Link
              to="/feed"
              className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl font-medium transition-all hover:scale-105 shadow-lg text-white"
            >
              Back to Feed
            </Link>
          </div>
        ) : (
          <>
            {/* Profile Header */}
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-3xl p-6 md:p-8 mb-6 shadow-card">
              <div className="mb-4">
                <p className="text-slate-600 text-sm mb-2">Viewing profile of</p>
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                  {/* Avatar */}
                  <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center font-bold text-4xl text-white shadow-lg">
                    {userData.avatarInitial || userData.username?.[0]?.toUpperCase() || "?"}
                  </div>

                  {/* User Info */}
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold mb-2 text-slate-900">{userData.displayName || userData.username}</h2>
                    <div className="flex flex-col gap-2 text-slate-600 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-700">@{userData.username}</span>
                        {userData.walletAddress && (
                          <>
                            <span>•</span>
                            <span className="text-sm">{truncateAddress(userData.walletAddress)}</span>
                          </>
                        )}
                      </div>
                      {userData.createdAt && (
                        <div className="text-sm">Joined {new Date(userData.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
                      )}
                    </div>
                    <p className="text-slate-700">{userData.bio || "No bio yet"}</p>
                  </div>

                  {/* Follow Button */}
                  <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl font-medium transition-all hover:scale-105 shadow-lg text-white">
                    Follow
                  </button>
                </div>
              </div>
            </div>

            {/* Posts Section */}
            <div>
              <h3 className="text-2xl font-bold mb-4 text-slate-900">
                Posts by @{handle}
              </h3>

              {userPosts.length === 0 ? (
                <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-3xl p-12 text-center shadow-card">
                  <p className="text-slate-600 text-lg">No posts yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userPosts.map((post) => (
                    <article
                      key={post.id}
                      className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-6 shadow-soft hover:shadow-card transition-all"
                    >
                      {/* Post Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center font-bold text-white">
                            {userData.avatarInitial || userData.username?.[0]?.toUpperCase() || "?"}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">@{userData.username}</div>
                            <div className="text-sm text-slate-600">
                              IPFS: {post.ipfsCid.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                        <span className="text-sm text-slate-500">{formatTimestamp(post.timestamp)}</span>
                      </div>

                      {/* Post Title */}
                      {post.title && (
                        <h4 className="text-lg font-bold mb-2 text-slate-900">{post.title}</h4>
                      )}

                      {/* Post Description */}
                      {post.description && (
                        <p className="mb-4 text-slate-700">{post.description}</p>
                      )}

                      {/* IPFS Media Content */}
                      <div className="mb-4 bg-slate-100 rounded-xl overflow-hidden">
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
                            <p className="text-slate-700 mb-2">📄 {post.fileName}</p>
                            <a
                              href={post.gatewayUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                              View on IPFS →
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Status Badge */}
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
          </>
        )}
      </main>
    </div>
  );
}

export default OtherProfile;
