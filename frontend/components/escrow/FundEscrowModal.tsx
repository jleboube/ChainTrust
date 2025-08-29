import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  XMarkIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';
import { useAccount, useBalance } from 'wagmi';
import { toast } from 'react-hot-toast';
import { fundEscrow } from '../../lib/api';

interface EscrowItem {
  id: number;
  client: string;
  freelancer: string;
  amount: string;
  token: string;
  status: number;
  workDescription: string;
}

interface FundEscrowModalProps {
  escrow: EscrowItem;
  onClose: () => void;
  onSuccess: () => void;
}

const FundEscrowModal: React.FC<FundEscrowModalProps> = ({
  escrow,
  onClose,
  onSuccess
}) => {
  const { address } = useAccount();
  const [isFunding, setIsFunding] = useState(false);
  const [hasConfirmed, setHasConfirmed] = useState(false);

  // Get user's balance
  const { data: ethBalance } = useBalance({
    address: address,
  });

  const { data: tokenBalance } = useBalance({
    address: address,
    token: escrow.token !== '0x0000000000000000000000000000000000000000' ? escrow.token as `0x${string}` : undefined,
  });

  const escrowAmount = parseFloat(escrow.amount);
  const platformFee = escrowAmount * 0.025; // 2.5% platform fee
  const totalCost = escrowAmount + platformFee;

  const isETH = escrow.token === '0x0000000000000000000000000000000000000000';
  const tokenSymbol = isETH ? 'ETH' : 'USDC';
  const userBalance = isETH ? ethBalance : tokenBalance;

  const hasEnoughBalance = userBalance ? parseFloat(userBalance.formatted) >= totalCost : false;
  const balanceShortfall = userBalance ? Math.max(0, totalCost - parseFloat(userBalance.formatted)) : totalCost;

  const handleFund = async () => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!hasConfirmed) {
      toast.error('Please confirm the funding details');
      return;
    }

    if (!hasEnoughBalance) {
      toast.error(`Insufficient ${tokenSymbol} balance`);
      return;
    }

    setIsFunding(true);

    try {
      const fundData = {
        amount: escrowAmount,
        token: isETH ? 'ETH' : escrow.token,
        walletAddress: address
      };

      const result = await fundEscrow(escrow.id, fundData);

      toast.success('Escrow funded successfully! Work can now begin.');
      onSuccess();

    } catch (error: any) {
      console.error('Escrow funding error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to fund escrow';
      toast.error(errorMessage);
    } finally {
      setIsFunding(false);
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
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <BanknotesIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Fund Escrow
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Escrow #{escrow.id}
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
          {/* Project Summary */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Project Summary
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
              {escrow.workDescription}
            </p>
          </div>

          {/* Payment Breakdown */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
              <CurrencyDollarIcon className="w-5 h-5 mr-2" />
              Payment Breakdown
            </h3>
            
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Freelancer Payment:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {escrowAmount} {tokenSymbol}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Platform Fee (2.5%):</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {platformFee.toFixed(4)} {tokenSymbol}
                </span>
              </div>
              
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900 dark:text-white">Total Cost:</span>
                  <span className="font-bold text-xl text-blue-600 dark:text-blue-400">
                    {totalCost.toFixed(4)} {tokenSymbol}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Balance Check */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Your Balance
            </h3>
            
            <div className={`p-4 rounded-lg border ${
              hasEnoughBalance 
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-start space-x-3">
                {hasEnoughBalance ? (
                  <ShieldCheckIcon className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                ) : (
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                )}
                
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className={`font-medium ${
                      hasEnoughBalance 
                        ? 'text-green-800 dark:text-green-300' 
                        : 'text-red-800 dark:text-red-300'
                    }`}>
                      Current Balance:
                    </span>
                    <span className={`font-semibold ${
                      hasEnoughBalance 
                        ? 'text-green-900 dark:text-green-200' 
                        : 'text-red-900 dark:text-red-200'
                    }`}>
                      {userBalance ? `${parseFloat(userBalance.formatted).toFixed(4)} ${tokenSymbol}` : 'Loading...'}
                    </span>
                  </div>
                  
                  {hasEnoughBalance ? (
                    <p className="text-sm text-green-700 dark:text-green-300">
                      ✓ You have sufficient balance to fund this escrow
                    </p>
                  ) : (
                    <div className="text-sm text-red-700 dark:text-red-300">
                      <p>⚠ Insufficient balance. You need an additional {balanceShortfall.toFixed(4)} {tokenSymbol}</p>
                      <p className="mt-1">Please add funds to your wallet before proceeding.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Important Notes */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <InformationCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-2">Important Information:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Funds will be held securely in the smart contract</li>
                  <li>Payment will only be released when you approve the completed work</li>
                  <li>You can raise a dispute if there are issues with the work</li>
                  <li>The mediator can resolve disputes fairly between both parties</li>
                  <li>Gas fees for the blockchain transaction are additional</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Confirmation Checkbox */}
          <div className="flex items-start space-x-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <input
              type="checkbox"
              id="confirm-funding"
              checked={hasConfirmed}
              onChange={(e) => setHasConfirmed(e.target.checked)}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="confirm-funding" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              I understand that by funding this escrow, I am committing to pay{' '}
              <span className="font-semibold">{totalCost.toFixed(4)} {tokenSymbol}</span> which will be held 
              in the smart contract until the work is completed and approved or a dispute is resolved.
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <button
              onClick={handleFund}
              disabled={!hasConfirmed || !hasEnoughBalance || isFunding}
              className="flex-1 flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isFunding ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Funding Escrow...
                </>
              ) : (
                <>
                  <BanknotesIcon className="w-5 h-5 mr-2" />
                  Fund Escrow ({totalCost.toFixed(4)} {tokenSymbol})
                </>
              )}
            </button>
            
            <button
              onClick={onClose}
              disabled={isFunding}
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

export default FundEscrowModal;