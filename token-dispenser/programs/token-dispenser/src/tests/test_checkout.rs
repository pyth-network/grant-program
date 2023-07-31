use {
    super::dispenser_simulator::DispenserSimulator,
    crate::{
        get_cart_pda,
        tests::dispenser_simulator::copy_keypair,
    },
    anchor_lang::solana_program::{
        instruction::InstructionError::MissingAccount,
        system_instruction,
    },
    solana_program_test::tokio,
    solana_sdk::{
        instruction::InstructionError::Custom,
        signature::Keypair,
        signer::Signer,
        transaction::TransactionError::InstructionError,
    },
};


#[tokio::test]
pub async fn test_checkout_fails_with_wrong_accounts() {
    let dispenser_guard: Keypair = Keypair::new();

    let mut simulator = DispenserSimulator::new().await;
    let claimant_1 = Keypair::new();
    let claimant_1_airdrop_ix = system_instruction::transfer(
        &simulator.genesis_keypair.pubkey(),
        &claimant_1.pubkey(),
        1000000000,
    );

    simulator
        .process_ix(&vec![claimant_1_airdrop_ix], &vec![])
        .await
        .unwrap();

    simulator
        .initialize_and_claim_happy_path(
            vec![
                &copy_keypair(&simulator.genesis_keypair),
                &copy_keypair(&claimant_1),
            ],
            &dispenser_guard,
        )
        .await
        .unwrap();

    let fake_claimant = Keypair::new();
    let checkout_ix = simulator.checkout_ix(Some(fake_claimant.pubkey()), None, None);
    let res = simulator
        .process_ix(&vec![checkout_ix], &vec![&fake_claimant])
        .await;
    assert!(res.is_err());
    assert_eq!(
        res.unwrap_err().unwrap(),
        InstructionError(0, MissingAccount)
    );
    // wrong claimant fund - not ATA
    let fake_claimant_fund_keypair = Keypair::new();
    simulator
        .create_token_account(
            simulator.mint_keypair.pubkey(),
            &copy_keypair(&simulator.genesis_keypair),
            &fake_claimant_fund_keypair,
        )
        .await
        .unwrap();

    let checkout_ix = simulator.checkout_ix(None, None, Some(fake_claimant_fund_keypair.pubkey()));

    let res = simulator.process_ix(&vec![checkout_ix], &vec![]).await;
    assert!(res.is_err());
    // 3014 - AccountNotAssociatedTokenAccount
    assert_eq!(res.unwrap_err().unwrap(), InstructionError(0, Custom(3014)));

    let checkout_ix = simulator.checkout_ix(
        None,
        Some(get_cart_pda(&claimant_1.pubkey()).0), // use someone else's cart
        None,
    );

    let res = simulator.process_ix(&vec![checkout_ix], &vec![]).await;
    assert!(res.is_err());
    // 2006 - ConstraintSeeds
    assert_eq!(res.unwrap_err().unwrap(), InstructionError(0, Custom(2006)));
}
