import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { 
  ShieldCheckIcon,
  ShieldExclamationIcon,
  CalendarIcon,
  UserIcon,
  DocumentIcon,
  LinkIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { verifyContent } from '../lib/api';

interface VerificationPageProps {
  contentHash?: string;
  embedded?: boolean;
}

interface VerificationResult {
  verified: boolean;
  contentHash: string;
  data?: {
    owner: string;
    ipfsHash: string;
    ipfsUrl: string;
    title: string;
    description: string;
    registeredAt: string;
    ipfsMetadata?: any;
  };
}

const VerificationPage: React.FC<VerificationPageProps> = ({ 
  contentHash: propContentHash,
  embedded = false 
}) => {
  const router = useRouter();
  const [contentHash, setContentHash] = useState(propContentHash || '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get content hash from URL if not provided as prop
  useEffect(() => {
    if (!propContentHash && router.query.hash) {
      setContentHash(router.query.hash as string);
    }
  }, [router.query.hash, propContentHash]);

  // Auto-verify if content hash is available
  useEffect(() => {
    if (contentHash && !propContentHash) {
      handleVerify();
    }
  }, [contentHash]);

  const handleVerify = async (hashToVerify?: string) => {
    const hash = hashToVerify || contentHash;
    
    if (!hash) {
      toast.error('Please enter a content hash to verify');
      return;
    }

    setIsVerifying(true);
    setError(null);
    setResult(null);

    try {
      const response = await verifyContent(hash);
      setResult(response);
      
      if (response.verified) {
        toast.success('Content verification successful!');
      } else {
        toast.error('Content not found on blockchain');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Verification failed';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const formatted = date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    return {
      full: formatted,
      relative: diffDays === 1 ? 'Today' : `${diffDays} days ago`
    };
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <div className={`${embedded ? '' : 'min-h-screen bg-gray-50 dark:bg-gray-900 py-12'}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        {!embedded && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Content Verification
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Verify ownership and authenticity on the blockchain
            </p>
          </motion.div>
        )}

        {/* Search Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-8"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Content Hash (SHA-256)
              </label>
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={contentHash}
                  onChange={(e) => setContentHash(e.target.value)}
                  placeholder="Enter content hash to verify..."
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={() => handleVerify()}
                  disabled={!contentHash || isVerifying}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isVerifying ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            </div>
            
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter the SHA-256 hash of content to verify its ownership and registration on the blockchain.
            </p>
          </div>
        </motion.div>

        {/* Loading State */}
        {isVerifying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-8"
          >
            <div className="flex items-center justify-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-gray-600 dark:text-gray-400">
                Checking blockchain records...
              </span>
            </div>
          </motion.div>
        )}

        {/* Error State */}
        {error && !isVerifying && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-8"
          >
            <div className="text-center">
              <XCircleIcon className="mx-auto h-16 w-16 text-red-500 mb-4" />
              <h3 className="text-lg font-medium text-red-600 dark:text-red-400 mb-2">
                Verification Failed
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
              <button
                onClick={() => handleVerify()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </motion.div>
        )}

        {/* Verification Results */}
        {result && !isVerifying && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Verification Status */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
              {result.verified ? (
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                      <ShieldCheckIcon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-1">
                        Ownership Verified ✓
                      </h3>
                      <p className="text-green-100">
                        This content is registered and verified on the blockchain
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-red-500 to-pink-600 p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                      <ShieldExclamationIcon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-1">
                        Not Registered
                      </h3>
                      <p className="text-red-100">
                        This content has not been registered on the blockchain
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Content Details */}
            {result.verified && result.data && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
                <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                  Registration Details
                </h4>
                
                <div className="space-y-6">
                  {/* Title and Description */}
                  <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {result.data.title}
                    </h3>
                    {result.data.description && (
                      <p className="text-gray-600 dark:text-gray-400">
                        {result.data.description}
                      </p>
                    )}
                  </div>

                  {/* Key Information Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Owner */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                        <UserIcon className="w-4 h-4" />
                        <span>Content Owner</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-md">
                          {formatAddress(result.data.owner)}
                        </span>
                        <button
                          onClick={() => copyToClipboard(result.data.owner)}
                          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <DocumentIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Registration Date */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                        <CalendarIcon className="w-4 h-4" />
                        <span>Registration Date</span>
                      </div>
                      <div>
                        <div className="text-sm text-gray-900 dark:text-white font-medium">
                          {formatDate(result.data.registeredAt).full}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-1">
                          <ClockIcon className="w-3 h-3 mr-1" />
                          {formatDate(result.data.registeredAt).relative}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Content Hash */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                      <DocumentIcon className="w-4 h-4" />
                      <span>Content Hash (SHA-256)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-md flex-1 break-all">
                        {result.contentHash}
                      </div>
                      <button
                        onClick={() => copyToClipboard(result.contentHash)}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <DocumentIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* IPFS Link */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                      <LinkIcon className="w-4 h-4" />
                      <span>Content Storage</span>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Stored on IPFS
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                            {result.data.ipfsHash}
                          </p>
                        </div>
                        <a
                          href={result.data.ipfsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          <span>View File</span>
                          <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Verification Status */}
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-300">
                          Cryptographically Verified
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          This content's ownership and timestamp are permanently recorded on the Polygon blockchain
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Not Found State */}
            {!result.verified && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
                <ShieldExclamationIcon className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Content Not Registered
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  This content hash was not found in our blockchain registry. 
                  The content may not be registered, or the hash might be incorrect.
                </p>
                <div className="space-y-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Want to register your content for ownership protection?
                  </p>
                  <button
                    onClick={() => router.push('/')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Register Content
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default VerificationPage;