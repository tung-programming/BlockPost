// Firestore collection and document paths
export const FirestorePaths = {
  // Users collection
  USERS: "users",
  
  // Posts collection
  POSTS: "posts",
  
  // Wallet mappings collection
  WALLET_MAPPINGS: "walletMappings",
  
  // User profiles subcollection
  USER_PROFILES: (userId) => `users/${userId}/profile`,
  
  // User posts subcollection
  USER_POSTS: (userId) => `users/${userId}/posts`,
};

export default FirestorePaths;
