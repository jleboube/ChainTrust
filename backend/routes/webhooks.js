const express = require('express');
const crypto = require('crypto');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 */
router.post('/stripe', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!endpointSecret) {
        console.error('Stripe webhook secret not configured');
        return res.status(500).json({ error: 'Webhook configuration error' });
    }

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).json({ error: 'Invalid signature' });
    }

    try {
        // Handle the event
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                console.log('✅ Checkout session completed:', session.id);
                
                // Handle successful subscription payment
                await handleSubscriptionSuccess(session);
                break;
            }

            case 'customer.subscription.created': {
                const subscription = event.data.object;
                console.log('✅ Subscription created:', subscription.id);
                
                // Handle new subscription
                await handleNewSubscription(subscription);
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                console.log('✅ Subscription updated:', subscription.id);
                
                // Handle subscription changes
                await handleSubscriptionUpdate(subscription);
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                console.log('❌ Subscription cancelled:', subscription.id);
                
                // Handle subscription cancellation
                await handleSubscriptionCancellation(subscription);
                break;
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object;
                console.log('✅ Invoice payment succeeded:', invoice.id);
                
                // Handle successful payment
                await handlePaymentSuccess(invoice);
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object;
                console.log('❌ Invoice payment failed:', invoice.id);
                
                // Handle failed payment
                await handlePaymentFailure(invoice);
                break;
            }

            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object;
                console.log('✅ Payment intent succeeded:', paymentIntent.id);
                
                // Handle one-time payment success
                await handleOneTimePayment(paymentIntent);
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });

    } catch (error) {
        console.error('Webhook handler error:', error);
        res.status(500).json({ 
            error: 'Webhook processing failed',
            message: error.message 
        });
    }
});

/**
 * POST /api/webhooks/blockchain
 * Handle blockchain events (from monitoring services like Alchemy)
 */
router.post('/blockchain', async (req, res) => {
    try {
        const { webhookId, id, createdAt, type, event } = req.body;

        // Verify webhook authenticity (implement based on your monitoring service)
        if (!verifyBlockchainWebhook(req)) {
            return res.status(401).json({ error: 'Unauthorized webhook' });
        }

        console.log(`Blockchain event received: ${type}`, event);

        // Handle different blockchain events
        switch (type) {
            case 'ADDRESS_ACTIVITY': {
                await handleAddressActivity(event);
                break;
            }

            case 'MINED_TRANSACTION': {
                await handleMinedTransaction(event);
                break;
            }

            case 'DROPPED_TRANSACTION': {
                await handleDroppedTransaction(event);
                break;
            }

            default:
                console.log(`Unhandled blockchain event: ${type}`);
        }

        res.json({ 
            success: true,
            webhookId,
            processed: true
        });

    } catch (error) {
        console.error('Blockchain webhook error:', error);
        res.status(500).json({
            error: 'Webhook processing failed',
            message: error.message
        });
    }
});

/**
 * POST /api/webhooks/ipfs
 * Handle IPFS pinning service webhooks (like Pinata)
 */
router.post('/ipfs', async (req, res) => {
    try {
        const { event, data } = req.body;

        // Verify webhook (implement based on your IPFS service)
        if (!verifyIPFSWebhook(req)) {
            return res.status(401).json({ error: 'Unauthorized webhook' });
        }

        console.log(`IPFS event received: ${event}`, data);

        switch (event) {
            case 'pin.created': {
                await handleIPFSPinCreated(data);
                break;
            }

            case 'pin.deleted': {
                await handleIPFSPinDeleted(data);
                break;
            }

            case 'pin.failed': {
                await handleIPFSPinFailed(data);
                break;
            }

            default:
                console.log(`Unhandled IPFS event: ${event}`);
        }

        res.json({ 
            success: true,
            event,
            processed: true
        });

    } catch (error) {
        console.error('IPFS webhook error:', error);
        res.status(500).json({
            error: 'Webhook processing failed',
            message: error.message
        });
    }
});

// Webhook handler functions

async function handleSubscriptionSuccess(session) {
    try {
        // Update user subscription status
        // This would typically involve database operations
        console.log('Processing subscription success for session:', session.id);
        
        // Example: Enable premium features for user
        // await updateUserSubscription(session.customer, 'active');
        
    } catch (error) {
        console.error('Error handling subscription success:', error);
        throw error;
    }
}

async function handleNewSubscription(subscription) {
    try {
        console.log('Processing new subscription:', subscription.id);
        
        // Create or update user record
        // await createUserSubscription(subscription);
        
    } catch (error) {
        console.error('Error handling new subscription:', error);
        throw error;
    }
}

