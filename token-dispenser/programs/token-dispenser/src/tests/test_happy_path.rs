use super::dispenser_simulator::DispenserSimulator;
use crate::{
    get_config_pda,
    ClaimCertificate,
    ClaimInfo,
    Config,
    Identity,
    ProofOfIdentity, FastHasher,
};
use anchor_lang::prelude::Pubkey;
use anchor_lang::{
    AnchorDeserialize,
    AnchorSerialize,
};
use pythnet_sdk::accumulators::merkle::MerkleTree;
use pythnet_sdk::accumulators::Accumulator;
use pythnet_sdk::hashers::keccak256::Keccak256;
use solana_program_test::tokio;
use solana_sdk::account::Account;
use solana_sdk::signature::Keypair;
use solana_sdk::signer::Signer;


#[tokio::test]
pub async fn test_happy_path() {
    let dispenser_guard: Keypair = Keypair::new();
    let merkle_items: Vec<ClaimInfo> = vec![
        ClaimInfo {
            amount:   100,
            identity: Identity::Evm,
        },
        ClaimInfo {
            amount:   200,
            identity: Identity::Discord,
        },
        ClaimInfo {
            amount:   300,
            identity: Identity::Solana(Pubkey::default()),
        },
        ClaimInfo {
            amount:   400,
            identity: Identity::Sui,
        },
        ClaimInfo {
            amount:   500,
            identity: Identity::Aptos,
        },
    ];

    let merkle_items_serialized = merkle_items
        .iter()
        .map(|item| item.try_to_vec().unwrap())
        .collect::<Vec<Vec<u8>>>();

    let merkle_tree: MerkleTree<FastHasher> = MerkleTree::new(
        merkle_items_serialized
            .iter()
            .map(|item| item.as_slice())
            .collect::<Vec<&[u8]>>()
            .as_slice(),
    )
    .unwrap();

    let target_config = Config {
        merkle_root:     merkle_tree.root.clone(),
        dispenser_guard: dispenser_guard.pubkey(),
    };
    let mut simulator = DispenserSimulator::new().await;
    simulator.initialize(target_config.clone()).await.unwrap();

    let config_account: Account = simulator.get_account(get_config_pda().0).await.unwrap();
    let config_data: Config = Config::try_from_slice(&config_account.data[8..]).unwrap();
    assert_eq!(target_config, config_data);

    let claim_certificates: Vec<ClaimCertificate> = merkle_items
        .iter()
        .map(|item| ClaimCertificate {
            proof_of_identity:  match item.identity {
                Identity::Discord => ProofOfIdentity::Discord,
                Identity::Solana(_) => ProofOfIdentity::Solana(vec![]),
                Identity::Evm => ProofOfIdentity::Evm,
                Identity::Sui => ProofOfIdentity::Sui,
                Identity::Aptos => ProofOfIdentity::Aptos,
                Identity::Cosmwasm => ProofOfIdentity::Cosmwasm,
            },
            amount:             item.amount,
            proof_of_inclusion: merkle_tree.prove(&item.try_to_vec().unwrap()).unwrap(),
        })
        .collect();

    simulator
        .claim(&dispenser_guard, claim_certificates.clone())
        .await
        .unwrap();
}
