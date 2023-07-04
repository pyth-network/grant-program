use {
    super::{
        dispenser_simulator::DispenserSimulator,
        test_cosmos::CosmosOffChainProofOfIdentity,
    },
    crate::{
        get_config_pda,
        get_receipt_pda,
        tests::{
            dispenser_simulator::IntoTransactionError,
            test_evm::EvmOffChainProofOfIdentity,
        },
        ClaimCertificate,
        ClaimInfo,
        Config,
        ErrorCode,
        Identity,
        ProofOfIdentity,
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

#[derive(Clone)]
pub struct OffChainClaimCertificate {
    pub amount:                      u64,
    pub off_chain_proof_of_identity: OffChainProofOfIdentity,
}

pub const MAX_AMOUNT: u64 = 1000;
impl OffChainClaimCertificate {
    pub fn random_evm(claimant: &Pubkey) -> Self {
        Self {
            amount:                      rand::thread_rng().gen::<u64>() % MAX_AMOUNT,
            off_chain_proof_of_identity: OffChainProofOfIdentity::Evm(
                EvmOffChainProofOfIdentity::random(claimant),
            ),
        }
    }

    pub fn random_cosmos(claimant: &Pubkey) -> Self {
        Self {
            amount:                      rand::thread_rng().gen::<u64>() % MAX_AMOUNT,
            off_chain_proof_of_identity: OffChainProofOfIdentity::Cosmos(
                CosmosOffChainProofOfIdentity::random(claimant),
            ),
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
            OffChainProofOfIdentity::Evm(evm) => Some(evm.into_instruction(index, true)),
            OffChainProofOfIdentity::Discord => None,
            OffChainProofOfIdentity::Cosmos(_) => None,
        };
        (
            ClaimCertificate {
                amount:             self.amount,
                proof_of_identity:  self.off_chain_proof_of_identity.clone().into(),
                proof_of_inclusion: merkle_tree
                    .prove(&Into::<ClaimInfo>::into(self.clone()).try_to_vec().unwrap())
                    .unwrap(),
            },
            option_instruction,
        )
    }
}

impl Into<Identity> for OffChainProofOfIdentity {
    fn into(self) -> Identity {
        match self {
            Self::Evm(evm) => evm.into(),
            Self::Cosmos(cosmos) => cosmos.into(),
            Self::Discord => Identity::Discord,
        }
    }
}

impl Into<ProofOfIdentity> for OffChainProofOfIdentity {
    fn into(self) -> ProofOfIdentity {
        match self {
            Self::Evm(evm) => evm.into(),
            Self::Cosmos(cosmos) => cosmos.into(),
            Self::Discord => ProofOfIdentity::Discord,
        }
    }
}


#[derive(Clone)]
pub enum OffChainProofOfIdentity {
    Evm(EvmOffChainProofOfIdentity),
    Discord,
    Cosmos(CosmosOffChainProofOfIdentity),
}


#[tokio::test]
pub async fn test_happy_path() {
    let dispenser_guard: Keypair = Keypair::new();

    let mut simulator = DispenserSimulator::new().await;
    let claimant = simulator.genesis_keypair.pubkey();

    let mock_offchain_certificates = vec![
        OffChainClaimCertificate::random_evm(&claimant),
        OffChainClaimCertificate::random_cosmos(&claimant),
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

    for serialized_item in merkle_items_serialized.clone() {
        assert!(simulator
            .get_account(get_receipt_pda(&serialized_item).0)
            .await
            .is_none());
    }

    for offchain_claim_certificate in mock_offchain_certificates.clone() {
        simulator
            .claim(&dispenser_guard, &offchain_claim_certificate, &merkle_tree)
            .await
            .unwrap();
    }

    // Check state
    assert_claim_receipts_exist(&merkle_items_serialized, &mut simulator).await;

    // Can't claim twice
    for offchain_claim_certificate in mock_offchain_certificates {
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
