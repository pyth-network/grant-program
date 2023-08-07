use {
    crate::{
        ClaimInfo,
        SolanaHasher,
    },
    anchor_lang::AnchorSerialize,
    pythnet_sdk::accumulators::merkle::MerkleTree,
};

mod dispenser_simulator;
mod test_checkout;
mod test_cosmos;
mod test_evm;
mod test_happy_path;
mod test_initialize;
mod test_merkle_tree;

/// Merkleizes a vector of `ClaimInfo`s and returns the `MerkleTree` and the serialized `ClaimInfo`s.
pub fn merkleize(merkle_items: Vec<ClaimInfo>) -> (MerkleTree<SolanaHasher>, Vec<Vec<u8>>) {
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

    (merkle_tree, merkle_items_serialized)
}
