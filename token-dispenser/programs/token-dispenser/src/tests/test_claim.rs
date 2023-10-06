use {
    super::dispenser_simulator::DispenserSimulator,
    crate::{
        get_config_pda,
        get_receipt_pda,
        tests::{
            dispenser_simulator::{
                copy_keypair,
                IntoTransactionError,
            },
            test_happy_path::TestClaimCertificate,
        },
        ClaimInfo,
        ErrorCode,
        SolanaHasher,
    },
    anchor_lang::{
        prelude::Pubkey,
        solana_program::program_option::COption,
        system_program,
        AnchorSerialize,
    },
    anchor_spl::{
        associated_token::get_associated_token_address,
        token::spl_token::error::TokenError::{
            InsufficientFunds,
            OwnerMismatch,
        },
    },
    pythnet_sdk::accumulators::{
        merkle::MerkleTree,
        Accumulator,
    },
    solana_program_test::tokio,
    solana_sdk::{
        account::Account,
        native_token::LAMPORTS_PER_SOL,
        signature::Keypair,
        signer::Signer,
    },
};


#[tokio::test]
pub async fn test_claim_fails_with_wrong_accounts() {
    let dispenser_guard: Keypair = Keypair::new();

    let mut simulator = DispenserSimulator::new().await;
    let claimant_1 = Keypair::new();

    let (merkle_tree, mock_offchain_certificates_and_claimants) = simulator
        .initialize_with_claimants(
            vec![
                copy_keypair(&simulator.genesis_keypair),
                copy_keypair(&claimant_1),
            ],
            &dispenser_guard,
            None,
        )
        .await
        .unwrap();

    let fake_claimant = Keypair::new();
    let fake_claimant_fund =
        get_associated_token_address(&fake_claimant.pubkey(), &simulator.mint_keypair.pubkey());

    for (claimant, offchain_claim_certificates, _) in &mock_offchain_certificates_and_claimants {
        for offchain_claim_certificate in offchain_claim_certificates {
            let ix_index_error =
                offchain_claim_certificate.as_instruction_error_index(&merkle_tree);
            assert_eq!(
                simulator
                    .claim(
                        &copy_keypair(claimant),
                        offchain_claim_certificate,
                        &merkle_tree,
                        Some(fake_claimant_fund),
                        None,
                        None
                    )
                    .await
                    .unwrap_err()
                    .unwrap(),
                solana_sdk::instruction::InstructionError::MissingAccount
                    .into_transaction_error(ix_index_error)
            );
        }
    }

    // initialize fake claimant fund
    simulator
        .create_associated_token_account(&fake_claimant.pubkey(), &simulator.mint_keypair.pubkey())
        .await
        .unwrap();

    for (claimant, offchain_claim_certificates, _) in &mock_offchain_certificates_and_claimants {
        for offchain_claim_certificate in offchain_claim_certificates {
            let ix_index_error =
                offchain_claim_certificate.as_instruction_error_index(&merkle_tree);
            assert_eq!(
                simulator
                    .claim(
                        &copy_keypair(claimant),
                        offchain_claim_certificate,
                        &merkle_tree,
                        Some(fake_claimant_fund),
                        None,
                        None
                    )
                    .await
                    .unwrap_err()
                    .unwrap(),
                anchor_lang::error::ErrorCode::ConstraintTokenOwner
                    .into_transaction_error(ix_index_error)
            );
        }
    }

    for (claimant, offchain_claim_certificates, _) in &mock_offchain_certificates_and_claimants {
        for offchain_claim_certificate in offchain_claim_certificates {
            simulator
                .claim(
                    &copy_keypair(claimant),
                    offchain_claim_certificate,
                    &merkle_tree,
                    None,
                    None,
                    None,
                )
                .await
                .unwrap();
        }
    }


    // valid claimant, wrong claimant fund account type (not ATA)
    let mut fake_claimant_funds = vec![];
    for (claimant, _, _) in &mock_offchain_certificates_and_claimants {
        let fake_claimant_fund_keypair = Keypair::new();
        simulator
            .create_token_account(
                simulator.mint_keypair.pubkey(),
                &copy_keypair(claimant),
                &fake_claimant_fund_keypair,
            )
            .await
            .unwrap();
        fake_claimant_funds.push(fake_claimant_fund_keypair.pubkey());
    }

    for (i, (claimant, offchain_claim_certificates, _)) in
        mock_offchain_certificates_and_claimants.iter().enumerate()
    {
        for offchain_claim_certificate in offchain_claim_certificates {
            let ix_index_error =
                offchain_claim_certificate.as_instruction_error_index(&merkle_tree);
            assert_eq!(
                simulator
                    .claim(
                        &copy_keypair(claimant),
                        offchain_claim_certificate,
                        &merkle_tree,
                        Some(fake_claimant_funds[i]),
                        None,
                        None
                    )
                    .await
                    .unwrap_err()
                    .unwrap(),
                anchor_lang::error::ErrorCode::AccountNotAssociatedTokenAccount
                    .into_transaction_error(ix_index_error)
            );
        }
    }
}

