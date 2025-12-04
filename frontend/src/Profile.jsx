import { Link } from "react-router-dom";

// TODO: Integrate wallet connection (MetaMask) and show real on-chain address.

const currentUser = {
  username: "VTG",
  handle: "vtg",
  address: "0x1234567890abcdef1234567890abcdef12345678",
  bio: "Blockchain enthusiast | Web3 developer | Building the future of social media",
  joinedDate: "November 2024",
};

const userPosts = [
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
    id: 5,
    authorHandle: "vtg",
    authorAddress: "0x1234567890abcdef1234567890abcdef12345678",
    timestamp: "1 week ago",
    status: "ORIGINAL",
    caption: "Excited to be part of this hackathon! Building BlockPost 🔥",
    mediaUrl: null,
  },
];

function Profile() {
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
        {/* Profile Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center font-bold text-4xl">
              {currentUser.username[0].toUpperCase()}
            </div>

            {/* User Info */}
            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-2">{currentUser.username}</h2>
              <div className="flex flex-col gap-2 text-slate-400 mb-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-300">@{currentUser.handle}</span>
                  <span>•</span>
                  <span className="text-sm">{truncateAddress(currentUser.address)}</span>
                </div>
                <div className="text-sm">
                  Joined {currentUser.joinedDate}
                </div>
              </div>
              <p className="text-slate-300">{currentUser.bio}</p>
            </div>

            {/* Edit Profile Button */}
            <button className="px-6 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg font-medium transition-colors">
              Edit Profile
            </button>
          </div>
        </div>

        {/* Posts Section */}
        <div>
          <h3 className="text-2xl font-bold mb-4">Your posts</h3>

          {userPosts.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
              <p className="text-slate-400 text-lg">No posts yet</p>
              <p className="text-slate-500 text-sm mt-2">Create your first post to get started!</p>
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
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center font-bold">
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
      </main>
    </div>
  );
}

export default Profile;
