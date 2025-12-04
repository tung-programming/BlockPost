import { collection, doc, setDoc, getDoc, updateDoc, getDocs } from "firebase/firestore";
import { db } from "./config";
import FirestorePaths from "./FirestorePaths";

// Firestore reference helpers
export const firestoreRefs = {
  // Get users collection reference
  usersCollection: () => collection(db, FirestorePaths.USERS),
  
  // Get specific user document reference
  userDoc: (userId) => doc(db, FirestorePaths.USERS, userId),
  
  // Get posts collection reference
  postsCollection: () => collection(db, FirestorePaths.POSTS),
  
  // Get specific post document reference
  postDoc: (postId) => doc(db, FirestorePaths.POSTS, postId),
  
  // Get wallet mappings collection reference
  walletMappingsCollection: () => collection(db, FirestorePaths.WALLET_MAPPINGS),
  
  // Get specific wallet mapping document reference
  walletMappingDoc: (walletAddress) => doc(db, FirestorePaths.WALLET_MAPPINGS, walletAddress),
};

// Firestore operations
export const firestoreOperations = {
  // Create or update user document
  setUser: async (userId, userData) => {
    try {
      await setDoc(firestoreRefs.userDoc(userId), userData, { merge: true });
      return { success: true };
    } catch (error) {
      console.error("Error setting user:", error);
      return { success: false, error };
    }
  },
  
  // Get user document
  getUser: async (userId) => {
    try {
      const docSnap = await getDoc(firestoreRefs.userDoc(userId));
      if (docSnap.exists()) {
        return { success: true, data: docSnap.data() };
      } else {
        return { success: false, error: "User not found" };
      }
    } catch (error) {
      console.error("Error getting user:", error);
      return { success: false, error };
    }
  },
  
  // Update user document
  updateUser: async (userId, updates) => {
    try {
      await updateDoc(firestoreRefs.userDoc(userId), updates);
      return { success: true };
    } catch (error) {
      console.error("Error updating user:", error);
      return { success: false, error };
    }
  },
  
  // Link wallet to user
  linkWallet: async (walletAddress, userId, email) => {
    try {
      // Store wallet mapping
      await setDoc(firestoreRefs.walletMappingDoc(walletAddress.toLowerCase()), {
        userId,
        email,
        walletAddress: walletAddress.toLowerCase(),
        linkedAt: new Date().toISOString(),
      });
      
      // Update user document with wallet
      await updateDoc(firestoreRefs.userDoc(userId), {
        walletAddress: walletAddress.toLowerCase(),
        walletLinked: true,
      });
      
      return { success: true };
    } catch (error) {
      console.error("Error linking wallet:", error);
      return { success: false, error };
    }
  },
  
  // Get user by wallet address
  getUserByWallet: async (walletAddress) => {
    try {
      const mappingDoc = await getDoc(firestoreRefs.walletMappingDoc(walletAddress.toLowerCase()));
      
      if (mappingDoc.exists()) {
        const { userId } = mappingDoc.data();
        const userDoc = await getDoc(firestoreRefs.userDoc(userId));
        
        if (userDoc.exists()) {
          return { success: true, data: { id: userId, ...userDoc.data() } };
        }
      }
      
      return { success: false, error: "No user found for this wallet" };
    } catch (error) {
      console.error("Error getting user by wallet:", error);
      return { success: false, error };
    }
  },
  
  // Check if wallet is already linked
  isWalletLinked: async (walletAddress) => {
    try {
      const mappingDoc = await getDoc(firestoreRefs.walletMappingDoc(walletAddress.toLowerCase()));
      return mappingDoc.exists();
    } catch (error) {
      console.error("Error checking wallet:", error);
      return false;
    }
  },
  
  // Create post
  createPost: async (postId, postData) => {
    try {
      await setDoc(firestoreRefs.postDoc(postId), postData);
      return { success: true };
    } catch (error) {
      console.error("Error creating post:", error);
      return { success: false, error };
    }
  },
  
  // Get all posts
  getAllPosts: async () => {
    try {
      const querySnapshot = await getDocs(firestoreRefs.postsCollection());
      const posts = [];
      querySnapshot.forEach((doc) => {
        posts.push({ id: doc.id, ...doc.data() });
      });
      return { success: true, data: posts };
    } catch (error) {
      console.error("Error getting posts:", error);
      return { success: false, error };
    }
  },
};

export default firestoreRefs;
