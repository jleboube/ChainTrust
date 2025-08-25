import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { 
  XMarkIcon,
  CloudArrowUpIcon,
  DocumentIcon,
  PhotoIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useAccount } from 'wagmi';
import { toast } from 'react-hot-toast';
import { submitWork } from '../../lib/api';

interface WorkSubmissionModalProps {
  escrowId: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface UploadedFile extends File {
  preview?: string;
  uploading?: boolean;
  error?: string;
}

const WorkSubmissionModal: React.FC<WorkSubmissionModalProps> = ({
  escrowId,
  onClose,
  onSuccess
}) => {
  const { address } = useAccount();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [workDescription, setWorkDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => {
      const fileWithPreview = Object.assign(file, {
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        uploading: false,
        error: undefined
      });
      return fileWithPreview;
    });

    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: true,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'video/*': ['.mp4', '.avi', '.mov', '.wmv'],
      'audio/*': ['.mp3', '.wav', '.flac'],
      'application/pdf': ['.pdf'],
      'application/zip': ['.zip'],
      'application/x-zip-compressed': ['.zip'],
      'text/*': ['.txt', '.md'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    }
  });

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

  const handleSubmit = async () => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    if (files.length === 0 && !workDescription.trim()) {
      toast.error('Please provide work description or upload deliverables');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      
      // Add files to form data
      files.forEach((file, index) => {
        formData.append('deliverables', file);
        
        // Simulate upload progress for UX
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: Math.min((prev[file.name] || 0) + 10, 90)
          }));
        }, 100);

        setTimeout(() => {
          clearInterval(progressInterval);
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        }, 2000);
      });

      // Add work description
      if (workDescription.trim()) {
        formData.append('workDescription', workDescription.trim());
      }

      // Add wallet address
      formData.append('walletAddress', address);

      const result = await submitWork(escrowId, formData);

      toast.success('Work submitted successfully!');
      onSuccess();

    } catch (error: any) {
      console.error('Work submission error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to submit work';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
      setUploadProgress({});
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Submit Work
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Upload your completed work for Escrow #{escrowId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Work Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Work Description
            </label>
            <textarea
              value={workDescription}
              onChange={(e) => setWorkDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe the work you've completed, any notes for the client, or instructions for using the deliverables..."
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Provide details about your completed work and any important information for the client.
            </p>
          </div>

          {/* File Upload Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Deliverables (Optional)
            </label>
            
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
                    {isDragActive ? 'Drop files here' : 'Upload your deliverables'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Drag and drop files here, or click to browse
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Supports images, videos, documents, archives • Max 50MB per file
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                Uploaded Files ({files.length})
              </h4>
              
              <div className="space-y-3">
                {files.map((file, index) => (
                  <FileItem
                    key={`${file.name}-${index}`}
                    file={file}
                    onRemove={() => removeFile(file)}
                    uploadProgress={uploadProgress[file.name]}
                    isSubmitting={isSubmitting}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400 mr-3 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-medium mb-1">Important Notes:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Once submitted, you cannot modify or resubmit work</li>
                  <li>The client will review your submission and either approve it or raise a dispute</li>
                  <li>Make sure all deliverables are complete and meet the project requirements</li>
                  <li>Include clear instructions or documentation if needed</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || (files.length === 0 && !workDescription.trim())}
              className="flex-1 flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Submitting Work...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-5 h-5 mr-2" />
                  Submit Work
                </>
              )}
            </button>
            
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

interface FileItemProps {
  file: UploadedFile;
  onRemove: () => void;
  uploadProgress?: number;
  isSubmitting: boolean;
}

const FileItem: React.FC<FileItemProps> = ({ 
  file, 
  onRemove, 
  uploadProgress = 0,
  isSubmitting 
}) => {
  const FileIcon = getFileIcon(file);
  const isUploading = isSubmitting && uploadProgress > 0 && uploadProgress < 100;

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start space-x-4">
        {/* File Preview/Icon */}
        <div className="flex-shrink-0">
          {file.preview ? (
            <img 
              src={file.preview} 
              alt={file.name}
              className="w-12 h-12 object-cover rounded-lg"
            />
          ) : (
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <FileIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            </div>
          )}
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {file.name}
            </h4>
            
            {!isSubmitting && (
              <button
                onClick={onRemove}
                className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 rounded"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {formatFileSize(file.size)} • {file.type}
          </p>

          {/* Progress Bar */}
          {isUploading && (
            <div className="mb-2">
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <motion.div
                  className="bg-blue-600 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}

          {file.error && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {file.error}
            </p>
          )}
        </div>
      </div>
    </div>
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

export default WorkSubmissionModal;