# Build Solstreams project
build:
    @echo "Building Solstreams..."
    anchor build 

# Build the Solstream sdk 
build_sdk: build
    @echo "Building Solstreams SDK..."
    anchor run build_sdk

# Test project using the sdk
test: build_sdk
    @echo "Testing Solstreams..."
    anchor test

# Deploy project to devnet
deploy_devnet:
    @echo "Deploying Solstreams..."
    anchor deploy --provider.cluster devnet --provider.wallet ~/.config/solana/id.json

# Deploy Solstreams to a specific RPC_URL
deploy RPC_URL:
    @echo "Deploying Solstreams..."
    anchor deploy --provider.cluster {{RPC_URL}} --provider.wallet ~/.config/solana/id.json

# Recover fees in case deployment failed
recover_deploy:
    @echo "Recovering Solstreams..."
    solana-keygen recover -o recover.json
    solana program close recover.json

# Grind for keypair starting with PREFIX
grind_key PREFIX:
    @echo "Grinding for keypair starting with $(PREFIX)..."
    solana-keygen grind --starts-with {{PREFIX}}:1 --ignore-case

# Generate local keypair
generate_keypair NAME:
    @echo "Generating keypair..."
    solana-keygen new -o ~/.config/solana/{{NAME}}.json --no-bip39-passphrase

# Get program keypair address
get_program_address:
    @echo "Checking program address..."
    solana address --keypair target/deploy/solstreams-keypair.json