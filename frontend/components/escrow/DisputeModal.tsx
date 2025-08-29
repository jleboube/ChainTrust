import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  XMarkIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ShieldExclamationIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { useAccount } from 'wagmi';
import { toast } from 'react-hot-toast';
import { raiseDispute } from '../../lib/api';

interface DisputeModalProps {
  escrowId: number;
  role: 'client' | 'freelancer';
  onClose: () => void;
  onSuccess: () => void;
}

const DisputeModal: React.FC<DisputeModalProps> = ({
  escrowId,
  role,
  onClose,
  onSuccess
}) => {
  const { address } = useAccount();
  const [disputeReason, setDisputeReason] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const disputeCategories = [
    {
      id: 'quality',
      label: 'Work Quality Issues',
      description: 'The delivered work does not meet the agreed standards or requirements',
      clientFriendly: true,
      freelancerFriendly: false
    },
    {
      id: 'scope',
      label: 'Scope Disagreement',
      description: 'There is disagreement about what work was included in the original agreement',
      clientFriendly: true,
      freelancerFriendly: true
    },
    {
      id: 'communication',
      label: 'Communication Issues',
      description: 'Poor communication or unresponsiveness from the other party',
      clientFriendly: true,
      freelancerFriendly: true
    },
    {
      id: 'deadline',
      label: 'Deadline Concerns',
      description: 'Issues related to project timeline and deadline management',
      clientFriendly: true,
      freelancerFriendly: true
    },
    {
      id: 'payment',
      label: 'Payment Issues',
      description: 'Unfair payment terms or payment-related disputes',
      clientFriendly: false,
      freelancerFriendly: true
    },
    {
      id: 'requirements',
      label: 'Changing Requirements',
      description: 'The client has changed requirements after work began',
      clientFriendly: false,
      freelancerFriendly: true
    },
    {
      id: 'other',
      label: 'Other',
      description: 'Another issue not covered by the above categories',
      clientFriendly: true,
      freelancerFriendly: true
    }
  ];

  const availableCategories = disputeCategories.filter(category => 
    role === 'client' ? category.clientFriendly : category.freelancerFriendly
  );

  const handleSubmit = async () => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!selectedCategory) {
      toast.error('Please select a dispute category');
      return;
    }

    if (!disputeReason.trim()) {
      toast.error('Please provide a detailed reason for the dispute');
      return;
    }

    if (!hasConfirmed) {
      toast.error('Please confirm that you understand the dispute process');
      return;
    }

    setIsSubmitting(true);

    try {
      const disputeData = {
        walletAddress: address
      };

      const result = await raiseDispute(escrowId, disputeData);

      toast.success('Dispute raised successfully. A mediator will review the case.');
      onSuccess();

    } catch (error: any) {
      console.error('Dispute raising error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to raise dispute';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
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
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <ShieldExclamationIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Raise Dispute
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Escrow #{escrowId} • You are the {role}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Warning */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-medium mb-1">Before Raising a Dispute:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Try to communicate directly with the other party to resolve the issue</li>
                  <li>Consider if the issue can be resolved through clarification or compromise</li>
                  <li>Remember that disputes may take time to resolve</li>
                  <li>Both parties will need to present their case to a mediator</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Dispute Category */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Dispute Category *
            </label>
            <div className="grid gap-3">
              {availableCategories.map((category) => (
                <label
                  key={category.id}
                  className={`
                    flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-colors
                    ${selectedCategory === category.id
                      ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="disputeCategory"
                    value={category.id}
                    checked={selectedCategory === category.id}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {category.label}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {category.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Detailed Reason */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Detailed Explanation *
            </label>
            <textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Please provide a detailed explanation of the issue. Include specific examples, timeline of events, and any evidence that supports your case. The more information you provide, the better the mediator can understand the situation."
              maxLength={2000}
            />
            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>Be specific and factual. Avoid emotional language.</span>
              <span>{disputeReason.length}/2000</span>
            </div>
          </div>

          {/* Process Information */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <InformationCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-2">What Happens Next:</p>
                <ol className="space-y-1 list-decimal list-inside">
                  <li>Your dispute will be recorded on the blockchain</li>
                  <li>A mediator will be assigned to review the case</li>
                  <li>Both parties will be able to present evidence and arguments</li>
                  <li>The mediator will make a fair decision on fund distribution</li>
                  <li>The decision will be executed automatically via smart contract</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Evidence Upload (Future Feature) */}
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <DocumentTextIcon className="w-5 h-5 text-gray-400" />
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p className="font-medium mb-1">Evidence Upload (Coming Soon)</p>
                <p>In a future update, you'll be able to upload supporting documents, screenshots, and other evidence directly through this interface.</p>
              </div>
            </div>
          </div>

          {/* Confirmation */}
          <div className="flex items-start space-x-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <input
              type="checkbox"
              id="confirm-dispute"
              checked={hasConfirmed}
              onChange={(e) => setHasConfirmed(e.target.checked)}
              className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
            />
            <label htmlFor="confirm-dispute" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              I understand that raising a dispute will pause this escrow and require mediation to resolve. 
              I confirm that I have tried to resolve this issue directly with the other party and that 
              the information provided above is accurate and factual.
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <button
              onClick={handleSubmit}
              disabled={!selectedCategory || !disputeReason.trim() || !hasConfirmed || isSubmitting}
              className="flex-1 flex items-center justify-center px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Raising Dispute...
                </>
              ) : (
                <>
                  <ShieldExclamationIcon className="w-5 h-5 mr-2" />
                  Raise Dispute
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

export default DisputeModal;