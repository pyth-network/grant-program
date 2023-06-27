use {
    super::dispenser_simulator::DispenserSimulator,
    crate::ecosystems::{
        evm::{
            EvmPrefixedMessage,
            EvmPubkey,
            EvmSignature,
            Secp256k1InstructionData,
            Secp256k1InstructionHeader,
            EVM_MESSAGE_PREFIX,
            EVM_PUBKEY_SIZE,
        },
        get_expected_message,
    },
    anchor_lang::{
        prelude::Pubkey,
        solana_program::secp256k1_program::ID as SECP256K1_ID,
        AnchorSerialize,
    },
    libsecp256k1::RecoveryId,
    pythnet_sdk::hashers::{
        keccak256::Keccak256,
        Hasher,
    },
    solana_program_test::tokio,
    solana_sdk::instruction::Instruction,
};

/// Creates an Ethereum address from a secp256k1 public key.
pub fn construct_evm_pubkey(pubkey: &libsecp256k1::PublicKey) -> EvmPubkey {
    let mut addr = [0u8; EVM_PUBKEY_SIZE];
    addr.copy_from_slice(&Keccak256::hashv(&[&pubkey.serialize()[1..]])[12..]);
    assert_eq!(addr.len(), EVM_PUBKEY_SIZE);
    EvmPubkey(addr)
}

#[derive(Clone)]
pub struct Secp256k1SignedMessage {
    pub prefixed_message: EvmPrefixedMessage,
    pub signature:        libsecp256k1::Signature,
    pub recovery_id:      libsecp256k1::RecoveryId,
}

impl EvmPrefixedMessage {
    pub fn from_message(message: &str) -> Self {
        let mut prefixed_message = format!("{}{}", EVM_MESSAGE_PREFIX, message.len()).into_bytes();
        prefixed_message.extend_from_slice(message.as_bytes());
        Self(prefixed_message)
    }

    pub fn hash(&self) -> libsecp256k1::Message {
        libsecp256k1::Message::parse(&Keccak256::hashv(&[&self.0]))
    }
}

impl Secp256k1SignedMessage {
    pub fn recover(&self) -> libsecp256k1::PublicKey {
        libsecp256k1::recover(
            &self.prefixed_message.hash(),
            &self.signature,
            &self.recovery_id,
        )
        .unwrap()
    }

    pub fn recover_as_evm_address(&self) -> EvmPubkey {
        construct_evm_pubkey(&self.recover())
    }

    pub fn random(claimant: &Pubkey) -> Self {
        let prefixed_message = EvmPrefixedMessage::from_message(&get_expected_message(claimant));
        let secret = libsecp256k1::SecretKey::random(&mut rand::thread_rng());
        let (signature, recovery_id) = libsecp256k1::sign(&prefixed_message.hash(), &secret);
        return Self {
            prefixed_message: EvmPrefixedMessage::from_message(&get_expected_message(claimant)),
            signature,
            recovery_id,
        };
    }
}

impl Into<Instruction> for Secp256k1SignedMessage {
    /**
     * Transforms into a solana instruction that will verify the signature when executed
     */
    fn into(self) -> Instruction {
        let header = self.prefixed_message.get_expected_header();

        let instruction_data = Secp256k1InstructionData {
            header,
            eth_address: self.recover_as_evm_address(),
            signature: EvmSignature(self.signature.serialize()),
            recovery_id: self.recovery_id.serialize(),
            prefixed_message: self.prefixed_message,
        };

        Instruction {
            program_id: SECP256K1_ID,
            accounts:   vec![],
            data:       instruction_data.try_to_vec().unwrap(),
        }
    }
}

#[tokio::test]
pub async fn verify_sig_message_onchain() {
    let signed_message = Secp256k1SignedMessage::random(&Pubkey::new_unique());
    let mut simulator = DispenserSimulator::new().await;

    simulator
        .process_ix(&[signed_message.into()], &vec![])
        .await
        .unwrap();
}
