import * as anchor from "@coral-xyz/anchor";
import {Solstreams, IDL} from "./idl/solstreams";
import {randomBytes} from "crypto";
import {bs58} from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import {BN} from "bn.js";
import {Blockhash, BlockhashWithExpiryBlockHeight, PublicKey, TransactionInstruction} from "@solana/web3.js";

export {Solstreams, IDL};

const SOLSTREAM = "solstream";
const SOLSTREAM_ADDRESS = "STRMsoUj1u6oEhDaG6gtECiixy5fKm1sNAyALaUhSBo";

type TransactionMessageArgs = {
    payerKey: PublicKey;
    instructions: Array<TransactionInstruction>;
    recentBlockhash: Blockhash;
};

export type Event = {
    epoch: number;
    streamName: string;
    name: string;
    data: Buffer;
    signatures: Array<string>;
    publicKey: PublicKey;
};

export type SolStream = Array<{
    publicKey: PublicKey;
    account: Event
}>

/**
 * getStreamPDA returns the stream program derived address
 * @param streamName
 * @returns
 */
export const getStreamPDA = (streamName: string) => {
    return anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from(SOLSTREAM), Buffer.from("stream"), Buffer.from(streamName)],
        new anchor.web3.PublicKey(SOLSTREAM_ADDRESS)
    );
};

/**
 * getEventPDA returns the event program derived address
 * for a given stream account and nonce
 * @param streamAccount Stream account
 * @param nonce Nonce for the event
 * @returns: [PublicKey, bump]
 */
export const getEventPDA = (
    streamAccount: anchor.web3.PublicKey,
    nonce: Buffer
) => {
    return anchor.web3.PublicKey.findProgramAddressSync(
        [
            Buffer.from(SOLSTREAM),
            Buffer.from("events"),
            streamAccount.toBuffer(),
            nonce,
        ],
        new anchor.web3.PublicKey(SOLSTREAM_ADDRESS)
    );
};

/**
 * Solstream is the main class for interacting with Solstreams
 */
export class Solstream {
    public program: anchor.Program<Solstreams>;

    constructor(
        readonly signer: anchor.web3.PublicKey,
        readonly user: anchor.web3.PublicKey,
        readonly eventVersion: number,
        readonly connection?: anchor.web3.Connection
    ) {
        this.program = Solstream.setUpAnchorProgram(anchor.web3.Keypair.generate(), connection);
    }

    /**
     * setUpAnchorProgram sets up a dummy program with fake wallet and connection
     * @returns
     */
    private static setUpAnchorProgram = (keypair: anchor.web3.Keypair, connection: anchor.web3.Connection = new anchor.web3.Connection("https://api.solana.com")) => {
        const wallet = new anchor.Wallet(keypair);
        const provider = new anchor.AnchorProvider(connection, wallet, {
            preflightCommitment: "recent",
            commitment: "confirmed",
        });

        return new anchor.Program<Solstreams>(IDL, SOLSTREAM_ADDRESS, provider);
    };

    /**
     * initializeStreamIx creates an instruction for creating a new stream on Solstreams
     * @param streamName Name of the stream
     * @returns
     */
    protected initializeStreamIx = async (streamName: string) => {
        const streamPDA = getStreamPDA(streamName);

        const ix = await this.program.methods
            .createEventStream(streamName)
            .accounts({
                signer: this.signer,
                stream: streamPDA[0],
            })
            .instruction();

        return {
            ix,
            streamAccountPDA: streamPDA,
        };
    };

    /**
     * initializeStreamVtx creates a versioned transaction with the instruction for creating
     * a new stream on Solstreams
     * @param streamName Name of the stream
     * @returns: An object containing the versioned transaction and the stream account PDA
     */
    public initializeStreamVtx = async (streamName: string) => {
        const streamIx = await this.initializeStreamIx(streamName);
        const vtx = await this.createVersionedTransaction([streamIx.ix]);
        return {
            vtx,
            streamAccountPDA: streamIx.streamAccountPDA,
        };
    };

