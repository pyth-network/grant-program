use {
    super::dispenser_simulator::DispenserSimulator,
    crate::ecosystems::{
        evm::{
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

impl EvmPubkey {
    pub fn from_evm_hex(hex_pubkey: &str) -> Self {
        let mut pubkey_bytes = [0u8; EVM_PUBKEY_SIZE];
        pubkey_bytes.copy_from_slice(hex::decode(hex_pubkey).unwrap().as_slice());
        Self(pubkey_bytes)
    }
}

/// Creates an Ethereum address from a secp256k1 public key.
pub fn construct_evm_pubkey(pubkey: &libsecp256k1::PublicKey) -> EvmPubkey {
    let mut addr = [0u8; EVM_PUBKEY_SIZE];
    addr.copy_from_slice(&Keccak256::hashv(&[&pubkey.serialize()[1..]])[12..]);
    assert_eq!(addr.len(), EVM_PUBKEY_SIZE);
    EvmPubkey(addr)
}

#[derive(Clone)]
pub struct Secp256k1SignedMessage {
    pub message:     Vec<u8>,
    pub signature:   libsecp256k1::Signature,
    pub recovery_id: libsecp256k1::RecoveryId,
}

impl Secp256k1SignedMessage {
    pub fn from_evm_hex(hex_signature: &str, message: &str) -> Secp256k1SignedMessage {
        let signature_bytes = hex::decode(hex_signature).expect("Decoding failed");
        let mut signature_array: [u8; 64] = [0; 64];
        signature_array.copy_from_slice(&signature_bytes[..64]);

        // EIP 191 prepends a prefix to the message being signed.
        let mut prefixed_message = format!("{}{}", EVM_MESSAGE_PREFIX, message.len()).into_bytes();
        prefixed_message.extend_from_slice(message.as_bytes());

        Self {
            signature:   libsecp256k1::Signature::parse_standard(&signature_array)
                .expect("Decoding failed"),
            message:     prefixed_message,
            recovery_id: RecoveryId::parse_rpc(signature_bytes[64]).unwrap(),
        }
    }

    pub fn recover(&self) -> libsecp256k1::PublicKey {
        let hash = libsecp256k1::Message::parse(&Keccak256::hashv(&[&self.message]));
        libsecp256k1::recover(&hash, &self.signature, &self.recovery_id).unwrap()
    }

    pub fn recover_as_evm_address(&self) -> EvmPubkey {
        construct_evm_pubkey(&self.recover())
    }

    pub fn random(claimant: &Pubkey) -> Self {
        let hashed_message =
            libsecp256k1::Message::parse(&Keccak256::hashv(&[(EVM_MESSAGE_PREFIX.to_string()
                + &get_expected_message(claimant))
                .as_bytes()]));
        let secret = libsecp256k1::SecretKey::random(&mut rand::thread_rng());
        let (signature, recovery_id) = libsecp256k1::sign(&hashed_message, &secret);
        return Self {
            message: (EVM_MESSAGE_PREFIX.to_string() + &get_expected_message(claimant))
                .as_bytes()
                .to_vec(),
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
        let header = Secp256k1InstructionHeader::expected(self.message.len());

        let instruction_data = Secp256k1InstructionData {
            header,
            eth_address: self.recover_as_evm_address(),
            signature: EvmSignature(self.signature.serialize()),
            recovery_id: self.recovery_id.serialize(),
            message: self.message,
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
