use {
    super::dispenser_simulator::DispenserSimulator,
    crate::{
        ecosystems::{
            cosmos::{
                CosmosMessage,
                CosmosPubkey,
            },
            evm::EvmPrefixedMessage,
            secp256k1::Secp256k1Signature,
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
        ProofOfIdentity,
        SolanaHasher,
    },
    anchor_lang::{
        prelude::Pubkey,
        AnchorDeserialize,
        AnchorSerialize,
    },
    base64::{
        engine::general_purpose::STANDARD as base64_standard_engine,
        Engine as _,
    },
    pythnet_sdk::accumulators::{
        merkle::MerkleTree,
        Accumulator,
    },
    solana_program_test::tokio,
    solana_sdk::{
        account::Account,
        hash,
        signature::Keypair,
        signer::Signer,
    },
};


#[tokio::test]
pub async fn test_happy_path() {
    let mut pubkey_bytes: [u8; 33] = [0; 33];
    pubkey_bytes.copy_from_slice(
        &base64_standard_engine
            .decode("AzByPRU/nxOm6YEre7q9ra1OqtRY9m2BEmVckHk7uLrL")
            .unwrap(),
    );
    let pubkey: libsecp256k1::PublicKey =
        libsecp256k1::PublicKey::parse_compressed(&pubkey_bytes).unwrap();

    let mut signature_bytes: [u8; 64] = [0; 64];
    signature_bytes.copy_from_slice(&base64_standard_engine.decode("SyifqLu+llCqBT8IOroipXV3uh/cpxWRziLCvNbV9Ut+16q3TNaRo4wSIgEoFidsqYTqbGvjJVnBQuKcC85/gg==").unwrap());
    let signature: libsecp256k1::Signature =
        libsecp256k1::Signature::parse_standard(&signature_bytes).unwrap();

    let dispenser_guard: Keypair = Keypair::new();

    let mut simulator = DispenserSimulator::new().await;
    let claimant = simulator.genesis_keypair.pubkey();

    let evm_mock_message = Secp256k1SignedMessage::random(&claimant);

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
            identity: Identity::Cosmwasm(CosmosPubkey(pubkey.serialize()).into_bech32("cosmos")),
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

    let claim_certificates: Vec<ClaimCertificate> = vec![
        ClaimCertificate {
            amount:             100,
            proof_of_identity:  ProofOfIdentity::Evm(evm_mock_message.recover_as_evm_address()),
            proof_of_inclusion: merkle_tree.prove(&merkle_items_serialized[0]).unwrap(),
        },
        ClaimCertificate {
            amount:             200,
            proof_of_identity:  ProofOfIdentity::Discord,
            proof_of_inclusion: merkle_tree.prove(&merkle_items_serialized[1]).unwrap(),
        },
        ClaimCertificate {
            amount:             300,
            proof_of_identity:  ProofOfIdentity::Cosmwasm {
                chain_id:    "cosmos".to_string(),
                signature:   Secp256k1Signature(signature.serialize()),
                recovery_id: 1,
                public_key:  CosmosPubkey(pubkey.serialize()),
                message:     CosmosMessage::new("Pyth Grant Program").get_message_with_metadata(),
            },
            proof_of_inclusion: merkle_tree.prove(&merkle_items_serialized[2]).unwrap(),
        },
    ];

    let message = libsecp256k1::Message::parse_slice(
        &hash::hashv(&[&CosmosMessage::new("Pyth Grant Program").get_message_with_metadata()])
            .to_bytes(),
    )
    .unwrap();
    let recovered_key = libsecp256k1::recover(
        &message,
        &signature,
        &libsecp256k1::RecoveryId::parse(1).unwrap(),
    )
    .unwrap();
    println!("recovered_key: {:?}", recovered_key.serialize());

    let sample_message: &str = r#"{"account_number":"0","chain_id":"","fee":{"amount":[],"gas":"0"},"memo":"","msgs":[{"type":"sign/MsgSignData","value":{"data":"UHl0aCBHcmFudCBQcm9ncmFt","signer":"cosmos1lv3rrn5trdea7vs43z5m4y34d5r3zxp484wcpu"}}],"sequence":"0"}"#;
    let message =
        libsecp256k1::Message::parse_slice(&hash::hashv(&[&sample_message.as_bytes()]).to_bytes())
            .unwrap();
    let recovered_key = libsecp256k1::recover(
        &message,
        &signature,
        &libsecp256k1::RecoveryId::parse(1).unwrap(),
    )
    .unwrap();
    println!("recovered_key: {:?}", recovered_key.serialize());


    // Check state
    for serialized_item in merkle_items_serialized.clone() {
        assert!(simulator
            .get_account(get_receipt_pda(&serialized_item).0)
            .await
            .is_none());
    }

    for claim_certificate in claim_certificates.clone() {
        simulator
            .claim(&dispenser_guard, claim_certificate, &evm_mock_message)
            .await
            .unwrap();
    }

    // Check state
    assert_claim_receipts_exist(&merkle_items_serialized, &mut simulator).await;

    // Can't claim twice
    for claim_certificate in claim_certificates {
        assert_eq!(
            simulator
                .claim(&dispenser_guard, claim_certificate, &evm_mock_message)
                .await
                .unwrap_err()
                .unwrap(),
            ErrorCode::AlreadyClaimed.into_transation_error()
        );
    }

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
