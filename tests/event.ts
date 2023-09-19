import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { expect } from 'chai';
import { Solstream, Solstreams } from '../sdk/dist/cjs';
import * as bs58 from 'bs58';
import { BN } from 'bn.js';

import { Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';

describe('event', () => {
  // Configure the client to use the local cluster.
  const keypair = Keypair.generate();

  // airdrop

  const wallet = new anchor.Wallet(keypair);

  const localAnchorProvider = anchor.AnchorProvider.env();
  const provider = new anchor.AnchorProvider(
    localAnchorProvider.connection,
    wallet,
    localAnchorProvider.opts
  );
  anchor.setProvider(provider);

  const program = anchor.workspace.Solstreams as Program<Solstreams>;

  const solstreamsdk = new Solstream(
    wallet.publicKey,
    program.provider.connection
  );

  beforeEach(async () => {
    const sig = await program.provider.connection.requestAirdrop(
      keypair.publicKey,
      5 * LAMPORTS_PER_SOL
    );
    await program.provider.connection.confirmTransaction(sig);
  });

  it('Try to create a stream!', async () => {
    // Add your test here.
    const streamName = 'test-stream';
    const eventName = 'test-event';
    const eventData = Buffer.from('test data');

    const createEventVtx = await solstreamsdk.getOrCreateEventVtx(
      streamName,
      eventName,
      eventData
    );
    createEventVtx.vtx.sign([wallet.payer]);
    await program.provider.sendAndConfirm(createEventVtx.vtx);

    // find stream address
    const streamAccount = await program.account.stream.fetch(
      createEventVtx.streamAccountPDA[0]
    );
    expect(streamAccount.name).to.equal(streamName);

    const eventAccount = await program.account.event.fetch(
      createEventVtx.eventAccountPDA[0]
    );
    expect(eventAccount.name).to.equal(eventName);
    expect(eventAccount.data.toString('base64')).to.equal(
      eventData.toString('base64')
    );

    const epoch = await program.provider.connection.getEpochInfo();
    // try to get event based on stream
    const eventAccountFromStream = await program.account.event.all([
      {
        memcmp: {
          offset: 8,
          bytes: bs58.encode(new BN(epoch.epoch).toBuffer('le', 8)),
        },
      },
      {
        memcmp: {
          offset: 8 + 8 + 4,
          bytes: bs58.encode(Buffer.from(streamName)),
        },
      },
    ]);
    expect(eventAccountFromStream.length).equal(1);
  });

  it('Try to create the same stream twice -> should fail since streams are unique!', async () => {
    // Add your test here.
    const streamName = 'test-stream_2';
    const createStreamVtx = await solstreamsdk.initializeStreamVtx(streamName);
    createStreamVtx.vtx.sign([wallet.payer]);
    await program.provider.sendAndConfirm(createStreamVtx.vtx);

    // find stream address
    const streamAccount = await program.account.stream.fetch(
      createStreamVtx.streamAccountPDA[0]
    );
    expect(streamAccount.name).to.equal(streamName);

    // try once more
    const createStreamVtxRetry = await solstreamsdk.initializeStreamVtx(
      streamName
    );
    createStreamVtxRetry.vtx.sign([wallet.payer]);
    try {
      await program.provider.sendAndConfirm(createStreamVtxRetry.vtx);
      throw new Error("Shouldn't be here");
    } catch (e) {
      expect(e.toString()).to.equal(
        'Error: failed to send transaction: Transaction simulation failed: Error processing Instruction 0: custom program error: 0x0'
      );
    }

    // find stream address
    const streamAccountRetry = await program.account.stream.fetch(
      createStreamVtxRetry.streamAccountPDA[0]
    );
    expect(streamAccountRetry.name).to.equal(streamName);
  });

  it('Try to create the same event twice -> should fail since events are unique!', async () => {
    const streamName = 'test-stream_3';
    const createStreamVtx = await solstreamsdk.initializeStreamVtx(streamName);
    createStreamVtx.vtx.sign([wallet.payer]);
    await program.provider.sendAndConfirm(createStreamVtx.vtx);

    // create first event
    const eventName = 'test-event';
    const eventData = Buffer.from('test data');
    const nonce = Buffer.from('test nonce');
    const eventVtx1 = await solstreamsdk.createEventVtx(
      streamName,
      eventName,
      eventData,
      nonce
    );
    eventVtx1.vtx.sign([wallet.payer]);
    await program.provider.sendAndConfirm(eventVtx1.vtx);

    const eventVtx2 = await solstreamsdk.createEventVtx(
      streamName,
      eventName,
      eventData,
      nonce
    );
    eventVtx2.vtx.sign([wallet.payer]);
    try {
      await program.provider.sendAndConfirm(eventVtx2.vtx);
      throw new Error("Shouldn't be here");
    } catch (e) {
      expect(e.toString()).to.equal(
        'Error: failed to send transaction: Transaction simulation failed: Error processing Instruction 0: custom program error: 0x0'
      );
    }
  });
});
