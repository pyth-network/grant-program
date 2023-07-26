use {
    super::dispenser_simulator::DispenserSimulator,
    crate::{
        get_config_pda,
        tests::{
            merkleize,
            test_happy_path::TestClaimCertificate,
        },
        ClaimInfo,
        Config,
    },
    anchor_lang::{
        solana_program::instruction::InstructionError::Custom,
        Id,
    },
    anchor_spl::{
        associated_token::get_associated_token_address_with_program_id,
        token::Token,
    },
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
    let treasury = get_associated_token_address_with_program_id(
        &(config_pubkey),
        &simulator.mint_keypair.pubkey(),
        &Token::id(),
    );

    let target_config = Config {
        merkle_root: merkle_tree.root.clone(),
        dispenser_guard: dispenser_guard.pubkey(),
        mint: Keypair::new().pubkey(), //incorrect mint
        treasury,
    };


    let res = simulator.initialize(target_config).await;
    assert!(res.is_err());
    // 2012 - ConstraintAddress
    assert_eq!(res.unwrap_err().unwrap(), InstructionError(0, Custom(2012)));

    let target_config = Config {
        merkle_root:     merkle_tree.root.clone(),
        dispenser_guard: dispenser_guard.pubkey(),
        mint:            simulator.mint_keypair.pubkey(),
        treasury:        Keypair::new().pubkey(), //incorrect treasury
    };

    let res = simulator.initialize(target_config).await;
    assert!(res.is_err());
    // 2012 - ConstraintAddress
    assert_eq!(res.unwrap_err().unwrap(), InstructionError(0, Custom(2012)));
}
