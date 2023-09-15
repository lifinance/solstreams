# Solstreams

Simple program that allows users to create a stream and add events to the stream.

## Retry transaction

```
> solana-keygen recover -o recover.json
> solana program close recover.json
```

```bash
solana program deploy --url <RPC_URL> target/deploy/event.so --buffer ~/.config/solana/recover.json
```
