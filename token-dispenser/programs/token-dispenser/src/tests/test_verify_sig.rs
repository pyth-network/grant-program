use {
    super::dispenser_simulator::DispenserSimulator,
    crate::tests::verify::verify_secp256k1_signature,
    libsecp256k1::RecoveryId,
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

const PREFIX: &str = "\x19Ethereum Signed Message:\n";
const SAMPLE_MESSAGE : &str = "localhost:3000 wants you to sign in with your Ethereum account:\n0xf3f9225A2166861e745742509CED164183a626d7\n\nSign In With Ethereum to prove you control this wallet.\n\nURI: http://localhost:3000\nVersion: 1\nChain ID: 1\nNonce: wIdVdFLtFSwM6Cfri\nIssued At: 2023-06-22T12:45:06.577Z";

pub struct Secp256k1Message {
    pub prefixed_message: Vec<u8>,
    pub signature:        libsecp256k1::Signature,
    pub recovery_id:      libsecp256k1::RecoveryId,
}

impl Secp256k1Message {
    pub fn from_evm_hex(hex_signature: &str, message: &str) -> Secp256k1Message {
        let signature_bytes = hex::decode(hex_signature).expect("Decoding failed");
        let mut signature_array: [u8; 64] = [0; 64];
        signature_array.copy_from_slice(&signature_bytes[..64]);

        // EIP 191 prepends a prefix to the message being signed.
        let mut prefixed_message = format!("{}{}", PREFIX, message.len()).into_bytes();
        prefixed_message.extend_from_slice(message.as_bytes());

        Self {
            signature: libsecp256k1::Signature::parse_standard(&signature_array)
                .expect("Decoding failed"),
            prefixed_message,
            recovery_id: RecoveryId::parse_rpc(signature_bytes[64]).unwrap(),
        }
    }

    pub fn recover(&self) -> libsecp256k1::PublicKey {
        let hash = libsecp256k1::Message::parse(&Keccak256::hashv(&[&self.prefixed_message]));
        libsecp256k1::recover(&hash, &self.signature, &self.recovery_id).unwrap()
    }

    pub fn recover_as_eth_address(&self) -> [u8; HASHED_PUBKEY_SERIALIZED_SIZE] {
        construct_eth_pubkey(&self.recover())
    }

    pub fn to_solana_verify_instruction(&self) -> Instruction {
        verify_secp256k1_signature(
            self.recover_as_eth_address(),
            self.signature.serialize(),
            &self.prefixed_message,
            self.recovery_id.serialize(),
        )
    }
}

/// Creates an Ethereum address from a secp256k1 public key.
pub fn construct_eth_pubkey(
    pubkey: &libsecp256k1::PublicKey,
) -> [u8; HASHED_PUBKEY_SERIALIZED_SIZE] {
    let mut addr = [0u8; HASHED_PUBKEY_SERIALIZED_SIZE];
    addr.copy_from_slice(&Keccak256::hashv(&[&pubkey.serialize()[1..]])[12..]);
    assert_eq!(addr.len(), HASHED_PUBKEY_SERIALIZED_SIZE);
    addr
}


#[tokio::test]
pub async fn verify_sig_message_new() {
    let signed_message = Secp256k1Message::from_evm_hex("dac0dfe99fb958f80aa0bda65b4fe3b02a7f4d07baa8395b5dad8585e69fe5d05d9a52c108d201a4465348b3fd8aecd7e56a9690c0ee584fd3b8d6cd7effb46d1b", SAMPLE_MESSAGE);
    assert_eq!(
        "f3f9225a2166861e745742509ced164183a626d7",
        hex::encode(signed_message.recover_as_eth_address())
    );
}

#[tokio::test]
pub async fn verify_sig_message_onchain() {
    let signed_message = Secp256k1Message::from_evm_hex("dac0dfe99fb958f80aa0bda65b4fe3b02a7f4d07baa8395b5dad8585e69fe5d05d9a52c108d201a4465348b3fd8aecd7e56a9690c0ee584fd3b8d6cd7effb46d1b", SAMPLE_MESSAGE);
    let mut simulator = DispenserSimulator::new().await;

    simulator
        .process_ix(&[signed_message.to_solana_verify_instruction()], &vec![])
        .await
        .unwrap();
}