    /**
     * createEventIx creates an instruction for creating an event on Solstreams
     * @param streamName Name of the stream
     * @param eventName  Name of the event
     * @param data Data to be stored in the event
     * @param nonce Nonce for the event. If not given, a random nonce will be generated
     * @returns: An object containing the instruction, the event account PDA and the stream account PDA
     */
    protected createEventIx = async (
        streamName: string,
        eventName: string,
        data: Buffer,
        nonce?: Buffer
    ) => {
        const eventNonce = nonce ?? randomBytes(8);
        const streamPDA = getStreamPDA(streamName);
        const eventPDA = getEventPDA(streamPDA[0], eventNonce);

        const ix = await this.program.methods
            .createEvent(eventNonce, eventName, data, this.eventVersion)
            .accounts({
                owner: this.signer,
                user: this.user,
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

    /**
     * createEventVtx creates a versioned transaction with the instruction for creating an event
     * on Solstreams
     * @param streamName Name of the stream
     * @param eventName Name of the event
     * @param data Data to be stored in the event
     * @param nonce Nonce for the event. If not given, a random nonce will be generated
     * @returns An object containing the versionedTransaction, the event account PDA and the stream account PDA
     */
    public createEventVtx = async (
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

    /**
     * createVersionedTransaction takes a list of instructions and creates a versioned transaction
     *
     * @param ixs instructions
     * @param blockhash
     * @returns
     */
    protected createVersionedTransaction = async (
        ixs: anchor.web3.TransactionInstruction[],
        blockhash?: BlockhashWithExpiryBlockHeight,
    ) => {


        const args: TransactionMessageArgs = {
            payerKey: this.signer,
            instructions: ixs,
            recentBlockhash: blockhash?.blockhash ?? (await this.connection.getLatestBlockhash()).blockhash
        }

        const txMessage = new anchor.web3.TransactionMessage(args).compileToV0Message();

        return new anchor.web3.VersionedTransaction(txMessage);
    };

    /**
     * getOrCreateEventVtx will check if the stream with streamName exists. If not it will
     * be included in the versioned transaction together with the instruction for creating
     * a new event.
     *
     * @param streamName Name of the stream
     * @param eventName Name of the event
     * @param data Data to be stored in the event
     * @param nonce Nonce for the event. If not given, a random nonce will be generated
     * @param blockhash
     * @returns
     */
    public getOrCreateEventVtx = async (
        streamName: string,
        eventName: string,
        data: Buffer,
        nonce?: Buffer,
        blockhash?: BlockhashWithExpiryBlockHeight
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
        const vtx = await this.createVersionedTransaction(ixs, blockhash);
        return {
            vtx,
            eventAccountPDA: eventIx.eventAccountPDA,
            streamAccountPDA: streamPDA,
        };
    };

    /**
     * getAllEventsOnStream finds the event accounts on a stream either
     * over all epochs or a specific epoch
     *
     * It uses the [memcmp](https://docs.solana.com/api/http) object to compare
     * given bytes to the bytes at a given offset in the account data. The filtering
     * uses exact match.
     *
     * Solana account data are prefix padded with 8bytes to uniquely represent the account. In
     * order to match exactly we need to know the layout of the data. The layout is found in the
     * [program](../../programs/solstreams/src/lib.rs). The size of the datatypes can be found in
     * the [anchor book](https://www.anchor-lang.com/docs/space).
     *
     * Example:
     * If we want to match the stream name `my-stream` we need to know how far into the account data
     * the stream name is stored. At the current writing, the event struct is
     * ```rust
     * pub struct Event {
     *      // epoch is used for searching for events using memcmp
     *      epoch: u64,
     *      // stream_name is used for searching for events using memcmp
     *     stream_name: String,
     *    // name of the event
     * ...
     * }
     *```
     * The first 8 bytes is the discriminator. The next 8 bytes (64 bits) is reserved for the epoch. Finally,
     * at 8+8 (=16) bytes is the stream name. However, stream_name is a string and according to the memory layout
     * found in the anchor book a string is `4 + length of string in bytes`. Therefore, we need to move 4 bytes to
     * the right to find the start of the string.
     * Thus, we must match from byte 8(discriminator)+8(epoch)+4(string padding) = 20 bytes into the account data.
     *
     * The layout of the struct is really important! It is not easy to filter on the next field of the Event since from
     * 20 bytes it is a string of unknown length. Thus, we don't know when the next field starts
     * @param streamName Name of the stream
     * @param epoch Epoch to filter on. If not given, all epochs are returned. Read more about epochs [here](https://www.helius.dev/blog/solana-slots-blocks-and-epochs)
     * @returns
     */
    public getAllEventsOnStream = async (streamName: string, epoch?: number): Promise<SolStream> => {
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
                    bytes: bs58.encode(new BN(epoch).toBuffer("le", 8)),
                },
            });
        }

        return await this.program.account.event.all(memcmpFiters) as any as SolStream
    };

    /**
     * getAllEventsOnStreamWithMetadata is the same as getAllEventsOnStream but also returns
     * the signatures of the transactions for the events.
     *
     * Since the events are immutable it is expected that signatures only contain one element
     *
     * @param streamName
     * @param epoch
     * @param commitment
     * @returns
     */
    public getAllEventsOnStreamWithMetadata = async (
        streamName: string,
        epoch?: number,
        commitment?: anchor.web3.Finality
    ) => {
        const events = await this.getAllEventsOnStream(streamName, epoch);

        const sigs = await Promise.all(
            events.map((event) =>
                this.program.provider.connection.getConfirmedSignaturesForAddress2(
                    event.publicKey,
                    {},
                    commitment ?? "confirmed"
                )
            )
        );
        return events.map((event, i) => {
            return {
                event,
                signatures: sigs[i],
            };
        });
    };
}
