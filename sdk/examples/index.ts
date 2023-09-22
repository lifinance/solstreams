import * as solstream from '../dist/cjs';
import * as web3 from '@solana/web3.js';
import * as fs from 'fs';
import {Keypair} from "@solana/web3.js";

const main = async () => {
  const homedir = require('os').homedir();
  const rawdata = fs.readFileSync(`${homedir}/.config/solana/id.json`, 'utf8');
  const owner_secret = new Uint8Array(JSON.parse(rawdata));
  const keypair = web3.Keypair.fromSecretKey(owner_secret);
  const user = Keypair.generate();

  const connection = new web3.Connection('https://api.devnet.solana.com');
  const solstreamSdk = new solstream.Solstream(keypair.publicKey, user.publicKey, 0, connection);

  const createEventResp = await solstreamSdk.getOrCreateEventVtx(
    'test',
    'test-event',
    Buffer.from('hello')
  );
  createEventResp.vtx.sign([keypair]);

  const sig = await connection.sendTransaction(createEventResp.vtx, {
    maxRetries: 5,
    skipPreflight: true,
  });

  await connection.confirmTransaction(
    {
      signature: sig,
    } as web3.BlockheightBasedTransactionConfirmationStrategy,
    'confirmed'
  );
  console.log('done: ', sig);
};

main();
