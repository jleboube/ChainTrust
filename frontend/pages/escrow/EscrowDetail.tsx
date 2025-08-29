import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';
import { 
  ArrowLeftIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  UserIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentIcon,
  LinkIcon,
  ClipboardDocumentIcon,
  ShieldCheckIcon,
  BanknotesIcon,
  DocumentArrowUpIcon,
  HandThumbUpIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { useAccount } from 'wagmi';
import { toast } from 'react-hot-toast';
import { getEscrowDetails, shortenAddress } from '../../lib/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import WorkSubmissionModal from '../../components/escrow/Work_SubmissionModal';
import FundEscrowModal from '../../components/escrow/FundEscrowModal';
import DisputeModal from '../../components/escrow/DisputeModal';

interface EscrowDetailPageProps {
  escrowId: string;
}

interface EscrowDetails {
  id: number;
  client: string;
  freelancer: string;
  mediator: string;
  amount: string;
  token: string;
  status: number;
  statusText: string;
  deadline: number;
  workDescription: string;
  deliveryHash: string;
  createdAt: number;
  lastUpdated: number;
  clientApproved: boolean;
  freelancerSubmitted: boolean;
  deliveryData?: {
    escrowId: number;
    submittedAt: string;
    workDescription: string;
    deliverables: Array<{
      filename: string;
      ipfsHash: string;
      ipfsUrl: string;
      size: number;
      contentType: string;
    }>;
    freelancer: string;
    status: string;
  };
}

const EscrowDetailPage: React.FC<EscrowDetailPageProps> = ({ escrowId }) => {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [escrow, setEscrow] = useState<EscrowDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'client' | 'freelancer' | 'mediator' | 'viewer' | null>(null);
  
  // Modal states
  const [showWorkSubmission, setShowWorkSubmission] = useState(false);
  const [showFundModal, setShowFundModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);

  useEffect(() => {
    if (escrowId) {
      loadEscrowDetails();
    }
  }, [escrowId]);

  useEffect(() => {
    if (escrow && address) {
      // Determine user role
      if (escrow.client.toLowerCase() === address.toLowerCase()) {
        setUserRole('client');
      } else if (escrow.freelancer.toLowerCase() === address.toLowerCase()) {
        setUserRole('freelancer');
      } else if (escrow.mediator.toLowerCase() === address.toLowerCase()) {
        setUserRole('mediator');
      } else {
        setUserRole('viewer');
      }
    }
  }, [escrow, address]);

  const loadEscrowDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getEscrowDetails(parseInt(escrowId));
      setEscrow(response.data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to load escrow details';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      case 1: return 'bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-300';
      case 2: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-300';
      case 3: return 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-300';
      case 4: return 'bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: number) => {
    switch (status) {
      case 0: return ClockIcon;
      case 1: return BanknotesIcon;
      case 2: return DocumentArrowUpIcon;
      case 3: return CheckCircleIcon;
      case 4: return ExclamationTriangleIcon;
      default: return ClockIcon;
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const isDeadlinePassed = () => {
    return escrow ? Date.now() / 1000 > escrow.deadline : false;
  };

  const getAvailableActions = () => {
    if (!escrow || !userRole) return [];
    
    const actions = [];

    if (userRole === 'client') {
      if (escrow.status === 0) { // Created - need to fund
        actions.push({
          label: 'Fund Escrow',
          icon: BanknotesIcon,
          onClick: () => setShowFundModal(true),
          className: 'btn-primary'
        });
      }

      if (escrow.status === 2) { // Work submitted - can approve
        actions.push({
          label: 'Approve Work',
          icon: HandThumbUpIcon,
          onClick: () => handleApproveWork(),
          className: 'btn-primary'
        });
      }

      if (escrow.status === 1 || escrow.status === 2) { // Can raise dispute
        actions.push({
          label: 'Raise Dispute',
          icon: ExclamationTriangleIcon,
          onClick: () => setShowDisputeModal(true),
          className: 'btn-outline'
        });
      }
    }

    if (userRole === 'freelancer') {
      if (escrow.status === 1 && !isDeadlinePassed()) { // Funded - can submit work
        actions.push({
          label: 'Submit Work',
          icon: DocumentArrowUpIcon,
          onClick: () => setShowWorkSubmission(true),
          className: 'btn-primary'
        });
      }

      if (escrow.status === 1 || escrow.status === 2) { // Can raise dispute
        actions.push({
          label: 'Raise Dispute',
          icon: ExclamationTriangleIcon,
          onClick: () => setShowDisputeModal(true),
          className: 'btn-outline'
        });
      }
    }

    return actions;
  };

  const handleApproveWork = async () => {
    toast.info('Approve work functionality will be implemented');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <ExclamationCircleIcon className="mx-auto h-16 w-16 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Error Loading Escrow
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="btn-primary"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!escrow) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <DocumentIcon className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Escrow Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The requested escrow contract could not be found.
          </p>
          <button
            onClick={() => router.back()}
            className="btn-primary"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const StatusIcon = getStatusIcon(escrow.status);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Back to Escrows
          </button>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-lg ${getStatusColor(escrow.status).replace('text-', 'bg-').replace('bg-', 'bg-opacity-20 bg-')}`}>
                <StatusIcon className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Escrow #{escrow.id}
                </h1>
                <div className="flex items-center space-x-3 mt-1">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(escrow.status)}`}>
                    {escrow.statusText}
                  </span>
                  {userRole && userRole !== 'viewer' && (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      You are the {userRole}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {escrow.amount} {escrow.token === '0x0000000000000000000000000000000000000000' ? 'ETH' : 'USDC'}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Escrow Value
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Project Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-soft"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Project Description
              </h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {escrow.workDescription}
              </p>
            </motion.div>

            {/* Work Submission */}
            {escrow.status >= 2 && escrow.deliveryData && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-soft"
              >
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Work Submission
                </h2>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                    <CheckCircleIcon className="w-5 h-5" />
                    <span className="font-medium">Work submitted on {formatDate(new Date(escrow.deliveryData.submittedAt).getTime() / 1000)}</span>
                  </div>
                  
                  {escrow.deliveryData.workDescription && (
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white mb-2">Submission Notes</h3>
                      <p className="text-gray-700 dark:text-gray-300">
                        {escrow.deliveryData.workDescription}
                      </p>
                    </div>
                  )}
                  
                  {escrow.deliveryData.deliverables && escrow.deliveryData.deliverables.length > 0 && (
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                        Deliverables ({escrow.deliveryData.deliverables.length})
                      </h3>
                      <div className="space-y-2">
                        {escrow.deliveryData.deliverables.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                          >
                            <div className="flex items-center space-x-3">
                              <DocumentIcon className="w-5 h-5 text-gray-400" />
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {file.filename}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB • {file.contentType}
                                </div>
                              </div>
                            </div>
                            <a
                              href={file.ipfsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                            >
                              <LinkIcon className="w-5 h-5" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Actions */}
            {getAvailableActions().length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-soft"
              >
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Available Actions
                </h2>
                <div className="flex flex-wrap gap-3">
                  {getAvailableActions().map((action, index) => (
                    <button
                      key={index}
                      onClick={action.onClick}
                      className={`${action.className} flex items-center`}
                    >
                      <action.icon className="w-5 h-5 mr-2" />
                      {action.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Participants */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-soft"
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Participants
              </h2>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Client</div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm">{shortenAddress(escrow.client)}</span>
                    <button
                      onClick={() => copyToClipboard(escrow.client, 'Client address')}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <ClipboardDocumentIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Freelancer</div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm">{shortenAddress(escrow.freelancer)}</span>
                    <button
                      onClick={() => copyToClipboard(escrow.freelancer, 'Freelancer address')}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <ClipboardDocumentIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Mediator</div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm">{shortenAddress(escrow.mediator)}</span>
                    <button
                      onClick={() => copyToClipboard(escrow.mediator, 'Mediator address')}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <ClipboardDocumentIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Timeline */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-soft"
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Timeline
              </h2>
              <div className="space-y-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Created:</span>
                  <span className="text-gray-900 dark:text-white">{formatDate(escrow.createdAt)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Deadline:</span>
                  <span className={`${isDeadlinePassed() ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                    {formatDate(escrow.deadline)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Last Updated:</span>
                  <span className="text-gray-900 dark:text-white">{formatDate(escrow.lastUpdated)}</span>
                </div>
              </div>
            </motion.div>

            {/* Payment Details */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-soft"
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Payment Details
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Amount:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {escrow.amount} {escrow.token === '0x0000000000000000000000000000000000000000' ? 'ETH' : 'USDC'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Platform Fee:</span>
                  <span className="text-gray-900 dark:text-white">
                    {(parseFloat(escrow.amount) * 0.025).toFixed(4)} {escrow.token === '0x0000000000000000000000000000000000000000' ? 'ETH' : 'USDC'}
                  </span>
                </div>
                
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-white">Total:</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {(parseFloat(escrow.amount) + parseFloat(escrow.amount) * 0.025).toFixed(4)} {escrow.token === '0x0000000000000000000000000000000000000000' ? 'ETH' : 'USDC'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showWorkSubmission && (
        <WorkSubmissionModal
          escrowId={escrow.id}
          onClose={() => setShowWorkSubmission(false)}
          onSuccess={() => {
            setShowWorkSubmission(false);
            loadEscrowDetails();
          }}
        />
      )}

      {showFundModal && (
        <FundEscrowModal
          escrow={escrow}
          onClose={() => setShowFundModal(false)}
          onSuccess={() => {
            setShowFundModal(false);
            loadEscrowDetails();
          }}
        />
      )}

      {showDisputeModal && (
        <DisputeModal
          escrowId={escrow.id}
          role={userRole as 'client' | 'freelancer'}
          onClose={() => setShowDisputeModal(false)}
          onSuccess={() => {
            setShowDisputeModal(false);
            loadEscrowDetails();
          }}
        />
      )}
    </div>
  );
};

export default EscrowDetailPage;