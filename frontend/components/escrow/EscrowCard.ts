import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CalendarIcon,
  CurrencyDollarIcon,
  UserIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  BanknotesIcon,
  DocumentArrowUpIcon,
  HandThumbUpIcon,
  ExclamationCircleIcon,
  LinkIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import { shortenAddress } from '../../lib/api';
import WorkSubmissionModal from './WorkSubmissionModal';
import FundEscrowModal from './FundEscrowModal';
import DisputeModal from './DisputeModal';

interface EscrowItem {
  id: number;
  role: 'client' | 'freelancer';
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
  createdAtFormatted: string;
  deadlineFormatted: string;
}

interface EscrowCardProps {
  escrow: EscrowItem;
  role: 'client' | 'freelancer';
  onUpdate: () => void;
}

const EscrowCard: React.FC<EscrowCardProps> = ({ escrow, role, onUpdate }) => {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [showWorkSubmission, setShowWorkSubmission] = useState(false);
  const [showFundModal, setShowFundModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      case 1: return 'bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-300';
      case 2: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-300';
      case 3: return 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-300';
      case 4: return 'bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-300';
      case 5: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
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
      case 5: return ExclamationCircleIcon;
      default: return ClockIcon;
    }
  };

  const isDeadlinePassed = () => {
    return Date.now() / 1000 > escrow.deadline;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
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
    return `${Math.ceil(diffDays / 30)} months ago`;
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const getAvailableActions = () => {
    const actions = [];

    if (role === 'client') {
      // Client actions
      if (escrow.status === 0) { // Created - need to fund
        actions.push({
          label: 'Fund Escrow',
          icon: BanknotesIcon,
          onClick: () => setShowFundModal(true),
          className: 'btn-primary',
          description: 'Fund this escrow to enable work to begin'
        });
      }

      if (escrow.status === 2) { // Work submitted - can approve
        actions.push({
          label: 'Approve Work',
          icon: HandThumbUpIcon,
          onClick: () => handleApproveWork(),
          className: 'btn-primary',
          description: 'Approve the submitted work and release payment'
        });
      }

      if (escrow.status === 1 || escrow.status === 2) { // Can raise dispute
        actions.push({
          label: 'Raise Dispute',
          icon: ExclamationTriangleIcon,
          onClick: () => setShowDisputeModal(true),
          className: 'btn-outline',
          description: 'Open a dispute if there are issues'
        });
      }
    }

    if (role === 'freelancer') {
      // Freelancer actions
      if (escrow.status === 1 && !isDeadlinePassed()) { // Funded - can submit work
        actions.push({
          label: 'Submit Work',
          icon: DocumentArrowUpIcon,
          onClick: () => setShowWorkSubmission(true),
          className: 'btn-primary',
          description: 'Upload your completed work for review'
        });
      }

      if (escrow.status === 1 || escrow.status === 2) { // Can raise dispute
        actions.push({
          label: 'Raise Dispute',
          icon: ExclamationTriangleIcon,
          onClick: () => setShowDisputeModal(true),
          className: 'btn-outline',
          description: 'Open a dispute if there are issues'
        });
      }
    }

    // Common actions
    actions.push({
      label: 'View Details',
      icon: EyeIcon,
      onClick: () => router.push(`/escrow/${escrow.id}`),
      className: 'btn-secondary',
      description: 'View complete escrow details'
    });

    return actions;
  };

  const handleApproveWork = async () => {
    // This would be implemented to call the approve work API
    toast.info('Approve work functionality will be implemented');
  };

  const StatusIcon = getStatusIcon(escrow.status);

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-soft hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${getStatusColor(escrow.status).replace('text-', 'bg-').replace('bg-', 'bg-opacity-20 bg-')}`}>
                <StatusIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Escrow #{escrow.id}
                  </h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(escrow.status)}`}>
                    {escrow.statusText}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Created {formatDate(escrow.createdAt).relative}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="text-right">
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {escrow.amount} {escrow.token === '0x0000000000000000000000000000000000000000' ? 'ETH' : 'USDC'}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  You are the {role}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <UserIcon className="w-4 h-4" />
              <span>
                {role === 'client' ? 'Freelancer: ' : 'Client: '}
                {shortenAddress(role === 'client' ? escrow.freelancer : escrow.client)}
              </span>
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <CalendarIcon className="w-4 h-4" />
              <span className={isDeadlinePassed() ? 'text-red-600 dark:text-red-400' : ''}>
                Due: {formatDate(escrow.deadline).relative}
              </span>
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <ClockIcon className="w-4 h-4" />
              <span>Updated {formatDate(escrow.lastUpdated).relative}</span>
            </div>
          </div>

          {/* Work Description Preview */}
          <div className="mb-4">
            <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
              {escrow.workDescription}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {getAvailableActions().slice(0, expanded ? undefined : 2).map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className={`${action.className} text-sm`}
                title={action.description}
              >
                <action.icon className="w-4 h-4 mr-1" />
                {action.label}
              </button>
            ))}
            
            {getAvailableActions().length > 2 && !expanded && (
              <button
                onClick={() => setExpanded(true)}
                className="btn-ghost text-sm"
              >
                +{getAvailableActions().length - 2} more
              </button>
            )}
            
            <button
              onClick={() => setExpanded(!expanded)}
              className="btn-ghost text-sm ml-auto"
            >
              {expanded ? (
                <>
                  <ChevronUpIcon className="w-4 h-4 mr-1" />
                  Less
                </>
              ) : (
                <>
                  <ChevronDownIcon className="w-4 h-4 mr-1" />
                  More
                </>
              )}
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
              className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 space-y-4"
            >
              {/* Full Work Description */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Work Description
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {escrow.workDescription}
                </p>
              </div>

              {/* Detailed Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Participants
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Client:</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono">{shortenAddress(escrow.client)}</span>
                        <button
                          onClick={() => copyToClipboard(escrow.client, 'Client address')}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <ClipboardDocumentIcon className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Freelancer:</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono">{shortenAddress(escrow.freelancer)}</span>
                        <button
                          onClick={() => copyToClipboard(escrow.freelancer, 'Freelancer address')}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <ClipboardDocumentIcon className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Mediator:</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono">{shortenAddress(escrow.mediator)}</span>
                        <button
                          onClick={() => copyToClipboard(escrow.mediator, 'Mediator address')}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <ClipboardDocumentIcon className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Timeline
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Created:</span>
                      <span>{formatDate(escrow.createdAt).full}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Deadline:</span>
                      <span className={isDeadlinePassed() ? 'text-red-600 dark:text-red-400' : ''}>
                        {formatDate(escrow.deadline).full}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Last Updated:</span>
                      <span>{formatDate(escrow.lastUpdated).full}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Work Submission Status */}
              {escrow.status >= 2 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Work Submission
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircleIcon className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        Work Submitted
                      </span>
                    </div>
                    {escrow.deliveryHash && (
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          Delivery Hash:
                        </span>
                        <code className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded font-mono">
                          {shortenAddress(escrow.deliveryHash, 8)}
                        </code>
                        <button
                          onClick={() => copyToClipboard(escrow.deliveryHash, 'Delivery hash')}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <ClipboardDocumentIcon className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* All Actions */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Available Actions
                </h4>
                <div className="flex flex-wrap gap-2">
                  {getAvailableActions().map((action, index) => (
                    <button
                      key={index}
                      onClick={action.onClick}
                      className={`${action.className} text-sm`}
                      title={action.description}
                    >
                      <action.icon className="w-4 h-4 mr-1" />
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
      {showWorkSubmission && (
        <WorkSubmissionModal
          escrowId={escrow.id}
          onClose={() => setShowWorkSubmission(false)}
          onSuccess={() => {
            setShowWorkSubmission(false);
            onUpdate();
          }}
        />
      )}

      {showFundModal && (
        <FundEscrowModal
          escrow={escrow}
          onClose={() => setShowFundModal(false)}
          onSuccess={() => {
            setShowFundModal(false);
            onUpdate();
          }}
        />
      )}

      {showDisputeModal && (
        <DisputeModal
          escrowId={escrow.id}
          role={role}
          onClose={() => setShowDisputeModal(false)}
          onSuccess={() => {
            setShowDisputeModal(false);
            onUpdate();
          }}
        />
      )}
    </>
  );
};

export default EscrowCard;