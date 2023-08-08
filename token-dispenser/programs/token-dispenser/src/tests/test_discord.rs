use {
    super::{
        dispenser_simulator::DispenserSimulator,
        merkleize,
        test_happy_path::TestClaimCertificate,
    },
    crate::{
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

    let (merkle_tree, _) = merkleize(merkle_items);

    simulator
        .initialize(
            merkle_tree.root.clone(),
            dispenser_guard.pubkey(),
            None,
            None,
        )
        .await
        .unwrap();

    // Wrong dispenser guard has signed the message
    assert_eq!(
        simulator
            .claim(
                &copy_keypair(&simulator.genesis_keypair),
                &dispenser_guard,
                &mock_offchain_certificates[1],
                &merkle_tree
            )
            .await
            .unwrap_err()
            .unwrap(),
        ErrorCode::SignatureVerificationWrongSigner.into_transaction_error(0)
    );
    assert!(simulator
        .claim(
            &copy_keypair(&simulator.genesis_keypair),
            &dispenser_guard,
            &mock_offchain_certificates[0],
            &merkle_tree
        )
        .await
        .is_ok());
    // Wrong dispenser guard has signed the message
    assert_eq!(
        simulator
            .claim(
                &copy_keypair(&simulator.genesis_keypair),
                &dispenser_guard,
                &mock_offchain_certificates[1],
                &merkle_tree
            )
            .await
            .unwrap_err()
            .unwrap(),
        ErrorCode::SignatureVerificationWrongSigner.into_transaction_error(0)
    );
    assert_eq!(
        simulator
            .claim(
                &copy_keypair(&simulator.genesis_keypair),
                &dispenser_guard,
                &mock_offchain_certificates[0],
                &merkle_tree
            )
            .await
            .unwrap_err()
            .unwrap(),
        ErrorCode::AlreadyClaimed.into_transaction_error()
    );
}
