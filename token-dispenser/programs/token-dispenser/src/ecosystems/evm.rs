#[cfg(test)]
use pythnet_sdk::hashers::{
    keccak256::Keccak256,
    Hasher,
};
use {
    super::{
        check_message,
        get_expected_message,
        secp256k1::{
            EvmPubkey,
            Secp256k1InstructionData,
        },
    },
    crate::ErrorCode,
    anchor_lang::{
        prelude::*,
        solana_program::{
            instruction::Instruction as SolanaInstruction,
            secp256k1_program::ID as SECP256K1_ID,
        },
        AnchorDeserialize,
        AnchorSerialize,
    },
    std::str,
};

pub const EVM_MESSAGE_PREFIX: &str = "\x19Ethereum Signed Message:\n";

/**
 * An EIP-191 prefixed message.
 * When a browser wallet signs a message, it prepends the message with a prefix and the length of a message.
 * This struct represents the prefixed message and helps with creating and verifying it.
 */

#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct EvmPrefixedMessage(Vec<u8>);

impl EvmPrefixedMessage {
    pub fn parse(data: &[u8]) -> Result<Self> {
        if data.starts_with(EVM_MESSAGE_PREFIX.as_bytes()) {
            let length_with_message_length = data.len().saturating_sub(EVM_MESSAGE_PREFIX.len());
            let length = match length_with_message_length {
                _ if 1 + 1 <= length_with_message_length && length_with_message_length <= 9 + 1 => {
                    length_with_message_length.saturating_sub(1)
                }
                _ if 10 + 2 <= length_with_message_length
                    && length_with_message_length <= 99 + 2 =>
                {
                    length_with_message_length.saturating_sub(2)
                }
                _ if 100 + 3 <= length_with_message_length
                    && length_with_message_length <= 999 + 3 =>
                {
                    length_with_message_length.saturating_sub(3)
                }
                _ => return Err(ErrorCode::SignatureVerificationWrongMessagePrefix.into()),
            };

            if data[EVM_MESSAGE_PREFIX.len()..].starts_with(length.to_string().as_bytes()) {
                return Ok(Self(
                    data[EVM_MESSAGE_PREFIX.len()
                        + length_with_message_length.saturating_sub(length)..]
                        .to_vec(),
                ));
            }
        }
        return Err(ErrorCode::SignatureVerificationWrongMessagePrefix.into());
    }

    pub fn get_payload(&self) -> &[u8] {
        self.0.as_slice()
    }

    pub fn get_prefix_length(&self) -> usize {
        EVM_MESSAGE_PREFIX.len() + self.0.len().to_string().len() + self.0.len()
    }
}

#[cfg(test)]
impl EvmPrefixedMessage {
    pub fn new(message: &str) -> Self {
        Self(message.as_bytes().to_vec())
    }
    pub fn with_prefix(&self) -> Vec<u8> {
        let mut prefixed_message = format!("{}{}", EVM_MESSAGE_PREFIX, self.0.len()).into_bytes();
        prefixed_message.extend_from_slice(&self.0);
        prefixed_message
    }

    pub fn hash(&self) -> libsecp256k1::Message {
        libsecp256k1::Message::parse(&Keccak256::hashv(&[&self.with_prefix()]))
    }
}

pub fn check_authorized(
    pubkey: &EvmPubkey,
    ix: SolanaInstruction,
    claimant: &Pubkey,
) -> Result<()> {
    // Check program address
    if ix.program_id != SECP256K1_ID {
        return Err(ErrorCode::SignatureVerificationWrongProgram.into());
    }

    if !ix.accounts.is_empty() {
        return Err(ErrorCode::SignatureVerificationWrongAccounts.into());
    }

    let data = Secp256k1InstructionData::deserialize_and_check_header_and_signer(
        ix.data.as_slice(),
        pubkey,
    )?;
    let evm_message = EvmPrefixedMessage::parse(&data.message)?;
    check_message(evm_message.get_payload(), claimant)?;
    Ok(())
}
