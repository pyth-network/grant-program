use {
    super::dispenser_simulator::DispenserSimulator,
    crate::ecosystems::evm::{
        EvmPubkey,
        EvmSignature,
        Secp256k1InstructionData,
        Secp256k1InstructionHeader,
        EVM_MESSAGE_PREFIX,
        EVM_PUBKEY_SIZE,
    },
    anchor_lang::{
        solana_program::secp256k1_program::ID as SECP256K1_ID,
        AnchorSerialize,
    },
    libsecp256k1::{
        util::SIGNATURE_SIZE,
        RecoveryId,
    },
    pythnet_sdk::hashers::{
        keccak256::Keccak256,
        Hasher,
    },
    solana_program_test::tokio,
    solana_sdk::{
        instruction::Instruction,
        secp256k1_instruction::HASHED_PUBKEY_SERIALIZED_SIZE,
    },
};


pub const SAMPLE_MESSAGE : &str = "localhost:3000 wants you to sign in with your Ethereum account:\n0xf3f9225A2166861e745742509CED164183a626d7\n\nSign In With Ethereum to prove you control this wallet.\n\nURI: http://localhost:3000\nVersion: 1\nChain ID: 1\nNonce: wIdVdFLtFSwM6Cfri\nIssued At: 2023-06-22T12:45:06.577Z";

impl EvmPubkey {
    pub fn from_evm_hex(hex_pubkey: &str) -> Self {
        let mut pubkey_bytes = [0u8; EVM_PUBKEY_SIZE];
        pubkey_bytes.copy_from_slice(hex::decode(hex_pubkey).unwrap().as_slice());
        return Self(pubkey_bytes);
    }
}

/// Creates an Ethereum address from a secp256k1 public key.
pub fn construct_evm_pubkey(pubkey: &libsecp256k1::PublicKey) -> EvmPubkey {
    let mut addr = [0u8; EVM_PUBKEY_SIZE];
    addr.copy_from_slice(&Keccak256::hashv(&[&pubkey.serialize()[1..]])[12..]);
    assert_eq!(addr.len(), EVM_PUBKEY_SIZE);
    EvmPubkey(addr)
}

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

        print!(
            "{:}",
            pretty_hex::pretty_hex(&instruction_data.try_to_vec().unwrap())
        );

        return Instruction {
            program_id: SECP256K1_ID,
            accounts:   vec![],
            data:       instruction_data.try_to_vec().unwrap(),
        };
    }
}

#[tokio::test]
pub async fn verify_sig_message_new() {
    let signed_message = Secp256k1SignedMessage::from_evm_hex("dac0dfe99fb958f80aa0bda65b4fe3b02a7f4d07baa8395b5dad8585e69fe5d05d9a52c108d201a4465348b3fd8aecd7e56a9690c0ee584fd3b8d6cd7effb46d1b", SAMPLE_MESSAGE);
    assert_eq!(
        "f3f9225a2166861e745742509ced164183a626d7",
        hex::encode(signed_message.recover_as_evm_address().0)
    );
}

#[tokio::test]
pub async fn verify_sig_message_onchain() {
    let signed_message = Secp256k1SignedMessage::from_evm_hex("dac0dfe99fb958f80aa0bda65b4fe3b02a7f4d07baa8395b5dad8585e69fe5d05d9a52c108d201a4465348b3fd8aecd7e56a9690c0ee584fd3b8d6cd7effb46d1b", SAMPLE_MESSAGE);
    let mut simulator = DispenserSimulator::new().await;

    simulator
        .process_ix(&[signed_message.into()], &vec![])
        .await
        .unwrap();
}