#[tokio::test]
pub async fn test_claim_fails_with_insufficient_funds() {
    let dispenser_guard: Keypair = Keypair::new();

    let mut simulator = DispenserSimulator::new().await;
    let claimant_1 = Keypair::new();

    let (merkle_tree, mock_offchain_certificates_and_claimants) = simulator
        .initialize_with_claimants(
            vec![
                copy_keypair(&simulator.genesis_keypair),
                copy_keypair(&claimant_1),
            ],
            &dispenser_guard,
            None,
        )
        .await
        .unwrap();

    let total_claim_sum = mock_offchain_certificates_and_claimants
        .iter()
        .map(|(_, _, amount)| amount)
        .sum::<u64>();

    // approve enough for first checkout
    let delegated_amount = mock_offchain_certificates_and_claimants[0].2 + 1;
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

    // claim everything for first claimant
    let (claimant, offchain_claim_certificates, _) = &mock_offchain_certificates_and_claimants[0];
    for offchain_claim_certificate in offchain_claim_certificates {
        simulator
            .claim(
                &copy_keypair(claimant),
                offchain_claim_certificate,
                &merkle_tree,
                None,
                None,
                None,
            )
            .await
            .unwrap();
    }

    simulator
        .verify_token_account_data(
            simulator.pyth_treasury,
            total_claim_sum - mock_offchain_certificates_and_claimants[0].2,
            COption::Some(get_config_pda().0),
            1,
        )
        .await
        .unwrap();

    let (claimant, offchain_claim_certificates, _) = &mock_offchain_certificates_and_claimants[1];
    for offchain_claim_certificate in offchain_claim_certificates {
        let ix_index_error = offchain_claim_certificate.as_instruction_error_index(&merkle_tree);
        assert_eq!(
            simulator
                .claim(
                    &copy_keypair(claimant),
                    offchain_claim_certificate,
                    &merkle_tree,
                    None,
                    None,
                    None
                )
                .await
                .unwrap_err()
                .unwrap(),
            InsufficientFunds.into_transaction_error(ix_index_error)
        );
    }


    let delegated_amount = mock_offchain_certificates_and_claimants[1].2;
    simulator
        .approve_treasury_delegate(get_config_pda().0, delegated_amount)
        .await
        .unwrap();

    simulator
        .verify_token_account_data(
            simulator.pyth_treasury,
            mock_offchain_certificates_and_claimants[1].2,
            COption::Some(get_config_pda().0),
            delegated_amount,
        )
        .await
        .unwrap();

    for offchain_claim_certificate in offchain_claim_certificates {
        simulator
            .claim(
                &copy_keypair(claimant),
                offchain_claim_certificate,
                &merkle_tree,
                None,
                None,
                None,
            )
            .await
            .unwrap();
    }

    simulator
        .verify_token_account_data(simulator.pyth_treasury, 0, COption::None, 0)
        .await
        .unwrap();

    for (claimant, _, amount) in &mock_offchain_certificates_and_claimants {
        simulator
            .verify_token_account_data(
                get_associated_token_address(&claimant.pubkey(), &simulator.mint_keypair.pubkey()),
                *amount,
                COption::None,
                0,
            )
            .await
            .unwrap();
    }
}

