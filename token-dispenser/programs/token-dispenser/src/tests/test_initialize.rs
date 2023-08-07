use {
    super::dispenser_simulator::DispenserSimulator,
    crate::{
        tests::{
            dispenser_simulator::copy_keypair,
            merkleize,
            test_happy_path::TestClaimCertificate,
        },
        ClaimInfo,
    },
    anchor_lang::solana_program::instruction::InstructionError::Custom,
    solana_program_test::tokio,
    solana_sdk::{
        signature::Keypair,
        signer::Signer,
        transaction::TransactionError::InstructionError,
    },
};


#[tokio::test]
pub async fn test_initialize_fails_with_incorrect_accounts() {
    let dispenser_guard: Keypair = Keypair::new();

    let mut simulator = DispenserSimulator::new().await;
    let claimant = simulator.genesis_keypair.pubkey();

    let mock_offchain_certificates = DispenserSimulator::generate_test_claim_certs(claimant);

    let merkle_items: Vec<ClaimInfo> = mock_offchain_certificates
        .iter()
        .map(|item: &TestClaimCertificate| item.clone().into())
        .collect();

    let (merkle_tree, _) = merkleize(merkle_items);


    let res = simulator
        .initialize(
            merkle_tree.root.clone(),
            dispenser_guard.pubkey(),
            Some(Keypair::new().pubkey()), //invalid mint
            None,
        )
        .await;
    assert!(res.is_err());

    // 3012 - AccountNotInitialized
    assert_eq!(res.unwrap_err().unwrap(), InstructionError(0, Custom(3012)));

    let fake_mint_keypair = Keypair::new();
    simulator
        .create_mint(&fake_mint_keypair, &simulator.genesis_keypair.pubkey(), 0)
        .await
        .unwrap();
    // create treasury (associated token account) from a different mint
    let invalid_treasury = Keypair::new();
    simulator
        .create_token_account(
            fake_mint_keypair.pubkey(),
            &copy_keypair(&simulator.genesis_keypair),
            &invalid_treasury,
        )
        .await
        .unwrap();

    let res = simulator
        .initialize(
            merkle_tree.root.clone(),
            dispenser_guard.pubkey(),
            None,
            Some(invalid_treasury.pubkey()),
        )
        .await;
    assert!(res.is_err());
    // 2014- ConstraintTokenMint
    assert_eq!(res.unwrap_err().unwrap(), InstructionError(0, Custom(2014)));
}
