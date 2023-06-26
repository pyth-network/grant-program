use {
    super::dispenser_simulator::DispenserSimulator,
    crate::{
        ecosystems::evm::EvmPubkey,
        get_config_pda,
        get_receipt_pda,
        tests::dispenser_simulator::IntoTransactionError,
        ClaimCertificate,
        ClaimInfo,
        Config,
        ErrorCode,
        Identity,
        SolanaHasher,
    },
    anchor_lang::{
        prelude::Pubkey,
        AnchorDeserialize,
        AnchorSerialize,
    },
    pythnet_sdk::accumulators::{
        merkle::MerkleTree,
        Accumulator,
    },
    solana_program_test::tokio,
    solana_sdk::{
        account::Account,
        signature::Keypair,
        signer::Signer,
    },
};


#[tokio::test]
pub async fn test_happy_path() {
    let dispenser_guard: Keypair = Keypair::new();
    let merkle_items: Vec<ClaimInfo> = vec![
        ClaimInfo {
            amount:   100,
            identity: Identity::Evm(EvmPubkey::from_evm_hex(
                "f3f9225A2166861e745742509CED164183a626d7",
            )),
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

    let merkle_tree: MerkleTree<SolanaHasher> = MerkleTree::new(
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
            claim_info:         item.clone(),
            proof_of_inclusion: merkle_tree.prove(&item.try_to_vec().unwrap()).unwrap(),
        })
        .collect();

    // Check state
    for serialized_item in merkle_items_serialized.clone() {
        assert!(simulator
            .get_account(get_receipt_pda(&serialized_item).0)
            .await
            .is_none());
    }

    simulator
        .claim(&dispenser_guard, claim_certificates.clone())
        .await
        .unwrap();

    // Check state
    assert_claim_receipts_exist(&merkle_items_serialized, &mut simulator).await;

    // Can't claim twice
    assert_eq!(
        simulator
            .claim(&dispenser_guard, claim_certificates.clone())
            .await
            .unwrap_err()
            .unwrap(),
        ErrorCode::AlreadyClaimed.into_transation_error()
    );

    // Check state
    assert_claim_receipts_exist(&merkle_items_serialized, &mut simulator).await;
}

pub async fn assert_claim_receipts_exist(
    claimed_items_serialized: &Vec<Vec<u8>>,
    simulator: &mut DispenserSimulator,
) {
    for serialized_item in claimed_items_serialized {
        let receipt_account: Account = simulator
            .get_account(get_receipt_pda(serialized_item).0)
            .await
            .unwrap();

        assert_eq!(receipt_account.owner, crate::id());
    }
}