async function handleSubscriptionUpdate(subscription) {
    try {
        console.log('Processing subscription update:', subscription.id);
        
        // Update subscription details
        // await updateSubscriptionDetails(subscription);
        
    } catch (error) {
        console.error('Error handling subscription update:', error);
        throw error;
    }
}

async function handleSubscriptionCancellation(subscription) {
    try {
        console.log('Processing subscription cancellation:', subscription.id);
        
        // Disable premium features
        // await cancelUserSubscription(subscription.customer);
        
    } catch (error) {
        console.error('Error handling subscription cancellation:', error);
        throw error;
    }
}

async function handlePaymentSuccess(invoice) {
    try {
        console.log('Processing successful payment for invoice:', invoice.id);
        
        // Update payment records
        // await recordSuccessfulPayment(invoice);
        
    } catch (error) {
        console.error('Error handling payment success:', error);
        throw error;
    }
}

async function handlePaymentFailure(invoice) {
    try {
        console.log('Processing failed payment for invoice:', invoice.id);
        
        // Handle payment failure (send notification, retry, etc.)
        // await handleFailedPayment(invoice);
        
    } catch (error) {
        console.error('Error handling payment failure:', error);
        throw error;
    }
}

async function handleOneTimePayment(paymentIntent) {
    try {
        console.log('Processing one-time payment:', paymentIntent.id);
        
        // Process one-time purchase
        // await processOneTimePayment(paymentIntent);
        
    } catch (error) {
        console.error('Error handling one-time payment:', error);
        throw error;
    }
}

async function handleAddressActivity(event) {
    try {
        console.log('Processing address activity:', event);
        
        // Update address activity records
        // await recordAddressActivity(event);
        
    } catch (error) {
        console.error('Error handling address activity:', error);
        throw error;
    }
}

async function handleMinedTransaction(event) {
    try {
        console.log('Processing mined transaction:', event.hash);
        
        // Update transaction status
        // await updateTransactionStatus(event.hash, 'mined');
        
    } catch (error) {
        console.error('Error handling mined transaction:', error);
        throw error;
    }
}

async function handleDroppedTransaction(event) {
    try {
        console.log('Processing dropped transaction:', event.hash);
        
        // Handle dropped transaction
        // await updateTransactionStatus(event.hash, 'dropped');
        
    } catch (error) {
        console.error('Error handling dropped transaction:', error);
        throw error;
    }
}

async function handleIPFSPinCreated(data) {
    try {
        console.log('Processing IPFS pin created:', data.ipfs_pin_hash);
        
        // Update pin status
        // await updatePinStatus(data.ipfs_pin_hash, 'pinned');
        
    } catch (error) {
        console.error('Error handling IPFS pin created:', error);
        throw error;
    }
}

async function handleIPFSPinDeleted(data) {
    try {
        console.log('Processing IPFS pin deleted:', data.ipfs_pin_hash);
        
        // Update pin status
        // await updatePinStatus(data.ipfs_pin_hash, 'unpinned');
        
    } catch (error) {
        console.error('Error handling IPFS pin deleted:', error);
        throw error;
    }
}

async function handleIPFSPinFailed(data) {
    try {
        console.log('Processing IPFS pin failed:', data.ipfs_pin_hash);
        
        // Handle pin failure
        // await updatePinStatus(data.ipfs_pin_hash, 'failed');
        
    } catch (error) {
        console.error('Error handling IPFS pin failed:', error);
        throw error;
    }
}

// Webhook verification functions

function verifyBlockchainWebhook(req) {
    // Implement verification based on your blockchain monitoring service
    // Example for Alchemy:
    const signature = req.headers['x-alchemy-signature'];
    const body = req.body;
    
    if (!signature || !process.env.ALCHEMY_WEBHOOK_SECRET) {
        return false;
    }
    
    try {
        const expectedSignature = crypto
            .createHmac('sha256', process.env.ALCHEMY_WEBHOOK_SECRET)
            .update(JSON.stringify(body))
            .digest('hex');
            
        return crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );
    } catch (error) {
        console.error('Blockchain webhook verification error:', error);
        return false;
    }
}

function verifyIPFSWebhook(req) {
    // Implement verification based on your IPFS service
    // Example for Pinata:
    const signature = req.headers['pinata-signature'];
    const body = req.body;
    
    if (!signature || !process.env.PINATA_WEBHOOK_SECRET) {
        return false;
    }
    
    try {
        const expectedSignature = crypto
            .createHmac('sha256', process.env.PINATA_WEBHOOK_SECRET)
            .update(JSON.stringify(body))
            .digest('hex');
            
        return signature === expectedSignature;
    } catch (error) {
        console.error('IPFS webhook verification error:', error);
        return false;
    }
}

module.exports = router;