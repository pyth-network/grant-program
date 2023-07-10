use {
    super::{
        dispenser_simulator::DispenserSimulator,
        test_cosmos::CosmosOffChainIdentityCertificate,
    },
    crate::{
        get_config_pda,
        get_receipt_pda,
        tests::{
            dispenser_simulator::IntoTransactionError,
            test_evm::EvmOffChainIdentityCertificate,
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
        AnchorDeserialize,
        AnchorSerialize,
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
 * Testing requires having both the `ClaimInfo`'s to construct the tree and the `ClaimCertificate`'s
 * to interact with the program. This struct is supposed to contain all the information needed
 * to create a `ClaimInfo` and the corresponding `ClaimCertificate` to claim.
 * */
#[derive(Clone)]
pub struct OffChainClaimCertificate {
    pub amount:                      u64,
    pub off_chain_proof_of_identity: OffChainIdentityCertificate,
}

pub const MAX_AMOUNT: u64 = 1000;
impl OffChainClaimCertificate {
    pub fn random_amount() -> u64 {
        rand::thread_rng().gen::<u64>() % MAX_AMOUNT
    }

    pub fn random_evm(claimant: &Pubkey) -> Self {
        Self {
            amount:                      Self::random_amount(),
            off_chain_proof_of_identity: OffChainIdentityCertificate::Evm(
                EvmOffChainIdentityCertificate::random(claimant),
            ),
        }
    }

    pub fn random_cosmos(claimant: &Pubkey) -> Self {
        Self {
            amount:                      Self::random_amount(),
            off_chain_proof_of_identity: OffChainIdentityCertificate::Cosmos(
                CosmosOffChainIdentityCertificate::random(claimant),
            ),
        }
    }

    pub fn random_discord() -> Self {
        Self {
            amount:                      Self::random_amount(),
            off_chain_proof_of_identity: OffChainIdentityCertificate::Discord("username".into()),
        }
    }
}

impl Into<ClaimInfo> for OffChainClaimCertificate {
    fn into(self) -> ClaimInfo {
        ClaimInfo {
            amount:   self.amount,
            identity: self.off_chain_proof_of_identity.into(),
        }
    }
}

impl OffChainClaimCertificate {
    pub fn into_claim_certificate(
        &self,
        merkle_tree: &MerkleTree<SolanaHasher>,
        index: u8,
    ) -> (ClaimCertificate, Option<Instruction>) {
        let option_instruction = match &self.off_chain_proof_of_identity {
            OffChainIdentityCertificate::Evm(evm) => Some(evm.into_instruction(index, true)),
            OffChainIdentityCertificate::Discord(_) => None,
            OffChainIdentityCertificate::Cosmos(_) => None,
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

impl Into<Identity> for OffChainIdentityCertificate {
    fn into(self) -> Identity {
        match self {
            Self::Evm(evm) => evm.into(),
            Self::Cosmos(cosmos) => cosmos.into(),
            Self::Discord(username) => Identity::Discord(username.clone()),
        }
    }
}

impl OffChainIdentityCertificate {
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
pub enum OffChainIdentityCertificate {
    Evm(EvmOffChainIdentityCertificate),
    Discord(String),
    Cosmos(CosmosOffChainIdentityCertificate),
}


#[tokio::test]
pub async fn test_happy_path() {
    let dispenser_guard: Keypair = Keypair::new();

    let mut simulator = DispenserSimulator::new().await;
    let claimant = simulator.genesis_keypair.pubkey();

    let mock_offchain_certificates = vec![
        OffChainClaimCertificate::random_evm(&claimant),
        OffChainClaimCertificate::random_cosmos(&claimant),
        OffChainClaimCertificate::random_discord(),
    ];

    let merkle_items: Vec<ClaimInfo> = mock_offchain_certificates
        .iter()
        .map(|item: &OffChainClaimCertificate| item.clone().into())
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

    let target_config = Config {
        merkle_root:     merkle_tree.root.clone(),
        dispenser_guard: dispenser_guard.pubkey(),
    };

    simulator.initialize(target_config.clone()).await.unwrap();

    let config_account: Account = simulator.get_account(get_config_pda().0).await.unwrap();
    let config_data: Config = Config::try_from_slice(&config_account.data[8..]).unwrap();
    assert_eq!(target_config, config_data);

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
