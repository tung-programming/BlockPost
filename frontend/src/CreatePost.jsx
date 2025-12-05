import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "./firebase/config";
import { firestoreOperations } from "./firebase/firestoreRefs";
import axios from "axios";

function CreatePost({ isOpen, onClose, onPostCreated }) {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [step, setStep] = useState(1); // 1: type selection, 2: upload
  const [postType, setPostType] = useState(null); // 'text', 'image', 'video', 'audio'
  const [caption, setCaption] = useState("");
  const [textContent, setTextContent] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (isOpen) {
      checkWalletConnection();
    }
  }, [isOpen]);

  const checkWalletConnection = async () => {
    try {
      const walletLoginActive = localStorage.getItem('walletLoginActive');
      const walletLoginUserId = localStorage.getItem('walletLoginUserId');
      
      let userId;
      
      if (walletLoginActive === 'true' && walletLoginUserId) {
        userId = walletLoginUserId;
      } else if (auth.currentUser) {
        userId = auth.currentUser.uid;
      } else {
        setError("Please login first");
        setTimeout(() => {
          onClose();
          navigate("/login");
        }, 2000);
        return;
      }

      const result = await firestoreOperations.getUser(userId);
      
      if (result.success) {
        setUserData({ id: userId, ...result.data });
        
        // Check if wallet is connected
        if (!result.data.walletLinked) {
          setError("Please connect your MetaMask wallet first");
          setTimeout(() => {
            onClose();
            navigate("/profile");
          }, 2000);
          return;
        }
      } else {
        setError("Failed to load user data");
      }
    } catch (error) {
      console.error("Error checking wallet:", error);
      setError("Failed to verify wallet connection");
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = {
      image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
      audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm']
    };

    const isValid = validTypes[postType]?.includes(file.type);
    
    if (!isValid) {
      setError(`Invalid file type. Please upload a valid ${postType} file.`);
      return;
    }

    // File size limit: 100MB
    if (file.size > 100 * 1024 * 1024) {
      setError("File size exceeds 100MB limit");
      return;
    }

    setSelectedFile(file);
    setError("");

    // Create preview
    if (postType === 'image') {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else if (postType === 'video') {
      const url = URL.createObjectURL(file);
      setFilePreview(url);
    } else if (postType === 'audio') {
      const url = URL.createObjectURL(file);
      setFilePreview(url);
    }
  };

  const handleSubmit = async () => {
    if (postType === 'text' && !textContent.trim()) {
      setError("Please enter some text");
      return;
    }

    if (postType !== 'text' && !selectedFile) {
      setError("Please select a file");
      return;
    }

    setUploading(true);
    setError("");
    setUploadProgress(0);

    try {
      const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

      if (postType === 'text') {
        // For text posts, create a text file and upload
        const textBlob = new Blob([textContent], { type: 'text/plain' });
        const textFile = new File([textBlob], 'post.txt', { type: 'text/plain' });
        
        await uploadFile(textFile, API_URL);
      } else {
        // Upload media file
        await uploadFile(selectedFile, API_URL);
      }

    } catch (error) {
      console.error("Upload error:", error);
      setError(error.message || "Failed to create post");
    } finally {
      setUploading(false);
    }
  };

  const uploadFile = async (file, apiUrl) => {
    const formData = new FormData();
    formData.append('video', file); // Backend expects 'video' field name
    formData.append('walletAddress', userData.walletAddress);
    formData.append('caption', caption || (postType === 'text' ? textContent : ''));

    setUploadProgress(10);

    const response = await axios.post(`${apiUrl}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 90) / progressEvent.total);
        setUploadProgress(10 + progress);
      }
    });

    if (response.data.success) {
      setUploadProgress(100);
      console.log("Post created successfully:", response.data);
      
      // Reset form
      setTimeout(() => {
        resetForm();
        onClose();
        if (onPostCreated) onPostCreated();
      }, 1000);
    } else {
      throw new Error(response.data.error || "Upload failed");
    }
  };

  const resetForm = () => {
    setStep(1);
    setPostType(null);
    setCaption("");
    setTextContent("");
    setSelectedFile(null);
    setFilePreview(null);
    setError("");
    setUploadProgress(0);
  };

  const handleClose = () => {
    if (!uploading) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Create Post
          </h2>
          <button
            onClick={handleClose}
            disabled={uploading}
            className="text-slate-400 hover:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Select Post Type */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-slate-400 text-sm mb-6">
                Choose the type of content you want to post
              </p>

              <div className="grid grid-cols-2 gap-4">
                {/* Text Post */}
                <button
                  onClick={() => {
                    setPostType('text');
                    setStep(2);
                  }}
                  className="p-6 bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-blue-500 rounded-xl transition-all group"
                >
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">
                    📝
                  </div>
                  <h3 className="font-bold mb-1">Text</h3>
                  <p className="text-xs text-slate-400">Share your thoughts</p>
                </button>

                {/* Image Post */}
                <button
                  onClick={() => {
                    setPostType('image');
                    setStep(2);
                  }}
                  className="p-6 bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-blue-500 rounded-xl transition-all group"
                >
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">
                    🖼️
                  </div>
                  <h3 className="font-bold mb-1">Image</h3>
                  <p className="text-xs text-slate-400">Upload a photo</p>
                </button>

                {/* Video Post */}
                <button
                  onClick={() => {
                    setPostType('video');
                    setStep(2);
                  }}
                  className="p-6 bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-blue-500 rounded-xl transition-all group"
                >
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">
                    🎥
                  </div>
                  <h3 className="font-bold mb-1">Video</h3>
                  <p className="text-xs text-slate-400">Share a video</p>
                </button>

                {/* Audio Post */}
                <button
                  onClick={() => {
                    setPostType('audio');
                    setStep(2);
                  }}
                  className="p-6 bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-blue-500 rounded-xl transition-all group"
                >
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">
                    🎵
                  </div>
                  <h3 className="font-bold mb-1">Audio</h3>
                  <p className="text-xs text-slate-400">Upload audio</p>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Upload Content */}
          {step === 2 && (
            <div className="space-y-4">
              <button
                onClick={() => setStep(1)}
                disabled={uploading}
                className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-2 disabled:opacity-50"
              >
                ← Back to type selection
              </button>

              {/* Text Content */}
              {postType === 'text' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Your Text</label>
                  <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    disabled={uploading}
                    rows="6"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-100 resize-none disabled:opacity-50"
                    placeholder="Share your thoughts on the blockchain..."
                  />
                </div>
              )}

              {/* File Upload */}
              {postType !== 'text' && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Select {postType} file
                  </label>
                  <input
                    type="file"
                    accept={
                      postType === 'image' ? 'image/*' :
                      postType === 'video' ? 'video/*' :
                      postType === 'audio' ? 'audio/*' : ''
                    }
                    onChange={handleFileSelect}
                    disabled={uploading}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className={`block w-full p-8 border-2 border-dashed border-slate-700 rounded-lg text-center cursor-pointer hover:border-blue-500 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {selectedFile ? (
                      <div>
                        <p className="text-green-400 font-medium mb-2">✓ File selected</p>
                        <p className="text-sm text-slate-400">{selectedFile.name}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="text-4xl mb-2">📁</div>
                        <p className="text-slate-400">Click to select {postType} file</p>
                        <p className="text-xs text-slate-500 mt-2">Max size: 100MB</p>
                      </div>
                    )}
                  </label>

                  {/* Preview */}
                  {filePreview && postType === 'image' && (
                    <div className="mt-4">
                      <img
                        src={filePreview}
                        alt="Preview"
                        className="w-full max-h-64 object-contain rounded-lg bg-slate-800"
                      />
                    </div>
                  )}
                  {filePreview && postType === 'video' && (
                    <div className="mt-4">
                      <video
                        src={filePreview}
                        controls
                        className="w-full max-h-64 rounded-lg bg-slate-800"
                      />
                    </div>
                  )}
                  {filePreview && postType === 'audio' && (
                    <div className="mt-4 p-4 bg-slate-800 rounded-lg">
                      <audio src={filePreview} controls className="w-full" />
                    </div>
                  )}
                </div>
              )}

              {/* Caption */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Caption {postType === 'text' ? '(optional)' : ''}
                </label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  disabled={uploading}
                  rows="3"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-100 resize-none disabled:opacity-50"
                  placeholder="Add a caption..."
                />
              </div>

              {/* Upload Progress */}
              {uploading && (
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-400">Uploading to IPFS...</span>
                    <span className="text-blue-400">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={uploading || (postType === 'text' ? !textContent.trim() : !selectedFile)}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-all"
              >
                {uploading ? 'Uploading...' : 'Create Post'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CreatePost;
