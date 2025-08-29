import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CloudArrowUpIcon, 
  DocumentIcon, 
  PhotoIcon, 
  VideoCameraIcon,
  MusicalNoteIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useAccount } from 'wagmi';
import { toast } from 'react-hot-toast';
import { registerContent, generateFileHash } from '../lib/api';
import OwnershipCertificate from './ownership/OwnershipCertificate';

interface FileUploadProps {
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
}

interface UploadedFile extends File {
  preview?: string;
  hash?: string;
  processing?: boolean;
  error?: string;
  result?: any;
}

const FileUpload: React.FC<FileUploadProps> = ({ onSuccess, onError }) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [showCertificate, setShowCertificate] = useState(false);
  const [certificateData, setCertificateData] = useState(null);
  
  const { address, isConnected } = useAccount();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => {
      const fileWithPreview = Object.assign(file, {
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        processing: false,
        hash: undefined,
        error: undefined,
        result: undefined
      });
      return fileWithPreview;
    });

    setFiles(prev => [...prev, ...newFiles]);
    
    // Auto-generate hashes for preview
    newFiles.forEach(generateHashPreview);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true
  });

  const generateHashPreview = async (file: UploadedFile) => {
    try {
      setFiles(prev => prev.map(f => 
        f === file ? { ...f, processing: true } : f
      ));

      const formData = new FormData();
      formData.append('file', file);

      const hashResult = await generateFileHash(formData);
      
      setFiles(prev => prev.map(f => 
        f === file ? { 
          ...f, 
          hash: hashResult.contentHash,
          processing: false,
          error: hashResult.alreadyRegistered ? 'Already registered' : undefined
        } : f
      ));
    } catch (error: any) {
      setFiles(prev => prev.map(f => 
        f === file ? { 
          ...f, 
          processing: false, 
          error: error.response?.data?.message || 'Failed to generate hash'
        } : f
      ));
    }
  };

  const registerFile = async (file: UploadedFile, title: string, description: string) => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      setIsUploading(true);
      setFiles(prev => prev.map(f => 
        f === file ? { ...f, processing: true } : f
      ));

      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('isTransferable', 'true');

      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: Math.min((prev[file.name] || 0) + 10, 90)
        }));
      }, 200);

      const result = await registerContent(formData);
      
      clearInterval(progressInterval);
      setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));

      setFiles(prev => prev.map(f => 
        f === file ? { 
          ...f, 
          processing: false, 
          result,
          error: undefined 
        } : f
      ));

      // Show certificate
      setCertificateData(result.data);
      setShowCertificate(true);

      toast.success('Content registered successfully!');
      onSuccess?.(result);

    } catch (error: any) {
      setFiles(prev => prev.map(f => 
        f === file ? { 
          ...f, 
          processing: false, 
          error: error.response?.data?.message || 'Registration failed'
        } : f
      ));
      
      const errorMessage = error.response?.data?.message || 'Registration failed';
      toast.error(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (file: UploadedFile) => {
    setFiles(prev => prev.filter(f => f !== file));
    if (file.preview) {
      URL.revokeObjectURL(file.preview);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return PhotoIcon;
    if (file.type.startsWith('video/')) return VideoCameraIcon;
    if (file.type.startsWith('audio/')) return MusicalNoteIcon;
    return DocumentIcon;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Certificate Modal */}
      <AnimatePresence>
        {showCertificate && certificateData && (
          <OwnershipCertificate 
            data={certificateData}
            onClose={() => setShowCertificate(false)}
          />
        )}
      </AnimatePresence>

      {/* Upload Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        <div
          {...getRootProps()}
          className={`
            relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
            ${isDragActive 
              ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }
          `}
        >
          <input {...getInputProps()} />
          
          <div className="space-y-4">
            <motion.div
              animate={{ scale: isDragActive ? 1.1 : 1 }}
              className="mx-auto w-16 h-16"
            >
              <CloudArrowUpIcon className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500" />
            </motion.div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isDragActive ? 'Drop files here' : 'Upload files to register ownership'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Drag and drop files here, or click to browse
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Supports images, videos, documents, audio • Max 10MB per file
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* File List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              Files to Register ({files.length})
            </h4>
            
            <div className="space-y-3">
              {files.map((file, index) => (
                <FileCard
                  key={`${file.name}-${index}`}
                  file={file}
                  onRegister={registerFile}
                  onRemove={removeFile}
                  uploadProgress={uploadProgress[file.name]}
                  isUploading={isUploading}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connection Warning */}
      {!isConnected && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4"
        >
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-3 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <p className="font-medium">Wallet connection required</p>
              <p>Please connect your wallet to register content ownership on the blockchain.</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

interface FileCardProps {
  file: UploadedFile;
  onRegister: (file: UploadedFile, title: string, description: string) => void;
  onRemove: (file: UploadedFile) => void;
  uploadProgress?: number;
  isUploading: boolean;
}

const FileCard: React.FC<FileCardProps> = ({ 
  file, 
  onRegister, 
  onRemove, 
  uploadProgress = 0,
  isUploading 
}) => {
  const [title, setTitle] = useState(file.name.split('.')[0]);
  const [description, setDescription] = useState('');
  const [showForm, setShowForm] = useState(false);

  const FileIcon = getFileIcon(file);
  const isRegistered = !!file.result;
  const hasError = !!file.error;
  const isProcessing = file.processing || (isUploading && uploadProgress > 0 && uploadProgress < 100);

  const handleRegister = () => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    onRegister(file, title.trim(), description.trim());
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm"
    >
      <div className="flex items-start space-x-4">
        {/* File Preview */}
        <div className="flex-shrink-0">
          {file.preview ? (
            <img 
              src={file.preview} 
              alt={file.name}
              className="w-12 h-12 object-cover rounded-lg"
            />
          ) : (
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <FileIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            </div>
          )}
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {file.name}
            </h4>
            
            {isRegistered && (
              <CheckCircleIcon className="w-5 h-5 text-green-500" />
            )}
          </div>
          
          <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
            <span>{formatFileSize(file.size)}</span>
            {file.hash && (
              <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                {file.hash.slice(0, 8)}...{file.hash.slice(-8)}
              </span>
            )}
          </div>

          {/* Error Message */}
          {hasError && (
            <div className="mb-3 text-sm text-red-600 dark:text-red-400">
              {file.error}
            </div>
          )}

          {/* Success Message */}
          {isRegistered && (
            <div className="mb-3">
              <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                ✅ Successfully registered on blockchain
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Transaction: {file.result?.txHash}
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {isProcessing && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                <span>
                  {file.processing ? 'Processing...' : `Uploading... ${uploadProgress}%`}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <motion.div
                  className="bg-blue-600 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: file.processing ? '100%' : `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}

          {/* Registration Form */}
          {showForm && !isRegistered && !hasError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-3 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700"
            >
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter a title for this content"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Optional description"
                />
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={handleRegister}
                  disabled={isUploading || !title.trim()}
                  className="px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Register on Blockchain
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          {!showForm && !isRegistered && !isProcessing && (
            <div className="flex space-x-2 mt-3">
              <button
                onClick={() => setShowForm(true)}
                disabled={hasError}
                className="px-4 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Register Ownership
              </button>
              <button
                onClick={() => onRemove(file)}
                className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Helper function to get file icon
function getFileIcon(file: File) {
  if (file.type.startsWith('image/')) return PhotoIcon;
  if (file.type.startsWith('video/')) return VideoCameraIcon;
  if (file.type.startsWith('audio/')) return MusicalNoteIcon;
  return DocumentIcon;
}

// Helper function to format file size
function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default FileUpload;