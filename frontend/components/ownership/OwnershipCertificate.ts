import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  XMarkIcon,
  ShareIcon,
  DocumentDuplicateIcon,
  ShieldCheckIcon,
  CalendarIcon,
  LinkIcon,
  QrCodeIcon,
  CloudIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import QRCode from 'qrcode.react';

interface OwnershipCertificateProps {
  data: {
    contentHash: string;
    ipfsHash: string;
    ipfsUrl: string;
    title: string;
    description: string;
    owner: string;
    registeredAt: string;
    txHash: string;
    gasUsed: string;
    verificationUrl: string;
  };
  onClose: () => void;
}

const OwnershipCertificate: React.FC<OwnershipCertificateProps> = ({ data, onClose }) => {
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      toast.success(`${type} copied to clipboard!`);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const shareData = {
    title: `ChainTrust Certificate - ${data.title}`,
    text: `This content has been registered on the blockchain for ownership verification.`,
    url: data.verificationUrl
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback: copy URL to clipboard
      copyToClipboard(data.verificationUrl, 'Verification URL');
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  const downloadCertificate = () => {
    const certificateData = {
      title: data.title,
      description: data.description,
      contentHash: data.contentHash,
      owner: data.owner,
      registeredAt: data.registeredAt,
      verificationUrl: data.verificationUrl,
      blockchainTx: data.txHash,
      ipfsHash: data.ipfsHash
    };

    const dataStr = JSON.stringify(certificateData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `chaintrust-certificate-${data.contentHash.slice(0, 8)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast.success('Certificate downloaded!');
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
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-blue-600 to-purple-700 p-6 rounded-t-2xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
          
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <ShieldCheckIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Ownership Certificate</h2>
              <p className="text-blue-100">Blockchain Verified</p>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <h3 className="text-xl font-semibold text-white mb-2">{data.title}</h3>
            {data.description && (
              <p className="text-blue-100 text-sm">{data.description}</p>
            )}
          </div>
        </div>

        {/* Certificate Body */}
        <div className="p-6 space-y-6">
          {/* Registration Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Owner */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Owner Address
              </label>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-md">
                  {formatAddress(data.owner)}
                </span>
                <button
                  onClick={() => copyToClipboard(data.owner, 'Owner Address')}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <DocumentDuplicateIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Registration Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Registration Date
              </label>
              <div className="flex items-center space-x-2 text-sm text-gray-900 dark:text-white">
                <CalendarIcon className="w-4 h-4 text-gray-400" />
                <span>{formatDate(data.registeredAt)}</span>
              </div>
            </div>
          </div>

          {/* Content Hash */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Content Hash (SHA-256)
            </label>
            <div className="flex items-center space-x-2">
              <div className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-md flex-1 break-all">
                {data.contentHash}
              </div>
              <button
                onClick={() => copyToClipboard(data.contentHash, 'Content Hash')}
                className={`p-2 rounded-md transition-colors ${
                  copied === 'Content Hash' 
                    ? 'text-green-600 bg-green-100 dark:bg-green-900/20' 
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <DocumentDuplicateIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* IPFS Details */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
              IPFS Storage
            </label>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-2">
                <CloudIcon className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Decentralized Storage
                </span>
              </div>
              <div className="font-mono text-xs text-gray-600 dark:text-gray-400 mb-2">
                {data.ipfsHash}
              </div>
              <a
                href={data.ipfsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                <GlobeAltIcon className="w-4 h-4" />
                <span>View on IPFS</span>
              </a>
            </div>
          </div>

          {/* Blockchain Transaction */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Blockchain Transaction
            </label>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Network:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">Polygon</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Gas Used:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{data.gasUsed}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2 mt-3">
                <span className="font-mono text-xs bg-white dark:bg-gray-700 px-2 py-1 rounded">
                  {formatAddress(data.txHash)}
                </span>
                <button
                  onClick={() => copyToClipboard(data.txHash, 'Transaction Hash')}
                  className={`p-1 rounded transition-colors ${
                    copied === 'Transaction Hash'
                      ? 'text-green-600 bg-green-100 dark:bg-green-900/20'
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                >
                  <DocumentDuplicateIcon className="w-3 h-3" />
                </button>
                <a
                  href={`https://polygonscan.com/tx/${data.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  <LinkIcon className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Verification URL */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Public Verification
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={data.verificationUrl}
                readOnly
                className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md font-mono"
              />
              <button
                onClick={() => copyToClipboard(data.verificationUrl, 'Verification URL')}
                className={`p-2 rounded-md transition-colors ${
                  copied === 'Verification URL'
                    ? 'text-green-600 bg-green-100 dark:bg-green-900/20'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <DocumentDuplicateIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowQR(!showQR)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <QrCodeIcon className="w-4 h-4" />
              </button>
            </div>

            {/* QR Code */}
            {showQR && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex justify-center pt-4"
              >
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <QRCode value={data.verificationUrl} size={160} />
                </div>
              </motion.div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ShareIcon className="w-4 h-4" />
              <span>Share Certificate</span>
            </button>
            
            <button
              onClick={downloadCertificate}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <DocumentDuplicateIcon className="w-4 h-4" />
              <span>Download</span>
            </button>
            
            <a
              href={data.verificationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <LinkIcon className="w-4 h-4" />
              <span>View Public</span>
            </a>
          </div>

          {/* Certificate Footer */}
          <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              This certificate provides cryptographic proof of content ownership and timestamp.
              <br />
              It is permanently stored on the Polygon blockchain and IPFS for immutable verification.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default OwnershipCertificate;