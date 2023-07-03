use {
    super::dispenser_simulator::DispenserSimulator,
    crate::{
        ecosystems::{
            cosmos::{
                CosmosMessage,
                CosmosPubkey,
            },
            evm::EvmPrefixedMessage,
        },
        get_config_pda,
        get_receipt_pda,
        tests::{
            dispenser_simulator::IntoTransactionError,
            test_evm::Secp256k1SignedMessage,
        },
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

    let mut simulator = DispenserSimulator::new().await;
    let claimant = simulator.genesis_keypair.pubkey();

    let evm_mock_message = Secp256k1SignedMessage::<EvmPrefixedMessage>::random(&claimant);
    let cosmos_mock_message: Secp256k1SignedMessage<CosmosMessage> =
        Secp256k1SignedMessage::<CosmosMessage>::random(&claimant);

    // let claim_mock_messages: Vec<Secp256k1SignedMessage> = vec![evm_mock_message.clone(), cosmos_mock_message.clone()];

    let merkle_items: Vec<ClaimInfo> = vec![
        ClaimInfo {
            amount:   100,
            identity: Identity::Evm(evm_mock_message.recover_as_evm_address()),
        },
        ClaimInfo {
            amount:   200,
            identity: Identity::Discord,
        },
        ClaimInfo {
            amount:   300,
            identity: Identity::Cosmwasm(CosmosPubkey(cosmos_mock_message.recover().serialize())),
        },
        // ClaimInfo {
        //     amount:   400,
        //     identity: Identity::Sui,
        // },
        // ClaimInfo {
        //     amount:   500,
        //     identity: Identity::Aptos,
        // },
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
        .claim(&dispenser_guard, &claim_certificates[0], &evm_mock_message)
        .await
        .unwrap();

    simulator
        .claim(&dispenser_guard, &claim_certificates[1], &evm_mock_message)
        .await
        .unwrap();

    simulator
        .claim(
            &dispenser_guard,
            &claim_certificates[2],
            &cosmos_mock_message,
        )
        .await
        .unwrap();


    // Check state
    assert_claim_receipts_exist(&merkle_items_serialized, &mut simulator).await;

    // Can't claim twice
    // for claim_certificate in claim_certificates {
    //     assert_eq!(
    //         simulator
    //             .claim(&dispenser_guard, &claim_certificate, &evm_mock_message)
    //             .await
    //             .unwrap_err()
    //             .unwrap(),
    //         ErrorCode::AlreadyClaimed.into_transation_error()
    //     );
    // }

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
