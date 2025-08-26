#!/usr/bin/env node
const { Client } = require('pg');

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL not set. Aborting test.');
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    console.log('Running schema test...');

    // Create two users
    await client.query("INSERT INTO users(address) VALUES($1) ON CONFLICT DO NOTHING", ['0xUserA']);
    await client.query("INSERT INTO users(address) VALUES($1) ON CONFLICT DO NOTHING", ['0xUserB']);

    // Create a subscription pool
    const poolRes = await client.query(
      "INSERT INTO subscription_pools(pool_id, owner, service_name, monthly_amount, token, max_members, status) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id",
      [1001, '0xUserA', 'Test Service', '1000000000000000000', '0x0', 5, 0]
    );
    console.log('Created pool id:', poolRes.rows[0].id);

    // Add a pool member
    await client.query(
      "INSERT INTO pool_members(pool_id, member_address, is_active, total_paid) VALUES($1,$2,$3,$4)",
      [1001, '0xUserB', true, '0']
    );
    console.log('Added pool member 0xUserB');

    // Create an escrow contract
    await client.query(
      "INSERT INTO escrow_contracts(escrow_id, client, freelancer, amount, token, status) VALUES($1,$2,$3,$4,$5,$6)",
      [5001, '0xUserA', '0xUserB', '500000000000000000', '0x0', 0]
    );
    console.log('Created escrow 5001');

    // Insert a transaction
    await client.query(
      "INSERT INTO transactions(tx_hash, from_address, to_address, value, status) VALUES($1,$2,$3,$4,$5)",
      ['0xTx1', '0xUserA', '0xUserB', '500000000000000000', 'pending']
    );
    console.log('Inserted transaction 0xTx1');

    // Verify rows exist
    const members = await client.query('SELECT * FROM pool_members WHERE pool_id = $1', [1001]);
    console.log('Members count before delete owner:', members.rowCount);

    // Delete owner and observe cascade behavior (pool owner set to null, pool members cascade removal)
    console.log('Deleting owner 0xUserA to test FK behavior...');
    await client.query("DELETE FROM users WHERE address=$1", ['0xUserA']);

    const poolAfter = await client.query('SELECT * FROM subscription_pools WHERE pool_id = $1', [1001]);
    console.log('Pool owner after user delete:', poolAfter.rows[0].owner);

    const memberAfter = await client.query('SELECT * FROM pool_members WHERE pool_id = $1', [1001]);
    console.log('Members count after delete owner (should be 0 if cascade):', memberAfter.rowCount);

    // Clean up test data
    await client.query("DELETE FROM transactions WHERE tx_hash = $1", ['0xTx1']);
    await client.query("DELETE FROM pool_payouts WHERE pool_id = $1", [1001]);
    await client.query("DELETE FROM subscription_pools WHERE pool_id = $1", [1001]);
    await client.query("DELETE FROM escrow_contracts WHERE escrow_id = $1", [5001]);
    await client.query("DELETE FROM users WHERE address = $1", ['0xUserB']);

    console.log('Schema test completed successfully.');
  } catch (err) {
    console.error('Schema test failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
