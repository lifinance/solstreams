# Solstreams

Simple program that allows users to create a stream and add events to the stream.

## Setup

### Rust

Install Rust [here](https://www.rust-lang.org/tools/install)

### Solana

Install the Solana Tool Suite [here](https://docs.solana.com/cli/install-solana-cli-tools)

### Yarn

You can install Yarn [here](https://yarnpkg.com/getting-started/install)

### Anchor

Finally, this project is created using the [Anchor framework](https://github.com/coral-xyz/anchor). Anchor makes it easy to write and interact with programs on Solana.

The easiest way to install Anchor is by using `avm`. You can install avm using cargo

```bash
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
```

Then install use the latest Anchor version

```bash
avm install latest
avm use latest
anchor --version
```

Now, you are ready to work on Solstreams.

## Development

## Build

You can easily build the program using anchor

```bash
anchor build
```

This will result in a .gitignored /target folder. Inside the target folder you should see

### /target/deploy

This is where your bytecode (solstreams.so) and account keypair reside.

Note: You can check the address of your keypair by running

```bash
solana address --keypair target/deploy/solstreams-keypair.json
```

in your terminal. The output address must match the `programId` in the `declare_id!` macro in [lib.rs](./programs/solstreams/src/lib.rs). The keypair is used for deployment of the contract, if you loose it you loose access to change the program!

You can generate your own keypair by running

```bash
solana-keygen grind --starts-with STRM:1 --ignore-case
```

Where this address will start with a case insensitive `strm`.

### /target/idl

This is the IDL describing the program. The IDL can be used to automatically generate transactions for the program.

### /target/types

This is based on the IDL and is the typescript version of the IDL file. It exposes types and the IDL itself and can be imported in typescript. Usually the content of the file is fed into a `anchor.Program` function that parses the IDL and exposes the methods through the object.

## Testing

Thanks to `Anchor` it is very easy to write integration tests against the program. The tests resides in the `/tests` folder. Right now it uses the SDK to interact with the program.

> NOTE: it is possible to interact directly with the program but this often requires a bunch of boilerplate and cluttering.

## Deployment

Use the `anchor` cli to deploy the program like

```
anchor deploy --provider.cluster <RPC_URL> --provider.wallet <wallet json file>
```

If you don't specify any args the ones under `[provider]` in [anchor.toml](./Anchor.toml) is used.

## Redeploy / upgrade

Upgrades is similar to deploy

```bash
anchor upgrade --provider.cluster <RPC_URL> --provider.wallet <wallet json file>
```

### Retry deploy transaction

In some cases (re)deployment might fail. In order to recover the fees run

```bash
solana-keygen recover -o recover.json
solana program close recover.json
```

This will deposit the fees into the deployment wallet.
