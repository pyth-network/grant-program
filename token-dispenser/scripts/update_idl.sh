#! /bin/bash

cat target/idl/token_dispenser.json |
jq '(..|objects| select(.type? and .type.defined? and .type.defined == "EvmPubkey")).type |= {"array": ["u8", 32]}' |
jq '(..|objects| select(.type? and .type.defined? and .type.defined == "Secp256k1Signature")).type |= {"array": ["u8", 64]}' |
jq '(..|objects| select(.type? and .type.defined? and .type.defined == "CosmosPubkey")).type |= {"array": ["u8", 65]}' |
jq '(..|objects| select(.type? and .type.defined? and .type.defined == "MerklePath<SolanaHasher>")).type |= {"vec":{"array":["u8",32]}}' |
jq '(..|objects| select(.type? and .type.defined? and .type.defined == "CosmosBech32Address")).type |= "string"' |
jq '(..|objects| select(.type? and .type.defined? and .type.defined == "MerkleRoot<SolanaHasher>")).type |= {"array": ["u8", 32]}' |
jq '.types |= map(select(.name != "TestIdentityCertificate"))' > ../frontend/claim_sdk/idl/token_dispenser.json
