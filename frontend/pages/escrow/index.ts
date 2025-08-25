import React from 'react';
import Head from 'next/head';
import EscrowPage from '../../components/escrow/EscrowPage';

export default function EscrowIndex() {
  return (
    <>
      <Head>
        <title>Smart Contract Escrow - ChainTrust</title>
        <meta name="description" content="Secure freelance payments with blockchain-powered escrow. Funds are held safely until work is approved, protecting both clients and freelancers." />
        <meta name="keywords" content="blockchain escrow, freelance payments, smart contracts, secure payments, Web3 escrow" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Smart Contract Escrow - ChainTrust" />
        <meta property="og:description" content="Secure freelance payments with blockchain-powered escrow. Funds are held safely until work is approved." />
        <meta property="og:type" content="website" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Smart Contract Escrow - ChainTrust" />
        <meta name="twitter:description" content="Secure freelance payments with blockchain-powered escrow. Funds are held safely until work is approved." />
      </Head>
      
      <EscrowPage />
    </>
  );
}