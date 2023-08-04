use {
    super::dispenser_simulator::DispenserSimulator,
    crate::{
        get_cart_pda,
        get_config_pda,
        tests::dispenser_simulator::{
            copy_keypair,
            IntoTransactionError,
        },
        ErrorCode,
    },
    anchor_lang::solana_program::{
        instruction::InstructionError::MissingAccount,
        program_option::COption,
    },
    anchor_spl::{
        associated_token::get_associated_token_address,
        token::spl_token::error::TokenError::{
            InsufficientFunds,
            OwnerMismatch,
        },
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
    simulator
        .airdrop(claimant_1.pubkey(), 1000000000)
        .await
        .unwrap();

    let (merkle_tree, mock_offchain_certificates_and_claimants) = simulator
        .initialize_with_claimants(
            vec![
                copy_keypair(&simulator.genesis_keypair),
                copy_keypair(&claimant_1),
            ],
            &dispenser_guard,
        )
        .await
        .unwrap();

    for (claimant, offchain_claim_certificates) in &mock_offchain_certificates_and_claimants {
        for offchain_claim_certificate in offchain_claim_certificates {
            simulator
                .claim(
                    &copy_keypair(claimant),
                    &dispenser_guard,
                    offchain_claim_certificate,
                    &merkle_tree,
                )
                .await
                .unwrap();
        }
    }

    let fake_claimant = Keypair::new();
    // use invalid claimant with valid cart & claimant_fund
    let res = simulator
        .checkout(
            &fake_claimant,
            simulator.mint_keypair.pubkey(),
            Some(get_cart_pda(&simulator.genesis_keypair.pubkey()).0),
            Some(get_associated_token_address(
                &simulator.genesis_keypair.pubkey(),
                &simulator.mint_keypair.pubkey(),
            )),
        )
        .await;


    assert!(res.is_err());
    // cart for fake claimant is missing.
    assert_eq!(
        res.unwrap_err().unwrap(),
        InstructionError(0, MissingAccount)
    );
    // valid claimant, valid cart, wrong claimant fund - not ATA
    let fake_claimant_fund_keypair = Keypair::new();
    simulator
        .create_token_account(
            simulator.mint_keypair.pubkey(),
            &copy_keypair(&simulator.genesis_keypair),
            &fake_claimant_fund_keypair,
        )
        .await
        .unwrap();

    let res = simulator
        .checkout(
            &copy_keypair(&simulator.genesis_keypair),
            simulator.mint_keypair.pubkey(),
            None,
            Some(fake_claimant_fund_keypair.pubkey()),
        )
        .await;

    assert!(res.is_err());
    // 3014 - AccountNotAssociatedTokenAccount
    assert_eq!(res.unwrap_err().unwrap(), InstructionError(0, Custom(3014)));

    // valid claimant, wrong cart, valid claimant fund
    let res = simulator
        .checkout(
            &copy_keypair(&simulator.genesis_keypair),
            simulator.mint_keypair.pubkey(),
            Some(get_cart_pda(&claimant_1.pubkey()).0),
            None,
        )
        .await;

    assert!(res.is_err());
    // 2006 - ConstraintSeeds
    assert_eq!(res.unwrap_err().unwrap(), InstructionError(0, Custom(2006)));
}

#[tokio::test]
pub async fn test_checkout_fails_with_insufficient_funds() {
    let dispenser_guard: Keypair = Keypair::new();

    let mut simulator = DispenserSimulator::new().await;
    let claimant_1 = Keypair::new();
    simulator
        .airdrop(claimant_1.pubkey(), 1000000000)
        .await
        .unwrap();


    let (merkle_tree, mock_offchain_certificates_and_claimants) = simulator
        .initialize_with_claimants(
            vec![
                copy_keypair(&simulator.genesis_keypair),
                copy_keypair(&claimant_1),
            ],
            &dispenser_guard,
        )
        .await
        .unwrap();

    for (claimant, offchain_claim_certificates) in &mock_offchain_certificates_and_claimants {
        for offchain_claim_certificate in offchain_claim_certificates {
            simulator
                .claim(
                    &copy_keypair(claimant),
                    &dispenser_guard,
                    offchain_claim_certificate,
                    &merkle_tree,
                )
                .await
                .unwrap();
        }
    }

    assert_eq!(
        simulator
            .checkout(
                &copy_keypair(&simulator.genesis_keypair),
                simulator.mint_keypair.pubkey(),
                None,
                None
            )
            .await
            .unwrap_err()
            .unwrap(),
        ErrorCode::InsufficientTreasuryFunds.into_transaction_error()
    );


    let claim_sums = mock_offchain_certificates_and_claimants
        .iter()
        .map(|x| x.1.iter().map(|y| y.amount).sum::<u64>())
        .collect::<Vec<u64>>();

    let total_claim_sum = claim_sums.iter().sum::<u64>();
    simulator.mint_to_treasury(total_claim_sum).await.unwrap();

    // approve enough for first checkout
    let delegated_amount = claim_sums[0] + 1;
    simulator
        .approve_treasury_delegate(get_config_pda().0, delegated_amount)
        .await
        .unwrap();

    simulator
        .verify_token_account_data(
            simulator.pyth_treasury,
            total_claim_sum,
            COption::Some(get_config_pda().0),
            delegated_amount,
        )
        .await
        .unwrap();


    simulator
        .checkout(
            &copy_keypair(&simulator.genesis_keypair),
            simulator.mint_keypair.pubkey(),
            None,
            None,
        )
        .await
        .unwrap();

    simulator
        .verify_token_account_data(
            simulator.pyth_treasury,
            total_claim_sum - claim_sums[0],
            COption::Some(get_config_pda().0),
            1,
        )
        .await
        .unwrap();

    assert_eq!(
        simulator
            .checkout(
                &copy_keypair(&claimant_1),
                simulator.mint_keypair.pubkey(),
                None,
                None,
            )
            .await
            .unwrap_err()
            .unwrap(),
        InsufficientFunds.into_transaction_error()
    );

    let delegated_amount = claim_sums[1] - 1;
    simulator
        .approve_treasury_delegate(get_config_pda().0, delegated_amount)
        .await
        .unwrap();

    simulator
        .verify_token_account_data(
            simulator.pyth_treasury,
            total_claim_sum - claim_sums[0],
            COption::Some(get_config_pda().0),
            delegated_amount,
        )
        .await
        .unwrap();

    assert_eq!(
        simulator
            .checkout(
                &copy_keypair(&claimant_1),
                simulator.mint_keypair.pubkey(),
                None,
                None,
            )
            .await
            .unwrap_err()
            .unwrap(),
        InsufficientFunds.into_transaction_error()
    );

    let delegated_amount = claim_sums[1];
    simulator
        .approve_treasury_delegate(get_config_pda().0, delegated_amount)
        .await
        .unwrap();

    simulator
        .verify_token_account_data(
            simulator.pyth_treasury,
            total_claim_sum - claim_sums[0],
            COption::Some(get_config_pda().0),
            delegated_amount,
        )
        .await
        .unwrap();


    simulator
        .checkout(
            &copy_keypair(&claimant_1),
            simulator.mint_keypair.pubkey(),
            None,
            None,
        )
        .await
        .unwrap();


    simulator
        .verify_token_account_data(simulator.pyth_treasury, 0, COption::None, 0)
        .await
        .unwrap();


    let claimant_pubkeys = vec![simulator.genesis_keypair.pubkey(), claimant_1.pubkey()];
    for (claim_sum, pubkey) in claim_sums.iter().zip(claimant_pubkeys.iter()) {
        simulator
            .verify_token_account_data(
                get_associated_token_address(pubkey, &simulator.mint_keypair.pubkey()),
                *claim_sum,
                COption::None,
                0,
            )
            .await
            .unwrap();
    }
}

#[tokio::test]
pub async fn test_checkout_fails_if_delegate_revoked() {
    let dispenser_guard: Keypair = Keypair::new();

    let mut simulator = DispenserSimulator::new().await;
    let claimant_1 = Keypair::new();
    simulator
        .airdrop(claimant_1.pubkey(), 1000000000)
        .await
        .unwrap();


    let (merkle_tree, mock_offchain_certificates_and_claimants) = simulator
        .initialize_with_claimants(
            vec![
                copy_keypair(&simulator.genesis_keypair),
                copy_keypair(&claimant_1),
            ],
            &dispenser_guard,
        )
        .await
        .unwrap();

    for (claimant, offchain_claim_certificates) in &mock_offchain_certificates_and_claimants {
        for offchain_claim_certificate in offchain_claim_certificates {
            simulator
                .claim(
                    &copy_keypair(claimant),
                    &dispenser_guard,
                    offchain_claim_certificate,
                    &merkle_tree,
                )
                .await
                .unwrap();
        }
    }


    let claim_sums = mock_offchain_certificates_and_claimants
        .iter()
        .map(|x| x.1.iter().map(|y| y.amount).sum::<u64>())
        .collect::<Vec<u64>>();

    let total_claim_sum = claim_sums.iter().sum::<u64>();
    simulator.mint_to_treasury(total_claim_sum).await.unwrap();


    simulator
        .approve_treasury_delegate(get_config_pda().0, total_claim_sum)
        .await
        .unwrap();

    simulator
        .verify_token_account_data(
            simulator.pyth_treasury,
            total_claim_sum,
            COption::Some(get_config_pda().0),
            total_claim_sum,
        )
        .await
        .unwrap();


    simulator.revoke_treasury_delegate().await.unwrap();
    simulator
        .verify_token_account_data(simulator.pyth_treasury, total_claim_sum, COption::None, 0)
        .await
        .unwrap();

    assert_eq!(
        simulator
            .checkout(
                &copy_keypair(&simulator.genesis_keypair),
                simulator.mint_keypair.pubkey(),
                None,
                None,
            )
            .await
            .unwrap_err()
            .unwrap(),
        OwnerMismatch.into_transaction_error()
    );

    simulator
        .approve_treasury_delegate(get_config_pda().0, claim_sums[0])
        .await
        .unwrap();

    simulator
        .verify_token_account_data(
            simulator.pyth_treasury,
            total_claim_sum,
            COption::Some(get_config_pda().0),
            claim_sums[0],
        )
        .await
        .unwrap();

    simulator
        .checkout(
            &copy_keypair(&simulator.genesis_keypair),
            simulator.mint_keypair.pubkey(),
            None,
            None,
        )
        .await
        .unwrap();


    simulator
        .verify_token_account_data(
            simulator.pyth_treasury,
            total_claim_sum - claim_sums[0],
            COption::None,
            0,
        )
        .await
        .unwrap();


    simulator
        .verify_token_account_data(
            get_associated_token_address(
                &copy_keypair(&simulator.genesis_keypair).pubkey(),
                &simulator.mint_keypair.pubkey(),
            ),
            claim_sums[0],
            COption::None,
            0,
        )
        .await
        .unwrap();
}
