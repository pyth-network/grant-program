// use ed25519_consensus::{VerificationKey, VerificationKeyBytes, Signature};
use {
    super::dispenser_simulator::DispenserSimulator,
    anchor_lang::solana_program::pubkey,
    bytemuck::{
        bytes_of,
        Pod,
        Zeroable,
    },
    ed25519_dalek::{
        PublicKey,
        Verifier,
    },
    solana_program_test::tokio,
    solana_sdk::{
        ed25519_instruction::{
            self,
            DATA_START,
            PUBKEY_SERIALIZED_SIZE,
            SIGNATURE_SERIALIZED_SIZE,
        },
        instruction::Instruction,
    },
};

const SAMPLE_MESSAGE: &str = "APTOS\nmessage: Pyth Grant Program\nnonce: random_string";
const SAMPLE_SIGNATURE : &str = "5150f0a7817b019b21273074542856e2d5aa82a3827d902aec077c7a655c863f5eb2f00bc1a20b32afee0156d002061020b36502de4288c4a0c2e7d70b1d8805";
const SAMPLE_PUBLIC_KEY: &str = "eabf23efe5669d16e143b8070dd32eb536241e3ecbcb8c782b8596f71683935f";

pub struct Ed25519Message {
    pub prefixed_message: Vec<u8>,
    pub signature:        ed25519_dalek::Signature,
    pub pubkey:           ed25519_dalek::PublicKey,
}

impl Ed25519Message {
    pub fn from_hex(hex_signature: &str, hex_pubkey: &str, message: &str) -> Self {
        let mut signature_bytes = [0u8; ed25519_dalek::SIGNATURE_LENGTH];
        signature_bytes.copy_from_slice(hex::decode(hex_signature).unwrap().as_slice());

        let mut pubkey_bytes = [0u8; ed25519_dalek::PUBLIC_KEY_LENGTH];
        pubkey_bytes.copy_from_slice(hex::decode(hex_pubkey).unwrap().as_slice());
        return Self {
            prefixed_message: message.as_bytes().to_vec(),
            signature:        ed25519_dalek::Signature::from_bytes(&signature_bytes).unwrap(),
            pubkey:           ed25519_dalek::PublicKey::from_bytes(&pubkey_bytes).unwrap(),
        };
    }

    pub fn verify(&self) -> bool {
        self.pubkey
            .verify(self.prefixed_message.as_slice(), &self.signature)
            .is_ok()
    }

    pub fn to_solana_verify_instruction(&self) -> Instruction {
        new_ed25519_instruction(
            self.signature.to_bytes(),
            self.pubkey.to_bytes(),
            &self.prefixed_message,
        )
    }
}

#[derive(Default, Debug, Copy, Clone, Zeroable, Pod)]
#[repr(C)]
pub struct Ed25519SignatureOffsets {
    signature_offset:             u16, // offset to ed25519 signature of 64 bytes
    signature_instruction_index:  u16, // instruction index to find signature
    public_key_offset:            u16, // offset to public key of 32 bytes
    public_key_instruction_index: u16, // instruction index to find public key
    message_data_offset:          u16, // offset to start of message data
    message_data_size:            u16, // size of message data
    message_instruction_index:    u16, // index of instruction data to get message data
}

pub fn new_ed25519_instruction(
    signature: [u8; 64],
    pubkey: [u8; 32],
    message: &[u8],
) -> Instruction {
    assert_eq!(pubkey.len(), PUBKEY_SERIALIZED_SIZE);
    assert_eq!(signature.len(), SIGNATURE_SERIALIZED_SIZE);

    let mut instruction_data = Vec::with_capacity(
        DATA_START
            .saturating_add(SIGNATURE_SERIALIZED_SIZE)
            .saturating_add(PUBKEY_SERIALIZED_SIZE)
            .saturating_add(message.len()),
    );

    let num_signatures: u8 = 1;
    let public_key_offset = DATA_START;
    let signature_offset = public_key_offset.saturating_add(PUBKEY_SERIALIZED_SIZE);
    let message_data_offset = signature_offset.saturating_add(SIGNATURE_SERIALIZED_SIZE);

    // add padding byte so that offset structure is aligned
    instruction_data.extend_from_slice(bytes_of(&[num_signatures, 0]));

    let offsets: Ed25519SignatureOffsets = Ed25519SignatureOffsets {
        signature_offset:             signature_offset as u16,
        signature_instruction_index:  u16::MAX,
        public_key_offset:            public_key_offset as u16,
        public_key_instruction_index: u16::MAX,
        message_data_offset:          message_data_offset as u16,
        message_data_size:            message.len() as u16,
        message_instruction_index:    u16::MAX,
    };

    instruction_data.extend_from_slice(bytes_of(&offsets));

    debug_assert_eq!(instruction_data.len(), public_key_offset);

    instruction_data.extend_from_slice(&pubkey);

    debug_assert_eq!(instruction_data.len(), signature_offset);

    instruction_data.extend_from_slice(&signature);

    debug_assert_eq!(instruction_data.len(), message_data_offset);

    instruction_data.extend_from_slice(message);

    Instruction {
        program_id: solana_sdk::ed25519_program::id(),
        accounts:   vec![],
        data:       instruction_data,
    }
}

#[test]
pub fn verify_sig_aptos_new() {
    let message = Ed25519Message::from_hex(SAMPLE_SIGNATURE, SAMPLE_PUBLIC_KEY, SAMPLE_MESSAGE);
    assert!(message.verify());
}

#[tokio::test]
pub async fn verify_sig_aptos_message_onchain() {
    let message = Ed25519Message::from_hex(SAMPLE_SIGNATURE, SAMPLE_PUBLIC_KEY, SAMPLE_MESSAGE);
    let mut simulator = DispenserSimulator::new().await;

    simulator
        .process_ix(&[message.to_solana_verify_instruction()], &vec![])
        .await
        .unwrap();
}
