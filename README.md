# Solstreams

Simple program that allows users to create a stream and add events to the stream.

# Table of Contents

1. [Setup](#setup)

   1. [Rust](#rust)
   2. [Solana](#rust)
   3. [pnpm](#pnpm)
   4. [anchor](#anchor)
   5. [just](#just)

2. [Development](#development)
3. [Build](#build)
4. [Testing](#testing)
5. [Deployment](#deployment)
6. [Miscellaneous](#misc)

   1. [build_sdk](#build_sdk)
   2. [Missing keypair](#missing-keypair)
   3. [IDL](#idl)
   4. [ProgramId](#programid)

## Setup

It's advised to follow the installation instructions for each tool rather than using software package management system (e.g. homebrew on mac).

### Rust

Install Rust [here](https://www.rust-lang.org/tools/install)

### Solana

Install the **latest** Solana Tool Suite [here](https://docs.solana.com/cli/install-solana-cli-tools)

> NOTE: if you get an `build-bpf` error it might be because your solana cli version is less than 1.16. Also make sure that solana is in your path by running `echo $PATH | grep solana`

### pnpm

You can install pnpm [here](https://pnpm.io/installation)

### Anchor

Finally, this project is created using the [Anchor framework](https://github.com/coral-xyz/anchor). Anchor makes it easy to write and interact with programs on Solana.

The easiest way to install Anchor is by using `avm`. You can install avm using cargo

```bash
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
```

After installing cargo please either source your .bashrc/.bash_profile (mac) or restart your terminal for the installed tools to be in your PATH.

Then install use the latest Anchor version

```bash
avm install latest
avm use latest
anchor --version
```

### Just

The project uses [Just](https://github.com/casey/just#installation) to save and run project specific commands.

Now, you are ready to work on Solstreams.

## Development

The project uses `Just ` to save project specific commands. Use the command

```bash
just -l
```

to list all options.

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

Where this address will start with a case-insensitive `strm`.

### /target/idl

This is the IDL describing the program. The IDL can be used to automatically generate transactions for the program.

### /target/types

This is based on the IDL and is the typescript version of the IDL file. It exposes types and the IDL itself and can be imported in typescript. Usually the content of the file is fed into a `anchor.Program` function that parses the IDL and exposes the methods through the object.

## Testing

Thanks to `Anchor` it is very easy to write integration tests against the program. The tests reside in the `/tests` folder. Right now it uses the SDK to interact with the program.

> NOTE: it is possible to interact directly with the program but this often requires a bunch of boilerplate and cluttering.

If you have made changes to the program you should run

```bash
// builds the Solstream programs and updates the IDL
anchor build
// builds the Solstream sdk
anchor run build_sdk
// Runs the tests in /tests
anchor test
```

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

# Misc

## build_sdk

The Solstreams SDK is used in the integration tests. Therefore, when changes are made to the program it is wise to run

```zsh
just build_sdk
```

The [command](./justfile) will build the program and the SDK with the newest [IDL](#idl).

## Missing keypair

In [anchor.toml](Anchor.toml) the file specified under wallet need to exist. If it does not exist commands like `anchor test`/`just test` will fail. In order to solve this run

```zsh
just generate_keypair id
```

It will not overwrite an existing key, so it's safe to use.

## IDL

The `anchor build` command not only compiles the program into target/deploy, but it also generates an [IDL](<https://en.wikipedia.org/wiki/IDL_(programming_language)>) in `target/idl`. This IDL can be passed to the Anchor typescript SDK and be used to generate transactions. This reduces a lot of boilerplate.

## ProgramID

The programId is the address of the account holding the compiled program. It is therefore unique and the keypair for the account is found in `target/deploy`.

When you deploy your program it is important that the address in [`program_id!()`](./programs/solstreams/src/lib.rs#L4) matches that of the public key address of the keypair in [`target/deplo/solstreams-keypair.json`](./target/deploy/solstreams-keypair.json). You can check the address of the keypair by running the just command

```zsh
just get_program_address
```

The output should match the address in [`program_id!()`](./programs/solstreams/src/lib.rs#L4). Also, the address is typed statically in the [sdk](./sdk/src/index.ts#L9).
