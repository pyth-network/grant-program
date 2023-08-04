use {
    crate::{
        ecosystems::secp256k1::{
            CosmosBech32Address,
            EvmPubkey,
        },
        ClaimInfo,
        Identity,
        SolanaHasher,
    },
    anchor_lang::AnchorSerialize,
    pythnet_sdk::accumulators::{
        merkle::MerkleTree,
        Accumulator,
    },
    solana_sdk::pubkey,
};

/**
 * The goal of this test is generating an arbitrary merkle tree to check against the JS implementation.
 */
#[test]
fn test_merkle_tree() {
    let mut evm_pubkey: [u8; 20] = [0u8; 20];
    evm_pubkey.copy_from_slice(&hex::decode("f3f9225A2166861e745742509CED164183a626d7").unwrap());

    let merkle_items: Vec<ClaimInfo> = vec![
        ClaimInfo {
            amount:   4000,
            identity: Identity::Cosmwasm {
                address: "cosmos1lv3rrn5trdea7vs43z5m4y34d5r3zxp484wcpu".into(),
            },
        },
        ClaimInfo {
            amount:   1000,
            identity: Identity::Discord {
                username: "pepito".to_string(),
            },
        },
        ClaimInfo {
            amount:   1000,
            identity: Identity::Solana {
                pubkey: pubkey!("3kzAHeiucNConBwKQVHyLcG3soaMzSZkvs4y14fmMgKL"),
            },
        },
        ClaimInfo {
            amount:   2000,
            identity: Identity::Evm {
                pubkey: evm_pubkey.into(),
            },
        },
        ClaimInfo {
            amount:   3000,
            identity: Identity::Aptos,
        },
    ];

    let merkle_items_serialized = merkle_items
        .iter()
        .map(|item| item.try_to_vec().unwrap())
        .collect::<Vec<Vec<u8>>>();

    let merkle_tree: MerkleTree<SolanaHasher> = MerkleTree::new(
        merkle_items_serialized
            .iter()
            .map(|item| item.as_slice())
            .collect::<Vec<&[u8]>>()
            .as_slice(),
    )
    .unwrap();

    println!(
        "Merkle root from Rust, check this against the JS test merkleTree.test.ts: {:?}",
        hex::encode(merkle_tree.root.as_bytes())
    );

    println!("Proofs in order");
    for claim_info in merkle_items {
        println!(
            "{:?}",
            hex::encode(
                merkle_tree
                    .prove(&claim_info.try_to_vec().unwrap())
                    .unwrap()
                    .to_bytes()
            )
        );
    }
}
