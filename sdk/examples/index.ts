import {Solstream} from "../dist/cjs";
import {readFileSync} from "fs";
import {
    Keypair,
    Connection,
    BlockhashWithExpiryBlockHeight,
    VersionedTransaction,
    LAMPORTS_PER_SOL
} from "@solana/web3.js";

const main = async () => {
    const connection = new Connection("http://127.0.0.1:8899");
    const latestBlockHash: BlockhashWithExpiryBlockHeight = await connection.getLatestBlockhash('finalized')

    // Using user's default keypair as the owner of the stream
    const homedir = require("os").homedir();
    const rawdata = readFileSync(`${homedir}/.config/solana/id.json`, "utf8");
    const ownerSecret = new Uint8Array(JSON.parse(rawdata));
    const owner = Keypair.fromSecretKey(ownerSecret);
    console.log(`owner: ${owner.publicKey.toBase58()}`)

    // Using randomly generated keypair as the user of the stream
    const user = Keypair.generate()
    console.log(`user: ${user.publicKey.toBase58()}`)


    // Request airdrop for the user, since it's a new keypair
    const airdrop = await connection.requestAirdrop(user.publicKey, LAMPORTS_PER_SOL)
    console.log(`airdrop: ${airdrop}`)
    await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: airdrop
    }, 'finalized')


    const solstreamSdk = new Solstream(owner.publicKey, user.publicKey, 1, connection);

    const streamName = "My Object Stream";
    const eventName = "Just another Event";

    const createEventResp = await solstreamSdk.getOrCreateEventVtx(
        streamName,
        eventName,
        Buffer.from(JSON.stringify("Some Event Content")),
        undefined,
        latestBlockHash
    );

    createEventResp.vtx.sign([user, owner]);

    const vtx: VersionedTransaction = createEventResp.vtx

    await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: await connection.sendTransaction(vtx)
    });

    const events = await solstreamSdk.getAllEventsOnStream(streamName)

    events.forEach((event) => {
        console.log(`stream: ${event.account.streamName}, event: ${event.account.name}, content: ${event.account.data}`)
    })
};

main().then(() => {
});
