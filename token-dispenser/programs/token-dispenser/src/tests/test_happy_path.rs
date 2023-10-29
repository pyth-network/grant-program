use {
    super::{
        dispenser_simulator::DispenserSimulator,
        test_cosmos::Sha256,
        test_ed25519::Ed25519TestIdentityCertificate,
        test_secp256k1::Secp256k1TestIdentityCertificate,
        test_solana::SolanaTestIdentityCertificate,
    },
    crate::{
        ecosystems::{
            aptos::AptosMessage,
            cosmos::CosmosMessage,
            discord::DiscordMessage,
            evm::EvmPrefixedMessage,
            sui::SuiMessage,
        },
        get_config_pda,
        get_receipt_pda,
        tests::{
            dispenser_simulator::{
                copy_keypair,
                IntoTransactionError,
            },
            merkleize,
        },
        ClaimCertificate,
        ClaimInfo,
        Config,
        ErrorCode,
        Identity,
        IdentityCertificate,
        SolanaHasher,
    },
    anchor_lang::{
        prelude::Pubkey,
        solana_program::program_option::COption,
        AnchorDeserialize,
        AnchorSerialize,
    },
    anchor_spl::associated_token::get_associated_token_address,
    pythnet_sdk::{
        accumulators::{
            merkle::{
                MerklePath,
                MerkleTree,
            },
            Accumulator,
        },
        hashers::keccak256::Keccak256,
    },
    rand::Rng,
    solana_program_test::tokio,
    solana_sdk::{
        account::Account,
        instruction::Instruction,
        signature::Keypair,
        signer::Signer,
    },
};


/**
 * There's a chicken and egg problem in the tests.
 * We first want to generate all the signatures so that it's easy for us to simulate claiming.
 * However, the struct that contains the signature, `ClaimCertificate` requires the merkle proof.
 * But the only way to get the merkle proof is converting the `ClaimCertificate` into `ClaimInfo` and constructing the tree.
 * Therefore we use `TestClaimCertificate` from which both `ClaimCerticate` and `ClaimInfo` can be derived.
 * The testing flow is intended to be:
 * - Create a set of `TestClaimCertificate`s with the desired amounts and identities
 * - Create a `MerkleTree` from the `TestClaimCertificate`s
 * - Use the `TestClaimCertificate`s to create the `ClaimInfo`s
 * - Use the `TestClaimCertificate`s and the `MerkleTree` to create the `ClaimCertificate`s
 * */
#[derive(Clone)]
pub struct TestClaimCertificate {
    pub amount:                      u64,
    pub off_chain_proof_of_identity: TestIdentityCertificate,
}

pub const MAX_AMOUNT: u64 = 1000;
impl TestClaimCertificate {
    pub fn random_amount() -> u64 {
        rand::thread_rng().gen::<u64>() % MAX_AMOUNT
    }

    pub fn random_evm(claimant: &Pubkey) -> Self {
        Self {
            amount:                      Self::random_amount(),
            off_chain_proof_of_identity: TestIdentityCertificate::Evm(
                Secp256k1TestIdentityCertificate::<EvmPrefixedMessage, Keccak256>::random(claimant),
            ),
        }
    }

    pub fn random_cosmos(claimant: &Pubkey) -> Self {
        Self {
            amount:                      Self::random_amount(),
            off_chain_proof_of_identity: TestIdentityCertificate::Cosmos(
                Secp256k1TestIdentityCertificate::<CosmosMessage, Sha256>::random(claimant),
            ),
        }
    }

    pub fn random_discord(claimant: &Pubkey, signer: &ed25519_dalek::Keypair) -> Self {
        Self {
            amount:                      Self::random_amount(),
            off_chain_proof_of_identity: TestIdentityCertificate::Discord(
                Ed25519TestIdentityCertificate::<DiscordMessage>::new(claimant, signer),
            ),
        }
    }

    pub fn random_aptos(claimant: &Pubkey) -> Self {
        Self {
            amount:                      Self::random_amount(),
            off_chain_proof_of_identity: TestIdentityCertificate::Aptos(
                Ed25519TestIdentityCertificate::<AptosMessage>::random(claimant),
            ),
        }
    }

    pub fn random_sui(claimant: &Pubkey) -> Self {
        Self {
            amount:                      Self::random_amount(),
            off_chain_proof_of_identity: TestIdentityCertificate::Sui(
                Ed25519TestIdentityCertificate::<SuiMessage>::random(claimant),
            ),
        }
    }

    pub fn random_solana(claimant: &Pubkey) -> Self {
        Self {
            amount:                      Self::random_amount(),
            off_chain_proof_of_identity: TestIdentityCertificate::Solana(
                SolanaTestIdentityCertificate::new(claimant),
            ),
        }
    }

