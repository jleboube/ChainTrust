import React from 'react';
import Head from 'next/head';
import OwnershipPage from '../components/ownership/OwnershipPage';

export default function Home() {
  return (
    <>
      <Head>
        <title>ChainTrust - Register & Verify Digital Ownership</title>
        <meta name="description" content="Upload your digital content and register it on the blockchain for immutable proof of ownership. Protect your creative work with ChainTrust." />
      </Head>
      
      <OwnershipPage />
    </>
  );
}