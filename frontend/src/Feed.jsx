import { Link, NavLink } from "react-router-dom";

// TODO: Replace dummyPosts with data from backend API:
// GET `${import.meta.env.VITE_API_BASE_URL}/posts`

// TODO: Integrate wallet connection (MetaMask) and show real on-chain address.

const dummyPosts = [
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
];

function Feed() {
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

          <button className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors w-full text-left">
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

        <div className="mt-auto pt-4 border-t border-slate-800">
          <button className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors text-sm">
            Connect Wallet
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

            <div className="space-y-6">
              {dummyPosts.map((post) => (
                <article
                  key={post.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-6"
                >
                  {/* Post Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center font-bold text-lg">
                        {post.authorHandle[0].toUpperCase()}
                      </div>
                      <div>
                        <Link
                          to={`/user/${post.authorHandle}`}
                          className="font-semibold hover:text-blue-400 transition-colors"
                        >
                          @{post.authorHandle}
                        </Link>
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
                    <div className="mb-4 bg-slate-800 rounded-lg h-64 flex items-center justify-center text-slate-500">
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
    </div>
  );
}

export default Feed;