#[tokio::test]
pub async fn test_claim_fails_if_delegate_revoked() {
    let dispenser_guard: Keypair = Keypair::new();

    let mut simulator = DispenserSimulator::new().await;
    let claimant_1 = Keypair::new();

    let (merkle_tree, mock_offchain_certificates_and_claimants) = simulator
        .initialize_with_claimants(
            vec![
                copy_keypair(&simulator.genesis_keypair),
                copy_keypair(&claimant_1),
            ],
            &dispenser_guard,
            None,
        )
        .await
        .unwrap();

    let total_claim_sum = mock_offchain_certificates_and_claimants
        .iter()
        .map(|(_, _, amount)| amount)
        .sum::<u64>();

    simulator.revoke_treasury_delegate().await.unwrap();
    simulator
        .verify_token_account_data(simulator.pyth_treasury, total_claim_sum, COption::None, 0)
        .await
        .unwrap();

    for (claimant, offchain_claim_certificates, _) in &mock_offchain_certificates_and_claimants {
        for offchain_claim_certificate in offchain_claim_certificates {
            let ix_index_error =
                offchain_claim_certificate.as_instruction_error_index(&merkle_tree);
            assert_eq!(
                simulator
                    .claim(
                        &copy_keypair(claimant),
                        offchain_claim_certificate,
                        &merkle_tree,
                        None,
                        None,
                        None
                    )
                    .await
                    .unwrap_err()
                    .unwrap(),
                OwnerMismatch.into_transaction_error(ix_index_error)
            );
        }
    }

    simulator
        .approve_treasury_delegate(
            get_config_pda().0,
            mock_offchain_certificates_and_claimants[0].2,
        )
        .await
        .unwrap();

    simulator
        .verify_token_account_data(
            simulator.pyth_treasury,
            total_claim_sum,
            COption::Some(get_config_pda().0),
            mock_offchain_certificates_and_claimants[0].2,
        )
        .await
        .unwrap();


    let (claimant, offchain_claim_certificates, _) = &mock_offchain_certificates_and_claimants[0];
    for offchain_claim_certificate in offchain_claim_certificates {
        simulator
            .claim(
                &copy_keypair(claimant),
                offchain_claim_certificate,
                &merkle_tree,
                None,
                None,
                None,
            )
            .await
            .unwrap();
    }

    simulator
        .verify_token_account_data(
            simulator.pyth_treasury,
            total_claim_sum - mock_offchain_certificates_and_claimants[0].2,
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
            mock_offchain_certificates_and_claimants[0].2,
            COption::None,
            0,
        )
        .await
        .unwrap();
}

#[tokio::test]
pub async fn test_claim_fails_with_wrong_merkle_proof() {
    let dispenser_guard: Keypair = Keypair::new();

    let mut simulator = DispenserSimulator::new().await;
    let claimant_1 = Keypair::new();

    let (merkle_tree, mock_offchain_certificates_and_claimants) = simulator
        .initialize_with_claimants(
            vec![
                copy_keypair(&simulator.genesis_keypair),
                copy_keypair(&claimant_1),
            ],
            &dispenser_guard,
            None,
        )
        .await
        .unwrap();

    let fake_tree_leaf = b"This is a fake tree";
    let fake_merkle_tree = MerkleTree::<SolanaHasher>::new(&[fake_tree_leaf]).unwrap();

    for (claimant, offchain_claim_certificates, _) in &mock_offchain_certificates_and_claimants {
        for offchain_claim_certificate in offchain_claim_certificates {
            let ix_index_error =
                offchain_claim_certificate.as_instruction_error_index(&merkle_tree);
            assert_eq!(
                simulator
                    .claim(
                        &copy_keypair(claimant),
                        offchain_claim_certificate,
                        &merkle_tree,
                        None,
                        Some(fake_merkle_tree.prove(fake_tree_leaf).unwrap()),
                        None
                    )
                    .await
                    .unwrap_err()
                    .unwrap(),
                ErrorCode::InvalidInclusionProof.into_transaction_error(ix_index_error)
            );
        }
    }
}

