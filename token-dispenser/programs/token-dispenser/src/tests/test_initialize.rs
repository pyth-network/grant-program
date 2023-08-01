use {
    super::dispenser_simulator::DispenserSimulator,
    crate::{
        get_config_pda,
        tests::{
            dispenser_simulator::copy_keypair,
            merkleize,
            test_happy_path::TestClaimCertificate,
        },
        ClaimInfo,
    },
    anchor_lang::solana_program::instruction::InstructionError::{
        Custom,
        MissingAccount,
    },
    anchor_spl::associated_token::get_associated_token_address,
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

    let mock_offchain_certificates = vec![
        TestClaimCertificate::random_evm(&claimant),
        TestClaimCertificate::random_cosmos(&claimant),
        TestClaimCertificate::random_discord(),
    ];

    let merkle_items: Vec<ClaimInfo> = mock_offchain_certificates
        .iter()
        .map(|item: &TestClaimCertificate| item.clone().into())
        .collect();

    let (merkle_tree, _) = merkleize(merkle_items);

    let config_pubkey = get_config_pda().0;


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
        .create_mint(
            &fake_mint_keypair,
            &copy_keypair(&simulator.genesis_keypair),
            0,
        )
        .await
        .unwrap();
    // create treasury (associated token account) from a different mint
    let invalid_treasury =
        get_associated_token_address(&(config_pubkey), &fake_mint_keypair.pubkey());

    let res = simulator
        .initialize(
            merkle_tree.root.clone(),
            dispenser_guard.pubkey(),
            None,
            Some(invalid_treasury),
        )
        .await;
    assert!(res.is_err());
    assert_eq!(
        res.unwrap_err().unwrap(),
        InstructionError(0, MissingAccount)
    );

    // create token account with correct mint but not an associated token account
    let fake_treasury_keypair = Keypair::new();
    simulator
        .create_token_account(
            simulator.mint_keypair.pubkey(),
            &copy_keypair(&simulator.genesis_keypair),
            &fake_treasury_keypair,
        )
        .await
        .unwrap();

    let res = simulator
        .initialize(
            merkle_tree.root.clone(),
            dispenser_guard.pubkey(),
            None,
            Some(fake_treasury_keypair.pubkey()), //incorrect treasury
        )
        .await;
    assert!(res.is_err());
    // associated token account for treasury is missing
    assert_eq!(
        res.unwrap_err().unwrap(),
        InstructionError(0, MissingAccount)
    );
}
