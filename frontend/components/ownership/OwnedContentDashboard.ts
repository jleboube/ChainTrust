import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DocumentIcon,
  PhotoIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  CalendarIcon,
  LinkIcon,
  ShareIcon,
  ArrowTopRightOnSquareIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClipboardDocumentIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { useAccount } from 'wagmi';
import { toast } from 'react-hot-toast';
import { getOwnerContent, shortenAddress, OwnerContentResponse } from '../../lib/api';
import LoadingSpinner from '../common/LoadingSpinner';

interface ContentItem {
  contentHash: string;
  owner: string;
  ipfsHash: string;
  ipfsUrl: string;
  title: string;
  description: string;
  registeredAt: string;
  timestamp: number;
  exists: boolean;
  verificationUrl: string;
  error?: string;
}

const OwnedContentDashboard: React.FC = () => {
  const { address, isConnected } = useAccount();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isConnected && address) {
      loadContent();
    }
  }, [address, isConnected]);

  const loadContent = async () => {
    if (!address) return;

    setLoading(true);
    setError(null);

    try {
      const response: OwnerContentResponse = await getOwnerContent(address);
      setContent(response.content);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to load content';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedContent = React.useMemo(() => {
    let filtered = content.filter(item => 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.contentHash.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'date') {
        comparison = new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime();
      } else {
        comparison = a.title.localeCompare(b.title);
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [content, searchTerm, sortBy, sortOrder]);

  const toggleExpanded = (contentHash: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(contentHash)) {
      newExpanded.delete(contentHash);
    } else {
      newExpanded.add(contentHash);
    }
    setExpandedItems(newExpanded);
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${type} copied to clipboard!`);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const shareContent = async (item: ContentItem) => {
    const shareData = {
      title: `ChainTrust Certificate - ${item.title}`,
      text: `Verify the ownership of "${item.title}" on the blockchain.`,
      url: item.verificationUrl
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      copyToClipboard(item.verificationUrl, 'Verification URL');
    }
  };

  const getFileTypeIcon = (title: string) => {
    const ext = title.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) return PhotoIcon;
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(ext || '')) return VideoCameraIcon;
    if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext || '')) return MusicalNoteIcon;
    return DocumentIcon;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      full: date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      relative: getRelativeTime(date)
    };
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays <= 7) return `${diffDays} days ago`;
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    if (diffDays <= 365) return `${Math.ceil(diffDays / 30)} months ago`;
    return `${Math.ceil(diffDays / 365)} years ago`;
  };

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <DocumentIcon className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Connect Your Wallet
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Please connect your wallet to view your registered content.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            My Content
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {content.length} registered {content.length === 1 ? 'item' : 'items'}
          </p>
        </div>
        <button
          onClick={loadContent}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Search and Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, description, or hash..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          {/* Sort Controls */}
          <div className="flex items-center space-x-2">
            <FunnelIcon className="w-5 h-5 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'title')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="date">Sort by Date</option>
              <option value="title">Sort by Title</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {sortOrder === 'asc' ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Content List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={loadContent}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : filteredAndSortedContent.length === 0 ? (
        <div className="text-center py-12">
          <DocumentIcon className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchTerm ? 'No matching content found' : 'No content registered yet'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm ? 'Try adjusting your search terms.' : 'Start by registering your first piece of content.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {filteredAndSortedContent.map((item, index) => (
              <motion.div
                key={item.contentHash}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
              >
                <ContentCard
                  item={item}
                  expanded={expandedItems.has(item.contentHash)}
                  onToggleExpanded={() => toggleExpanded(item.contentHash)}
                  onShare={() => shareContent(item)}
                  onCopy={copyToClipboard}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

interface ContentCardProps {
  item: ContentItem;
  expanded: boolean;
  onToggleExpanded: () => void;
  onShare: () => void;
  onCopy: (text: string, type: string) => void;
}

const ContentCard: React.FC<ContentCardProps> = ({ 
  item, 
  expanded, 
  onToggleExpanded, 
  onShare, 
  onCopy 
}) => {
  const FileTypeIcon = getFileTypeIcon(item.title);
  const formattedDate = formatDate(item.registeredAt);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-4 flex-1 min-w-0">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <FileTypeIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {item.title}
            </h3>
            {item.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                {item.description}
              </p>
            )}
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-1">
                <CalendarIcon className="w-4 h-4" />
                <span>{formattedDate.relative}</span>
              </div>
              <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                {shortenAddress(item.contentHash, 6)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={onShare}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Share"
          >
            <ShareIcon className="w-5 h-5" />
          </button>
          
          <a
            href={item.verificationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="View Public Verification"
          >
            <ArrowTopRightOnSquareIcon className="w-5 h-5" />
          </a>
          
          <button
            onClick={onToggleExpanded}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {expanded ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4"
          >
            {/* Registration Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-gray-500 dark:text-gray-400 mb-1">
                  Registration Date
                </label>
                <p className="text-gray-900 dark:text-white">
                  {formattedDate.full}
                </p>
              </div>
              
              <div>
                <label className="block text-gray-500 dark:text-gray-400 mb-1">
                  Owner Address
                </label>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-gray-900 dark:text-white">
                    {shortenAddress(item.owner)}
                  </span>
                  <button
                    onClick={() => onCopy(item.owner, 'Owner Address')}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                  >
                    <ClipboardDocumentIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Hashes */}
            <div className="space-y-3">
              <div>
                <label className="block text-gray-500 dark:text-gray-400 mb-1 text-sm">
                  Content Hash (SHA-256)
                </label>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 text-xs bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded font-mono break-all">
                    {item.contentHash}
                  </code>
                  <button
                    onClick={() => onCopy(item.contentHash, 'Content Hash')}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                  >
                    <ClipboardDocumentIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-gray-500 dark:text-gray-400 mb-1 text-sm">
                  IPFS Hash
                </label>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 text-xs bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded font-mono">
                    {item.ipfsHash}
                  </code>
                  <button
                    onClick={() => onCopy(item.ipfsHash, 'IPFS Hash')}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                  >
                    <ClipboardDocumentIcon className="w-4 h-4" />
                  </button>
                  <a
                    href={item.ipfsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 rounded"
                  >
                    <LinkIcon className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={() => onCopy(item.verificationUrl, 'Verification URL')}
                className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                Copy Verification URL
              </button>
              
              <a
                href={`https://polygonscan.com/tx/${item.contentHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                View on Polygonscan
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Helper functions
function getFileTypeIcon(title: string) {
  const ext = title.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) return PhotoIcon;
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(ext || '')) return VideoCameraIcon;
  if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext || '')) return MusicalNoteIcon;
  return DocumentIcon;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return {
    full: date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    relative: getRelativeTime(date)
  };
}

function getRelativeTime(date: Date) {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) return 'Today';
  if (diffDays <= 7) return `${diffDays} days ago`;
  if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
  if (diffDays <= 365) return `${Math.ceil(diffDays / 30)} months ago`;
  return `${Math.ceil(diffDays / 365)} years ago`;
}

export default OwnedContentDashboard;