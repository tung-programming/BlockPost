import { useParams, Link } from "react-router-dom";

// Simulated posts database
const allPosts = [
  {
    id: 1,
    authorHandle: "vtg",
    authorAddress: "0x1234567890abcdef1234567890abcdef12345678",
    timestamp: "2 hours ago",
    status: "ORIGINAL",
    caption: "Just launched my first Web3 social media post! 🚀",
    mediaUrl: null,
  },
  {
    id: 2,
    authorHandle: "alice_dev",
    authorAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
    timestamp: "5 hours ago",
    status: "VISUAL_MATCH",
    caption: "Check out this amazing blockchain visualization",
    mediaUrl: null,
  },
  {
    id: 3,
    authorHandle: "bob_creator",
    authorAddress: "0x9876543210fedcba9876543210fedcba98765432",
    timestamp: "1 day ago",
    status: "EXACT_DUPLICATE",
    caption: "Web3 is the future of social media",
    mediaUrl: null,
  },
  {
    id: 4,
    authorHandle: "crypto_fan",
    authorAddress: "0xfedcba9876543210fedcba9876543210fedcba98",
    timestamp: "2 days ago",
    status: "AUDIO_MATCH",
    caption: "New podcast episode about blockchain technology",
    mediaUrl: null,
  },
  {
    id: 6,
    authorHandle: "alice_dev",
    authorAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
    timestamp: "3 days ago",
    status: "ORIGINAL",
    caption: "Building the future, one block at a time ⛓️",
    mediaUrl: null,
  },
];

function OtherProfile() {
  const { handle } = useParams();

  // Filter posts by handle
  const userPosts = allPosts.filter((post) => post.authorHandle === handle);

  // Simulate user data from first post
  const userData = userPosts.length > 0
    ? {
        handle: userPosts[0].authorHandle,
        address: userPosts[0].authorAddress,
        username: userPosts[0].authorHandle.toUpperCase(),
        bio: "Web3 enthusiast | Content creator | Blockchain advocate",
        joinedDate: "October 2024",
      }
    : null;

  const truncateAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
        {!userData ? (
          // User not found
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
            <div className="text-6xl mb-4">👤</div>
            <h2 className="text-2xl font-bold mb-2">User Not Found</h2>
            <p className="text-slate-400 mb-6">
              No user found with handle @{handle}
            </p>
            <Link
              to="/feed"
              className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
            >
              Back to Feed
            </Link>
          </div>
        ) : (
          <>
            {/* Profile Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 md:p-8 mb-6">
              <div className="mb-4">
                <p className="text-slate-400 text-sm mb-2">Viewing profile of</p>
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                  {/* Avatar */}
                  <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center font-bold text-4xl">
                    {userData.username[0].toUpperCase()}
                  </div>

                  {/* User Info */}
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold mb-2">{userData.username}</h2>
                    <div className="flex flex-col gap-2 text-slate-400 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-300">@{userData.handle}</span>
                        <span>•</span>
                        <span className="text-sm">{truncateAddress(userData.address)}</span>
                      </div>
                      <div className="text-sm">Joined {userData.joinedDate}</div>
                    </div>
                    <p className="text-slate-300">{userData.bio}</p>
                  </div>

                  {/* Follow Button */}
                  <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors">
                    Follow
                  </button>
                </div>
              </div>
            </div>

            {/* Posts Section */}
            <div>
              <h3 className="text-2xl font-bold mb-4">
                Posts by @{handle}
              </h3>

              {userPosts.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
                  <p className="text-slate-400 text-lg">No posts yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userPosts.map((post) => (
                    <article
                      key={post.id}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-6"
                    >
                      {/* Post Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center font-bold">
                            {post.authorHandle[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold">@{post.authorHandle}</div>
                            <div className="text-sm text-slate-400">
                              {truncateAddress(post.authorAddress)}
                            </div>
                          </div>
                        </div>
                        <span className="text-sm text-slate-400">{post.timestamp}</span>
                      </div>

                      {/* Post Content */}
                      <p className="mb-4 text-slate-200">{post.caption}</p>

                      {/* Media Placeholder */}
                      {post.mediaUrl && (
                        <div className="mb-4 bg-slate-800 rounded-lg h-48 flex items-center justify-center text-slate-500">
                          Video/Image placeholder
                        </div>
                      )}

                      {/* Status Badge */}
                      <div className="flex items-center gap-3 flex-wrap">
                        {getStatusBadge(post.status)}
                        <span className="text-xs text-slate-500">
                          Verified via VideoGuard backend
                        </span>
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
