use {
    super::{
        dispenser_simulator::DispenserSimulator,
        merkleize,
        test_happy_path::TestClaimCertificate,
    },
    crate::{
        get_config_pda,
        tests::dispenser_simulator::{
            copy_keypair,
            IntoTransactionError,
        },
        ClaimInfo,
        ErrorCode,
    },
    solana_program_test::tokio,
    solana_sdk::signer::{
        keypair::Keypair,
        Signer,
    },
};

#[tokio::test]
pub async fn test_discord() {
    let dispenser_guard: Keypair = Keypair::new();

    let mut simulator = DispenserSimulator::new().await;


    let mock_offchain_certificates: Vec<TestClaimCertificate> = vec![
        TestClaimCertificate::random_discord(
            &simulator.genesis_keypair.pubkey(),
            &ed25519_dalek::Keypair::from_bytes(&dispenser_guard.to_bytes()).unwrap(),
        ),
        TestClaimCertificate::random_discord(
            &simulator.genesis_keypair.pubkey(),
            &ed25519_dalek::Keypair::generate(&mut rand_compatible::thread_rng()),
        ),
    ];

    let merkle_items: Vec<ClaimInfo> = mock_offchain_certificates
        .iter()
        .map(|item: &TestClaimCertificate| item.clone().into())
        .collect();

    let total_claim_sum = merkle_items.iter().fold(0, |acc, item| acc + item.amount);
    let (merkle_tree, _) = merkleize(merkle_items);
    let address_lookup_table = simulator.init_lookup_table().await.unwrap();
    simulator
        .initialize(
            merkle_tree.root.clone(),
            dispenser_guard.pubkey(),
            address_lookup_table,
            None,
            None,
        )
        .await
        .unwrap();

    simulator
        .create_associated_token_account(
            &simulator.genesis_keypair.pubkey(),
            &simulator.mint_keypair.pubkey(),
        )
        .await
        .unwrap();

    simulator.mint_to_treasury(total_claim_sum).await.unwrap();
    simulator
        .approve_treasury_delegate(get_config_pda().0, total_claim_sum)
        .await
        .unwrap();


    // Wrong dispenser guard has signed the message
    assert_eq!(
        simulator
            .claim(
                &copy_keypair(&simulator.genesis_keypair),
                &mock_offchain_certificates[1],
                &merkle_tree,
                None,
                None,
                None
            )
            .await
            .unwrap_err()
            .unwrap(),
        ErrorCode::SignatureVerificationWrongSigner.into_transaction_error(1)
    );
    assert!(simulator
        .claim(
            &copy_keypair(&simulator.genesis_keypair),
            &mock_offchain_certificates[0],
            &merkle_tree,
            None,
            None,
            None
        )
        .await
        .is_ok());

    assert_eq!(
        simulator
            .claim(
                &copy_keypair(&simulator.genesis_keypair),
                &mock_offchain_certificates[0],
                &merkle_tree,
                None,
                None,
                None
            )
            .await
            .unwrap_err()
            .unwrap(),
        ErrorCode::AlreadyClaimed.into_transaction_error(1)
    );
}
