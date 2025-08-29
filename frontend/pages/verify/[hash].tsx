import React from 'react';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import VerificationPage from '../VerificationPage';

interface VerifyPageProps {
  contentHash: string;
}

export default function VerifyPage({ contentHash }: VerifyPageProps) {
  return (
    <>
      <Head>
        <title>Verify Content Ownership - ChainTrust</title>
        <meta name="description" content={`Verify the blockchain registration and ownership of content with hash: ${contentHash}`} />
        <meta name="robots" content="index, follow" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Verify Content Ownership - ChainTrust" />
        <meta property="og:description" content="Blockchain-verified proof of digital content ownership" />
        <meta property="og:type" content="website" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Verify Content Ownership - ChainTrust" />
        <meta name="twitter:description" content="Blockchain-verified proof of digital content ownership" />
      </Head>
      
      <VerificationPage contentHash={contentHash} />
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { hash } = context.params!;
  
  // Validate hash format (SHA-256 should be 64 hex characters)
  if (typeof hash !== 'string' || !/^[a-fA-F0-9]{64}$/.test(hash)) {
    return {
      notFound: true,
    };
  }
  
  return {
    props: {
      contentHash: hash,
    },
  };
};