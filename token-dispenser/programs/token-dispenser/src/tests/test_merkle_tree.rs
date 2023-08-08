use {
    crate::{
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

    let mut aptos_address: [u8; 32] = [0u8; 32];
    aptos_address.copy_from_slice(
        &hex::decode("7e7544df4fc42107d4a60834685dfd9c1e6ff048f49fe477bc19c1551299d5cb").unwrap(),
    );

    let mut sui_address: [u8; 32] = [0u8; 32];
    sui_address.copy_from_slice(
        &hex::decode("87a7ec050788fbaa9cd842b4cf9915949931af94806404bba661f1ac3d338148").unwrap(),
    );

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
                pubkey: pubkey!("3kzAHeiucNConBwKQVHyLcG3soaMzSZkvs4y14fmMgKL").into(),
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
            identity: Identity::Aptos {
                address: aptos_address.into(),
            },
        },
        ClaimInfo {
            amount:   5000,
            identity: Identity::Sui {
                address: sui_address.into(),
            },
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