#[tokio::test]
pub async fn test_claim_fails_with_wrong_receipt_pubkey() {
    let dispenser_guard: Keypair = Keypair::new();

    let mut simulator = DispenserSimulator::new().await;
    let claimant_1 = Keypair::new();

    let (merkle_tree, mock_offchain_certificates_and_claimants) = simulator
        .initialize_with_claimants(
            vec![
                copy_keypair(&simulator.genesis_keypair),
                copy_keypair(&claimant_1),
            ],
            &dispenser_guard,
            None,
        )
        .await
        .unwrap();

    for (claimant, offchain_claim_certificates, _) in &mock_offchain_certificates_and_claimants {
        for offchain_claim_certificate in offchain_claim_certificates {
            let ix_index_error =
                offchain_claim_certificate.as_instruction_error_index(&merkle_tree);
            assert_eq!(
                simulator
                    .claim(
                        &copy_keypair(claimant),
                        offchain_claim_certificate,
                        &merkle_tree,
                        None,
                        None,
                        Some(Pubkey::new_unique())
                    )
                    .await
                    .unwrap_err()
                    .unwrap(),
                ErrorCode::WrongPda.into_transaction_error(ix_index_error)
            );
        }
    }
}

#[tokio::test]
pub async fn test_claim_works_if_receipt_has_balance() {
    let dispenser_guard: Keypair = Keypair::new();

    let mut simulator = DispenserSimulator::new().await;
    let claimant_1 = Keypair::new();

    let (merkle_tree, mock_offchain_certificates_and_claimants) = simulator
        .initialize_with_claimants(vec![copy_keypair(&claimant_1)], &dispenser_guard, None)
        .await
        .unwrap();

    let (claimant, offchain_claim_certificates, _) = &mock_offchain_certificates_and_claimants[0];
    for offchain_claim_certificate in offchain_claim_certificates {
        let receipt_pda = get_receipt_pda(
            &<TestClaimCertificate as Into<ClaimInfo>>::into(offchain_claim_certificate.clone())
                .try_to_vec()
                .unwrap(),
        )
        .0;

        simulator
            .airdrop(receipt_pda, LAMPORTS_PER_SOL)
            .await
            .unwrap();

        let receipt_account: Account = simulator.get_account(receipt_pda).await.unwrap();


        assert_eq!(receipt_account.lamports, LAMPORTS_PER_SOL);
        assert_eq!(receipt_account.owner, system_program::ID);

        assert!(simulator
            .claim(
                &copy_keypair(claimant),
                offchain_claim_certificate,
                &merkle_tree,
                None,
                None,
                None
            )
            .await
            .is_ok());

        let receipt_account: Account = simulator.get_account(receipt_pda).await.unwrap();


        assert_eq!(receipt_account.lamports, LAMPORTS_PER_SOL);
        assert_eq!(receipt_account.owner, crate::id());


        let ix_index_error = offchain_claim_certificate.as_instruction_error_index(&merkle_tree);
        assert_eq!(
            simulator
                .claim(
                    &copy_keypair(claimant),
                    offchain_claim_certificate,
                    &merkle_tree,
                    None,
                    None,
                    None
                )
                .await
                .unwrap_err()
                .unwrap(),
            ErrorCode::AlreadyClaimed.into_transaction_error(ix_index_error)
        );
    }
}


#[tokio::test]
pub async fn test_claim_fails_if_exceeds_max_transfer() {
    let dispenser_guard: Keypair = Keypair::new();

    let mut simulator = DispenserSimulator::new().await;
    let claimant = Keypair::new();

    let (merkle_tree, mock_offchain_certificates_and_claimants) = simulator
        .initialize_with_claimants(vec![copy_keypair(&claimant)], &dispenser_guard, Some(0))
        .await
        .unwrap();

    let (_, offchain_claim_certificates, _) = &mock_offchain_certificates_and_claimants[0];
    for offchain_claim_certificate in offchain_claim_certificates {
        let receipt_pda = get_receipt_pda(
            &<TestClaimCertificate as Into<ClaimInfo>>::into(offchain_claim_certificate.clone())
                .try_to_vec()
                .unwrap(),
        )
        .0;
        assert!(simulator.get_account(receipt_pda).await.is_none());

        let ix_index_error = offchain_claim_certificate.as_instruction_error_index(&merkle_tree);
        assert_eq!(
            simulator
                .claim(
                    &claimant,
                    offchain_claim_certificate,
                    &merkle_tree,
                    None,
                    None,
                    None
                )
                .await
                .unwrap_err()
                .unwrap(),
            ErrorCode::TransferExceedsMax.into_transaction_error(ix_index_error)
        );

        assert!(simulator.get_account(receipt_pda).await.is_none());
    }
}
