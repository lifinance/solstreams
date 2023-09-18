import * as anchor from '@coral-xyz/anchor';
import { Solstreams, IDL } from './idl/solstreams';
import { randomBytes } from 'crypto';
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes';
import { BN } from 'bn.js';
export { Solstreams, IDL };

const SOLSTREAM = 'solstream';
const SOLSTREAM_ADDRESS = 'strMZGgbP9ZSv61K14burRv5LnWmb1YDTuvjyJK5KVV';

export const getStreamPDA = (streamName: string) => {
  return anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(SOLSTREAM), Buffer.from('stream'), Buffer.from(streamName)],
    new anchor.web3.PublicKey(SOLSTREAM_ADDRESS)
  );
};

export const getEventPDA = (
  streamAccount: anchor.web3.PublicKey,
  nonce: Buffer
) => {
  return anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from(SOLSTREAM),
      Buffer.from('events'),
      streamAccount.toBuffer(),
      nonce,
    ],
    new anchor.web3.PublicKey(SOLSTREAM_ADDRESS)
  );
};

export class Solstream {
  protected program: anchor.Program<Solstreams>;
  constructor(
    readonly keypair: anchor.web3.Keypair,
    readonly connection?: anchor.web3.Connection
  ) {
    this.program = this.setUpAnchorProgram({
      keypair,
      tryConnection: connection,
    });
  }

  /**
   * setUpAnchorProgram sets up a dummy program with fake wallet and connection
   * @returns
   */
  private setUpAnchorProgram = ({
    keypair,
    tryConnection,
  }: {
    keypair: anchor.web3.Keypair;
    tryConnection?: anchor.web3.Connection;
  }) => {
    const wallet = new anchor.Wallet(keypair);
    const connection =
      tryConnection ?? new anchor.web3.Connection('https://api.solana.com');
    const provider = new anchor.AnchorProvider(connection, wallet, {
      preflightCommitment: 'recent',
      commitment: 'confirmed',
    });
    return new anchor.Program<Solstreams>(IDL, SOLSTREAM_ADDRESS, provider);
  };

  initializeStreamIx = async (streamName: string) => {
    const streamPDA = getStreamPDA(streamName);

    const ix = await this.program.methods
      .createEventStream(streamName)
      .accounts({
        stream: streamPDA[0],
      })
      .instruction();

    return {
      ix,
      streamAccountPDA: streamPDA,
    };
  };

  initializeStreamVtx = async (streamName: string) => {
    const streamIx = await this.initializeStreamIx(streamName);
    const vtx = await this.createVersionedTransaction([streamIx.ix]);
    return {
      vtx,
      streamAccountPDA: streamIx.streamAccountPDA,
    };
  };

  createEventIx = async (
    streamName: string,
    eventName: string,
    data: Buffer,
    nonce?: Buffer
  ) => {
    const eventNonce = nonce ?? randomBytes(8);
    const streamPDA = getStreamPDA(streamName);
    const eventPDA = getEventPDA(streamPDA[0], eventNonce);

    const ix = await this.program.methods
      .createEvent(eventNonce, eventName, data)
      .accounts({
        event: eventPDA[0],
        eventStream: streamPDA[0],
      })
      .instruction();

    return {
      ix,
      eventAccountPDA: eventPDA,
      streamAccountPDA: streamPDA,
    };
  };

  createEventVtx = async (
    streamName: string,
    eventName: string,
    data: Buffer,
    nonce?: Buffer
  ) => {
    const eventIx = await this.createEventIx(
      streamName,
      eventName,
      data,
      nonce
    );
    const vtx = await this.createVersionedTransaction([eventIx.ix]);
    return {
      vtx,
      eventAccountPDA: eventIx.eventAccountPDA,
      streamAccountPDA: eventIx.streamAccountPDA,
    };
  };

  createVersionedTransaction = async (
    ixs: anchor.web3.TransactionInstruction[]
  ) => {
    const txMessage = await new anchor.web3.TransactionMessage({
      instructions: ixs,
      recentBlockhash: (
        await this.program.provider.connection.getLatestBlockhash()
      ).blockhash,
      payerKey: this.keypair.publicKey,
    }).compileToV0Message();

    return new anchor.web3.VersionedTransaction(txMessage);
  };

  getOrCreateEventVtx = async (
    streamName: string,
    eventName: string,
    data: Buffer,
    nonce?: Buffer
  ) => {
    const eventIx = await this.createEventIx(
      streamName,
      eventName,
      data,
      nonce
    );
    let ixs = [eventIx.ix];

    // check if stream exists
    const streamPDA = eventIx.streamAccountPDA;
    const streamAccount = await this.program.provider.connection.getAccountInfo(
      streamPDA[0]
    );
    if (!streamAccount) {
      const streamIx = await this.initializeStreamIx(streamName);
      ixs = [streamIx.ix, ...ixs];
    }
    const vtx = await this.createVersionedTransaction(ixs);
    return {
      vtx,
      eventAccountPDA: eventIx.eventAccountPDA,
      streamAccountPDA: streamPDA,
    };
  };

  /**
   * getAllEventsOnStream
   * @param streamName
   * @param epoch
   * @returns
   */
  getAllEventsOnStream = async (streamName: string, epoch?: number) => {
    const memcmpFiters = [
      {
        memcmp: {
          offset: 8 + 8 + 4,
          bytes: bs58.encode(Buffer.from(streamName)),
        },
      },
    ];
    if (epoch) {
      memcmpFiters.unshift({
        memcmp: {
          offset: 8,
          bytes: bs58.encode(new BN(epoch).toBuffer('le', 8)),
        },
      });
    }
    return this.program.account.event.all(memcmpFiters);
  };
}