    pub fn random_injective(claimant: &Pubkey) -> Self {
        Self {
            amount:                      Self::random_amount(),
            off_chain_proof_of_identity: TestIdentityCertificate::Injective(
                Secp256k1TestIdentityCertificate::<EvmPrefixedMessage, Keccak256>::random(claimant),
            ),
        }
    }
}

impl From<TestClaimCertificate> for ClaimInfo {
    fn from(val: TestClaimCertificate) -> Self {
        ClaimInfo {
            amount:   val.amount,
            identity: val.off_chain_proof_of_identity.into(),
        }
    }
}

impl TestClaimCertificate {
    pub fn as_claim_certificate(
        &self,
        merkle_tree: &MerkleTree<SolanaHasher>,
        index: u8,
        proof_of_inclusion_override: Option<MerklePath<SolanaHasher>>,
    ) -> (ClaimCertificate, Option<Instruction>) {
        let option_instruction = match &self.off_chain_proof_of_identity {
            TestIdentityCertificate::Evm(evm) => Some(evm.as_instruction(index, true)),
            TestIdentityCertificate::Discord(discord) => Some(discord.as_instruction(index, true)),
            TestIdentityCertificate::Cosmos(_) => None,
            TestIdentityCertificate::Aptos(aptos) => Some(aptos.as_instruction(index, true)),
            TestIdentityCertificate::Sui(sui) => Some(sui.as_instruction(index, true)),
            TestIdentityCertificate::Solana(_) => None,
            TestIdentityCertificate::Injective(injective) => {
                Some(injective.as_instruction(index, true))
            }
        };
        (
            ClaimCertificate {
                amount:             self.amount,
                proof_of_identity:  self.off_chain_proof_of_identity.as_claim_certificate(index),
                proof_of_inclusion: proof_of_inclusion_override.unwrap_or(
                    merkle_tree
                        .prove(&Into::<ClaimInfo>::into(self.clone()).try_to_vec().unwrap())
                        .unwrap(),
                ),
            },
            option_instruction,
        )
    }
}

impl From<TestIdentityCertificate> for Identity {
    fn from(val: TestIdentityCertificate) -> Self {
        match val {
            TestIdentityCertificate::Evm(evm) => evm.into(),
            TestIdentityCertificate::Cosmos(cosmos) => cosmos.into(),
            TestIdentityCertificate::Discord(discord) => discord.into(),
            TestIdentityCertificate::Aptos(aptos) => aptos.into(),
            TestIdentityCertificate::Sui(sui) => sui.into(),
            TestIdentityCertificate::Solana(solana) => solana.into(),
            TestIdentityCertificate::Injective(injective) => injective.into(),
        }
    }
}

impl TestIdentityCertificate {
    pub fn as_claim_certificate(&self, verification_instruction_index: u8) -> IdentityCertificate {
        match self {
            Self::Evm(evm) => evm.as_proof_of_identity(verification_instruction_index),
            Self::Cosmos(cosmos) => cosmos.clone().into(),
            Self::Discord(discord) => discord.as_proof_of_identity(verification_instruction_index),
            Self::Aptos(aptos) => aptos.as_proof_of_identity(verification_instruction_index),
            Self::Sui(sui) => sui.as_proof_of_identity(verification_instruction_index),
            Self::Solana(solana) => solana.as_proof_of_identity(verification_instruction_index),
            Self::Injective(injective) => {
                injective.as_proof_of_identity(verification_instruction_index)
            }
        }
    }
}

impl TestClaimCertificate {
    pub fn as_instruction_error_index(&self, merkle_tree: &MerkleTree<SolanaHasher>) -> u8 {
        match self.as_claim_certificate(merkle_tree, 0, None).1 {
            Some(_) => 1,
            None => 0,
        }
    }
}

#[derive(Clone)]
pub enum TestIdentityCertificate {
    Evm(Secp256k1TestIdentityCertificate<EvmPrefixedMessage, Keccak256>),
    Discord(Ed25519TestIdentityCertificate<DiscordMessage>),
    Cosmos(Secp256k1TestIdentityCertificate<CosmosMessage, Sha256>),
    Aptos(Ed25519TestIdentityCertificate<AptosMessage>),
    Sui(Ed25519TestIdentityCertificate<SuiMessage>),
    Solana(SolanaTestIdentityCertificate),
    Injective(Secp256k1TestIdentityCertificate<EvmPrefixedMessage, Keccak256>),
}

