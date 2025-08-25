import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm, useFieldArray } from 'react-hook-form';
import { 
  PlusIcon,
  TrashIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  UserIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { useAccount } from 'wagmi';
import { toast } from 'react-hot-toast';
import { createEscrow } from '../../lib/api';

interface CreateEscrowFormProps {
  onSuccess?: (escrowId: number) => void;
  onCancel?: () => void;
}

interface EscrowFormData {
  title: string;
  freelancer: string;
  mediator?: string;
  amount: number;
  token: string;
  deadline: string;
  workDescription: string;
  category: string;
  milestones: Array<{
    description: string;
    amount: number;
    dueDate: string;
  }>;
}

const CreateEscrowForm: React.FC<CreateEscrowFormProps> = ({ onSuccess, onCancel }) => {
  const { address, isConnected } = useAccount();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMilestones, setShowMilestones] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isValid }
  } = useForm<EscrowFormData>({
    defaultValues: {
      token: 'ETH',
      category: 'other',
      milestones: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'milestones'
  });

  const watchedAmount = watch('amount');
  const watchedToken = watch('token');

  const onSubmit = async (data: EscrowFormData) => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Validate milestone amounts if using milestones
      if (data.milestones.length > 0) {
        const totalMilestoneAmount = data.milestones.reduce((sum, m) => sum + m.amount, 0);
        if (Math.abs(totalMilestoneAmount - data.amount) > 0.01) {
          toast.error('Total milestone amounts must equal the escrow amount');
          setIsSubmitting(false);
          return;
        }
      }

      const escrowData = {
        ...data,
        clientWallet: address,
        deadline: new Date(data.deadline).toISOString()
      };

      const result = await createEscrow(escrowData);
      
      toast.success('Escrow contract created successfully!');
      onSuccess?.(result.data.escrowId);

    } catch (error: any) {
      console.error('Escrow creation error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create escrow';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addMilestone = () => {
    const remainingAmount = watchedAmount - fields.reduce((sum, field) => sum + (field.amount || 0), 0);
    append({
      description: '',
      amount: Math.max(0, remainingAmount),
      dueDate: ''
    });
  };

  const categories = [
    { value: 'design', label: 'Design & Creative' },
    { value: 'development', label: 'Development & Tech' },
    { value: 'writing', label: 'Writing & Content' },
    { value: 'marketing', label: 'Marketing & Sales' },
    { value: 'other', label: 'Other' }
  ];

  const tokens = [
    { value: 'ETH', label: 'ETH (Ethereum)', symbol: 'Ξ' },
    { value: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', label: 'USDC', symbol: '$' },
    { value: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', label: 'DAI', symbol: '$' }
  ];

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <ShieldCheckIcon className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Connect Your Wallet
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Please connect your wallet to create an escrow contract.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Create Escrow Contract
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Set up a secure payment escrow for your freelance project
          </p>
        </div>

        {/* Basic Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-soft">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <DocumentTextIcon className="w-5 h-5 mr-2" />
            Project Details
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Project Title *
              </label>
              <input
                {...register('title', { 
                  required: 'Project title is required',
                  minLength: { value: 1, message: 'Title is too short' },
                  maxLength: { value: 200, message: 'Title is too long' }
                })}
                type="text"
                className="input-primary"
                placeholder="e.g., Website Design for E-commerce Store"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <select
                {...register('category')}
                className="input-primary"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Deadline *
              </label>
              <div className="relative">
                <input
                  {...register('deadline', { 
                    required: 'Deadline is required',
                    validate: (value) => {
                      const selectedDate = new Date(value);
                      const now = new Date();
                      if (selectedDate <= now) {
                        return 'Deadline must be in the future';
                      }
                      return true;
                    }
                  })}
                  type="datetime-local"
                  className="input-primary pl-10"
                  min={new Date().toISOString().slice(0, 16)}
                />
                <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
              {errors.deadline && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.deadline.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Work Description *
              </label>
              <textarea
                {...register('workDescription', { 
                  required: 'Work description is required',
                  minLength: { value: 10, message: 'Description is too short' },
                  maxLength: { value: 2000, message: 'Description is too long' }
                })}
                rows={4}
                className="input-primary"
                placeholder="Describe the work to be completed, deliverables, requirements, etc."
              />
              {errors.workDescription && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.workDescription.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Participants */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-soft">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <UserIcon className="w-5 h-5 mr-2" />
            Participants
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Client (You)
              </label>
              <input
                type="text"
                value={address || ''}
                disabled
                className="input-primary bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Freelancer Address *
              </label>
              <input
                {...register('freelancer', { 
                  required: 'Freelancer address is required',
                  pattern: {
                    value: /^0x[a-fA-F0-9]{40}$/,
                    message: 'Please enter a valid Ethereum address'
                  }
                })}
                type="text"
                className="input-primary font-mono"
                placeholder="0x..."
              />
              {errors.freelancer && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.freelancer.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Mediator Address (Optional)
              </label>
              <input
                {...register('mediator', {
                  pattern: {
                    value: /^0x[a-fA-F0-9]{40}$/,
                    message: 'Please enter a valid Ethereum address'
                  }
                })}
                type="text"
                className="input-primary font-mono"
                placeholder="0x... (Leave blank to use default mediator)"
              />
              {errors.mediator && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.mediator.message}</p>
              )}
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                The mediator can resolve disputes between client and freelancer
              </p>
            </div>
          </div>
        </div>

        {/* Payment Details */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-soft">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <CurrencyDollarIcon className="w-5 h-5 mr-2" />
            Payment Details
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amount *
              </label>
              <input
                {...register('amount', { 
                  required: 'Amount is required',
                  min: { value: 0.001, message: 'Minimum amount is 0.001' },
                  max: { value: 10000, message: 'Maximum amount is 10,000' }
                })}
                type="number"
                step="0.001"
                className="input-primary"
                placeholder="0.0"
              />
              {errors.amount && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.amount.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Token
              </label>
              <select
                {...register('token')}
                className="input-primary"
              >
                {tokens.map(token => (
                  <option key={token.value} value={token.value}>
                    {token.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {watchedAmount && watchedToken && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-800 dark:text-blue-300">
                  Total Escrow Value:
                </span>
                <span className="font-semibold text-blue-900 dark:text-blue-100">
                  {watchedAmount} {watchedToken === 'ETH' ? 'ETH' : watchedToken.includes('0x') ? 'USDC/DAI' : watchedToken}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Milestones (Optional) */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <DocumentTextIcon className="w-5 h-5 mr-2" />
              Milestones (Optional)
            </h3>
            <button
              type="button"
              onClick={() => setShowMilestones(!showMilestones)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              {showMilestones ? 'Hide Milestones' : 'Add Milestones'}
            </button>
          </div>

          {showMilestones && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4"
            >
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Break down the project into milestones for better tracking and payments.
              </p>

              {fields.map((field, index) => (
                <div key={field.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Milestone {index + 1}
                    </h4>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description
                      </label>
                      <input
                        {...register(`milestones.${index}.description`, {
                          required: 'Milestone description is required'
                        })}
                        type="text"
                        className="input-primary"
                        placeholder="Describe this milestone"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Amount
                      </label>
                      <input
                        {...register(`milestones.${index}.amount`, {
                          required: 'Amount is required',
                          min: { value: 0.001, message: 'Min 0.001' }
                        })}
                        type="number"
                        step="0.001"
                        className="input-primary"
                        placeholder="0.0"
                      />
                    </div>
                    
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Due Date
                      </label>
                      <input
                        {...register(`milestones.${index}.dueDate`, {
                          required: 'Due date is required'
                        })}
                        type="datetime-local"
                        className="input-primary"
                        min={new Date().toISOString().slice(0, 16)}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addMilestone}
                className="w-full flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Add Milestone
              </button>
            </motion.div>
          )}
        </div>

        {/* Warning */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400 mr-3 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <p className="font-medium mb-1">Important Notes:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Once created, the escrow contract cannot be modified</li>
                <li>You'll need to fund the contract after creation</li>
                <li>Funds will be held securely until work is approved</li>
                <li>A small platform fee (2.5%) applies to completed escrows</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6">
          <button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                Creating Contract...
              </>
            ) : (
              <>
                <ShieldCheckIcon className="w-5 h-5 mr-2" />
                Create Escrow Contract
              </>
            )}
          </button>
          
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </motion.div>
  );
};

export default CreateEscrowForm;