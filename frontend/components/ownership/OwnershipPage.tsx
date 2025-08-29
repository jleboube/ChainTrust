import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Tab } from '@headlessui/react';
import { 
  CloudArrowUpIcon,
  DocumentMagnifyingGlassIcon,
  RectangleStackIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { useAccount } from 'wagmi';
import FileUpload from '../FileUpload';
import VerificationPage from '../../pages/VerificationPage';
import OwnedContentDashboard from './OwnedContentDashboard';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const OwnershipPage: React.FC = () => {
  const { isConnected } = useAccount();
  const [selectedTab, setSelectedTab] = useState(0);

  const tabs = [
    {
      name: 'Register Content',
      icon: CloudArrowUpIcon,
      component: FileUpload,
      description: 'Upload and register your content for ownership proof'
    },
    {
      name: 'My Content',
      icon: RectangleStackIcon,
      component: OwnedContentDashboard,
      description: 'View and manage your registered content'
    },
    {
      name: 'Verify Content',
      icon: DocumentMagnifyingGlassIcon,
      component: VerificationPage,
      description: 'Verify the ownership of any content hash'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 via-purple-700 to-indigo-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <ShieldCheckIcon className="w-8 h-8 text-white" />
              </div>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              Proof of Ownership
            </h1>
            <p className="text-2xl md:text-3xl text-blue-100 mb-8 max-w-4xl mx-auto leading-relaxed">
              Register your digital content on the blockchain for immutable ownership verification. 
              Protect your creative work with cryptographic proof that lasts forever.
            </p>
            
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="text-4xl font-bold text-white mb-2">Instant</div>
                <div className="text-lg text-blue-100">Registration</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-white mb-2">Immutable</div>
                <div className="text-lg text-blue-100">Blockchain Records</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-white mb-2">Global</div>
                <div className="text-lg text-blue-100">Verification</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Wallet Connection */}
        {!isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-8 text-center"
          >
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheckIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Connect Your Wallet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              To register content and access your ownership dashboard, please connect your Web3 wallet.
            </p>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
            <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1 mb-8">
              {tabs.map((tab, index) => (
                <Tab
                  key={tab.name}
                  className={({ selected }) => `
                    w-full rounded-lg py-3 px-4 text-sm font-medium leading-5 transition-all
                    ring-white/60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2
                    ${selected
                      ? 'bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 shadow'
                      : 'text-blue-100 dark:text-blue-200 hover:bg-white/10 hover:text-white'
                    }
                  `}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <tab.icon className="w-5 h-5" />
                    <span className="hidden sm:inline">{tab.name}</span>
                  </div>
                </Tab>
              ))}
            </Tab.List>
            
            <Tab.Panels>
              {tabs.map((tab, index) => (
                <Tab.Panel
                  key={tab.name}
                  className="rounded-xl bg-white dark:bg-gray-800 shadow-xl"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-8"
                  >
                    {/* Tab Description */}
                    <div className="mb-6 text-center">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <tab.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {tab.name}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        {tab.description}
                      </p>
                    </div>

                    {/* Tab Content */}
                    {index === 0 && (
                      <FileUpload
                        onSuccess={() => {
                          // Optionally switch to "My Content" tab after successful registration
                          setTimeout(() => setSelectedTab(1), 2000);
                        }}
                      />
                    )}
                    {index === 1 && <OwnedContentDashboard />}
                    {index === 2 && <VerificationPage embedded />}
                  </motion.div>
                </Tab.Panel>
              ))}
            </Tab.Panels>
          </Tab.Group>
        </motion.div>

        {/* Features Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-16"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose ChainTrust?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Our blockchain-based proof of ownership system provides unmatched security and verification for your digital assets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mb-4">
                <ShieldCheckIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Cryptographic Security
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your content is protected by SHA-256 hashing and stored immutably on the Polygon blockchain.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mb-4">
                <CloudArrowUpIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Decentralized Storage
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Files are stored on IPFS for permanent, censorship-resistant access from anywhere in the world.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mb-4">
                <DocumentMagnifyingGlassIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Public Verification
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Anyone can verify ownership using your content hash - no account or special software required.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default OwnershipPage;