#[tokio::test]
pub async fn test_happy_path() {
    let dispenser_guard: Keypair = Keypair::new();

    let mut simulator = DispenserSimulator::new().await;

    let mock_offchain_certificates = DispenserSimulator::generate_test_claim_certs(
        &simulator.genesis_keypair.pubkey(),
        &dispenser_guard,
    );

    let merkle_items: Vec<ClaimInfo> = mock_offchain_certificates
        .iter()
        .map(|item: &TestClaimCertificate| item.clone().into())
        .collect();

    let (merkle_tree, merkle_items_serialized) = merkleize(merkle_items);

    let (config_pubkey, config_bump) = get_config_pda();
    let treasury = simulator.pyth_treasury;

    simulator
        .create_associated_token_account(
            &simulator.genesis_keypair.pubkey(),
            &simulator.mint_keypair.pubkey(),
        )
        .await
        .unwrap();

    let address_lookup_table = simulator.init_lookup_table().await.unwrap();

    simulator
        .initialize(
            merkle_tree.root.clone(),
            dispenser_guard.pubkey(),
            address_lookup_table,
            None,
            None,
            None,
        )
        .await
        .unwrap();

    let expected_target_config = Config {
        bump: config_bump,
        merkle_root: merkle_tree.root.clone(),
        dispenser_guard: dispenser_guard.pubkey(),
        mint: simulator.mint_keypair.pubkey(),
        treasury,
        address_lookup_table,
        funder: simulator.genesis_keypair.pubkey(),
        max_transfer: u64::MAX,
    };


    let config_account: Account = simulator.get_account(config_pubkey).await.unwrap();
    let config_data: Config = Config::try_from_slice(&config_account.data[8..]).unwrap();
    assert_eq!(expected_target_config, config_data);
    let claim_sum = mock_offchain_certificates
        .iter()
        .map(|item| item.amount)
        .sum::<u64>();

    let mint_amounts = [
        mock_offchain_certificates[0].amount,
        claim_sum - mock_offchain_certificates[0].amount,
    ];

    // verify receipt pdas don't exist
    for serialized_item in &merkle_items_serialized {
        assert!(simulator
            .get_account(get_receipt_pda(serialized_item).0)
            .await
            .is_none());
    }

    // mint only enough for first claim
    simulator.mint_to_treasury(mint_amounts[0]).await.unwrap();
    simulator
        .verify_token_account_data(treasury, mint_amounts[0], COption::None, 0)
        .await
        .unwrap();

    // approve total claim sum amount
    simulator
        .approve_treasury_delegate(get_config_pda().0, claim_sum)
        .await
        .unwrap();

    simulator
        .verify_token_account_data(
            treasury,
            mint_amounts[0],
            COption::Some(config_pubkey),
            claim_sum,
        )
        .await
        .unwrap();

    simulator
        .claim(
            &copy_keypair(&simulator.genesis_keypair),
            &mock_offchain_certificates[0],
            &merkle_tree,
            None,
            None,
            None,
        )
        .await
        .unwrap();

    // verify treasury is empty but delegated amount is still valid
    simulator
        .verify_token_account_data(
            treasury,
            0,
            COption::Some(config_pubkey),
            claim_sum - mint_amounts[0],
        )
        .await
        .unwrap();

    // mint enough for rest of the claims
    simulator.mint_to_treasury(mint_amounts[1]).await.unwrap();
    simulator
        .verify_token_account_data(
            treasury,
            mint_amounts[1],
            COption::Some(config_pubkey),
            claim_sum - mint_amounts[0],
        )
        .await
        .unwrap();

    for offchain_claim_certificate in &mock_offchain_certificates[1..] {
        simulator
            .claim(
                &copy_keypair(&simulator.genesis_keypair),
                offchain_claim_certificate,
                &merkle_tree,
                None,
                None,
                None,
            )
            .await
            .unwrap();
    }

    // Check state
    assert_claim_receipts_exist(&merkle_items_serialized, &mut simulator).await;

    // Can't claim twice
    for offchain_claim_certificate in &mock_offchain_certificates {
        let ix_index_error = offchain_claim_certificate.as_instruction_error_index(&merkle_tree);
        assert_eq!(
            simulator
                .claim(
                    &copy_keypair(&simulator.genesis_keypair),
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

    // Check state
    assert_claim_receipts_exist(&merkle_items_serialized, &mut simulator).await;

    // treasury should have 0 balance and delegated amount/user should be 0 since
    // delegated amount was transferred
    simulator
        .verify_token_account_data(treasury, 0, COption::None, 0)
        .await
        .unwrap();

    let claimant_fund = get_associated_token_address(
        &simulator.genesis_keypair.pubkey(),
        &simulator.mint_keypair.pubkey(),
    );


    simulator
        .verify_token_account_data(claimant_fund, claim_sum, COption::None, 0)
        .await
        .unwrap();
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
