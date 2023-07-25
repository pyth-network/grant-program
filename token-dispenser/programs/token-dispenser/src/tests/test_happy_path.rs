use {
    super::{
        dispenser_simulator::DispenserSimulator,
        test_cosmos::CosmosTestIdentityCertificate,
    },
    crate::{
        get_config_pda,
        get_receipt_pda,
        tests::{
            dispenser_simulator::IntoTransactionError,
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
        AccountDeserialize,
        AnchorDeserialize,
        AnchorSerialize,
        Id,
    },
    anchor_spl::{
        associated_token::get_associated_token_address_with_program_id,
        token::{
            Token,
            TokenAccount,
        },
    },
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
}

impl Into<ClaimInfo> for TestClaimCertificate {
    fn into(self) -> ClaimInfo {
        ClaimInfo {
            amount:   self.amount,
            identity: self.off_chain_proof_of_identity.into(),
        }
    }
}

impl TestClaimCertificate {
    pub fn into_claim_certificate(
        &self,
        merkle_tree: &MerkleTree<SolanaHasher>,
        index: u8,
    ) -> (ClaimCertificate, Option<Instruction>) {
        let option_instruction = match &self.off_chain_proof_of_identity {
            TestIdentityCertificate::Evm(evm) => Some(evm.into_instruction(index, true)),
            TestIdentityCertificate::Discord(_) => None,
            TestIdentityCertificate::Cosmos(_) => None,
        };
        (
            ClaimCertificate {
                amount:             self.amount,
                proof_of_identity:  self
                    .off_chain_proof_of_identity
                    .into_claim_certificate(index),
                proof_of_inclusion: merkle_tree
                    .prove(&Into::<ClaimInfo>::into(self.clone()).try_to_vec().unwrap())
                    .unwrap(),
            },
            option_instruction,
        )
    }
}

impl Into<Identity> for TestIdentityCertificate {
    fn into(self) -> Identity {
        match self {
            Self::Evm(evm) => evm.into(),
            Self::Cosmos(cosmos) => cosmos.into(),
            Self::Discord(username) => Identity::Discord {
                username: username.clone(),
            },
        }
    }
}

impl TestIdentityCertificate {
    pub fn into_claim_certificate(
        &self,
        verification_instruction_index: u8,
    ) -> IdentityCertificate {
        match self {
            Self::Evm(evm) => evm.into_proof_of_identity(verification_instruction_index),
            Self::Cosmos(cosmos) => cosmos.clone().into(),
            Self::Discord(username) => IdentityCertificate::Discord {
                username: username.clone(),
            },
        }
    }
}

#[derive(Clone)]
pub enum TestIdentityCertificate {
    Evm(EvmTestIdentityCertificate),
    Discord(String),
    Cosmos(CosmosTestIdentityCertificate),
}

#[tokio::test]
pub async fn test_happy_path() {
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

    let merkle_items_serialized = merkle_items
        .iter()
        .map(|item| item.try_to_vec().unwrap())
        .collect::<Vec<Vec<u8>>>();

    let merkle_tree: MerkleTree<SolanaHasher> = MerkleTree::new(
        merkle_items_serialized
            .iter()
            .map(|item| item.as_slice())
            .collect::<Vec<&[u8]>>()
            .as_slice(),
    )
    .unwrap();

    let config_pubkey = get_config_pda().0;
    let treasury = get_associated_token_address_with_program_id(
        &(config_pubkey),
        &simulator.mint_keypair.pubkey(),
        &Token::id(),
    );

    let target_config = Config {
        merkle_root: merkle_tree.root.clone(),
        dispenser_guard: dispenser_guard.pubkey(),
        mint: simulator.mint_keypair.pubkey(),
        treasury,
    };


    simulator.initialize(target_config.clone()).await.unwrap();

    let config_account: Account = simulator.get_account(config_pubkey).await.unwrap();
    let config_data: Config = Config::try_from_slice(&config_account.data[8..]).unwrap();
    assert_eq!(target_config, config_data);

    let treasury_account: Account = simulator.get_account(treasury).await.unwrap();
    let treasury_data: TokenAccount =
        TokenAccount::try_deserialize_unchecked(&mut treasury_account.data.as_slice()).unwrap();
    assert_eq!(treasury_data.amount, 0);
    assert_eq!(treasury_data.mint, simulator.mint_keypair.pubkey());
    assert_eq!(treasury_data.owner, config_pubkey);


    for serialized_item in &merkle_items_serialized {
        assert!(simulator
            .get_account(get_receipt_pda(&serialized_item).0)
            .await
            .is_none());
    }

    for offchain_claim_certificate in &mock_offchain_certificates {
        simulator
            .claim(&dispenser_guard, &offchain_claim_certificate, &merkle_tree)
            .await
            .unwrap();
    }

    // Check state
    assert_claim_receipts_exist(&merkle_items_serialized, &mut simulator).await;

    // Can't claim twice
    for offchain_claim_certificate in &mock_offchain_certificates {
        assert_eq!(
            simulator
                .claim(&dispenser_guard, &offchain_claim_certificate, &merkle_tree)
                .await
                .unwrap_err()
                .unwrap(),
            ErrorCode::AlreadyClaimed.into_transation_error()
        );
    }

    // Check state
    assert_claim_receipts_exist(&merkle_items_serialized, &mut simulator).await;
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
