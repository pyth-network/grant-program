use {
    super::{
        dispenser_simulator::DispenserSimulator,
        test_cosmos::CosmosTestIdentityCertificate,
        test_ed25519::Ed25519TestIdentityCertificate,
    },
    crate::{
        ecosystems::{
            aptos::AptosMessage,
            solana::SolanaMessage,
            sui::SuiMessage,
        },
        get_cart_pda,
        get_config_pda,
        get_receipt_pda,
        tests::{
            dispenser_simulator::{
                copy_keypair,
                IntoTransactionError,
            },
            merkleize,
            test_evm::EvmTestIdentityCertificate,
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
    pythnet_sdk::accumulators::{
        merkle::MerkleTree,
        Accumulator,
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
                EvmTestIdentityCertificate::random(claimant),
            ),
        }
    }

    pub fn random_cosmos(claimant: &Pubkey) -> Self {
        Self {
            amount:                      Self::random_amount(),
            off_chain_proof_of_identity: TestIdentityCertificate::Cosmos(
                CosmosTestIdentityCertificate::random(claimant),
            ),
        }
    }

    pub fn random_discord() -> Self {
        Self {
            amount:                      Self::random_amount(),
            off_chain_proof_of_identity: TestIdentityCertificate::Discord("username".into()),
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
                Ed25519TestIdentityCertificate::<SolanaMessage>::random(claimant),
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
    ) -> (ClaimCertificate, Option<Instruction>) {
        let option_instruction = match &self.off_chain_proof_of_identity {
            TestIdentityCertificate::Evm(evm) => Some(evm.as_instruction(index, true)),
            TestIdentityCertificate::Discord(_) => None,
            TestIdentityCertificate::Cosmos(_) => None,
            TestIdentityCertificate::Aptos(aptos) => Some(aptos.as_instruction(index, true)),
            TestIdentityCertificate::Sui(sui) => Some(sui.as_instruction(index, true)),
            TestIdentityCertificate::Solana(solana) => Some(solana.as_instruction(index, true)),
        };
        (
            ClaimCertificate {
                amount:             self.amount,
                proof_of_identity:  self.off_chain_proof_of_identity.as_claim_certificate(index),
                proof_of_inclusion: merkle_tree
                    .prove(&Into::<ClaimInfo>::into(self.clone()).try_to_vec().unwrap())
                    .unwrap(),
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
            TestIdentityCertificate::Discord(username) => Identity::Discord { username },
            TestIdentityCertificate::Aptos(aptos) => aptos.into(),
            TestIdentityCertificate::Sui(sui) => sui.into(),
            TestIdentityCertificate::Solana(solana) => solana.into(),
        }
    }
}

impl TestIdentityCertificate {
    pub fn as_claim_certificate(&self, verification_instruction_index: u8) -> IdentityCertificate {
        match self {
            Self::Evm(evm) => evm.as_proof_of_identity(verification_instruction_index),
            Self::Cosmos(cosmos) => cosmos.clone().into(),
            Self::Discord(username) => IdentityCertificate::Discord {
                username: username.clone(),
            },
            Self::Aptos(aptos) => aptos.as_proof_of_identity(verification_instruction_index),
            Self::Sui(sui) => sui.as_proof_of_identity(verification_instruction_index),
            Self::Solana(solana) => solana.as_proof_of_identity(verification_instruction_index),
        }
    }
}

#[derive(Clone)]
pub enum TestIdentityCertificate {
    Evm(EvmTestIdentityCertificate),
    Discord(String),
    Cosmos(CosmosTestIdentityCertificate),
    Aptos(Ed25519TestIdentityCertificate<AptosMessage>),
    Sui(Ed25519TestIdentityCertificate<SuiMessage>),
    Solana(Ed25519TestIdentityCertificate<SolanaMessage>),
}

#[tokio::test]
pub async fn test_happy_path() {
    let dispenser_guard: Keypair = Keypair::new();

    let mut simulator = DispenserSimulator::new().await;

    let mock_offchain_certificates =
        DispenserSimulator::generate_test_claim_certs(simulator.genesis_keypair.pubkey());

    let merkle_items: Vec<ClaimInfo> = mock_offchain_certificates
        .iter()
        .map(|item: &TestClaimCertificate| item.clone().into())
        .collect();

    let (merkle_tree, merkle_items_serialized) = merkleize(merkle_items);

    let (config_pubkey, config_bump) = get_config_pda();
    let treasury = simulator.pyth_treasury;

    simulator
        .initialize(
            merkle_tree.root.clone(),
            dispenser_guard.pubkey(),
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
    };


    let config_account: Account = simulator.get_account(config_pubkey).await.unwrap();
    let config_data: Config = Config::try_from_slice(&config_account.data[8..]).unwrap();
    assert_eq!(expected_target_config, config_data);
    let claim_sum = mock_offchain_certificates
        .iter()
        .map(|item| item.amount)
        .sum::<u64>();
    let mint_to_amount = 10 * claim_sum;

    simulator.mint_to_treasury(mint_to_amount).await.unwrap();
    simulator
        .verify_token_account_data(treasury, mint_to_amount, COption::None, 0)
        .await
        .unwrap();

    simulator
        .approve_treasury_delegate(get_config_pda().0, mint_to_amount)
        .await
        .unwrap();

    simulator
        .verify_token_account_data(
            treasury,
            mint_to_amount,
            COption::Some(config_pubkey),
            mint_to_amount,
        )
        .await
        .unwrap();

    for serialized_item in &merkle_items_serialized {
        assert!(simulator
            .get_account(get_receipt_pda(serialized_item).0)
            .await
            .is_none());
    }

    for offchain_claim_certificate in &mock_offchain_certificates {
        simulator
            .claim(
                &copy_keypair(&simulator.genesis_keypair),
                &dispenser_guard,
                offchain_claim_certificate,
                &merkle_tree,
            )
            .await
            .unwrap();
    }

    // Check state
    assert_claim_receipts_exist(&merkle_items_serialized, &mut simulator).await;

    // Can't claim twice
    for offchain_claim_certificate in &mock_offchain_certificates {
        assert_eq!(
            simulator
                .claim(
                    &copy_keypair(&simulator.genesis_keypair),
                    &dispenser_guard,
                    offchain_claim_certificate,
                    &merkle_tree
                )
                .await
                .unwrap_err()
                .unwrap(),
            ErrorCode::AlreadyClaimed.into_transaction_error()
        );
    }

    // Check state
    assert_claim_receipts_exist(&merkle_items_serialized, &mut simulator).await;
    let cart_pda = get_cart_pda(&simulator.genesis_keypair.pubkey()).0;
    let cart_data = simulator
        .get_account_data::<crate::Cart>(cart_pda)
        .await
        .unwrap();
    assert_eq!(cart_data.amount, claim_sum);


    // Checkout
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
            get_associated_token_address(
                &simulator.genesis_keypair.pubkey(),
                &simulator.mint_keypair.pubkey(),
            ),
            claim_sum,
            COption::None,
            0,
        )
        .await
        .unwrap();

    let cart_data = simulator
        .get_account_data::<crate::Cart>(cart_pda)
        .await
        .unwrap();
    assert_eq!(cart_data.amount, 0);
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
