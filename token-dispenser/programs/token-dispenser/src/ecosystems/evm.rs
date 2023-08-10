#[cfg(test)]
use super::secp256k1::Secp256k1TestMessage;
use {
    crate::ErrorCode,
    anchor_lang::{
        prelude::*,
        AnchorDeserialize,
        AnchorSerialize,
    },
    std::str,
};

pub const EVM_MESSAGE_PREFIX: &str = "\x19Ethereum Signed Message:\n";

/**
 * An EIP-191 prefixed signed message.
 * When a browser wallet signs a message, it prepends the payload with a prefix and the length of the payload (encoded as a string).
 * The message is (EVM_MESSAGE_PREFIX + length of the payload + payload).
 * This struct represents the prefixed message and helps with creating and verifying it.
 */

#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct EvmPrefixedMessage(Vec<u8>);

impl EvmPrefixedMessage {
    pub fn parse(data: &[u8]) -> Result<Self> {
        if data.starts_with(EVM_MESSAGE_PREFIX.as_bytes()) {
            let length_with_payload_length_prefix =
                data.len().saturating_sub(EVM_MESSAGE_PREFIX.len());
            let length = get_payload_length(length_with_payload_length_prefix)?;

            if data[EVM_MESSAGE_PREFIX.len()..].starts_with(length.to_string().as_bytes()) {
                return Ok(Self(
                    data[EVM_MESSAGE_PREFIX.len()
                        + length_with_payload_length_prefix.saturating_sub(length)..]
                        .to_vec(),
                ));
            }
        }
        Err(ErrorCode::SignatureVerificationWrongPayloadMetadata.into())
    }

    pub fn get_payload(&self) -> &[u8] {
        self.0.as_slice()
    }
}

pub fn get_payload_length(l: usize) -> Result<usize> {
    let mut number_of_digits = 0;
    let mut upperbound = 1;

    while l >= upperbound + number_of_digits {
        if l == upperbound + number_of_digits {
            return Err(ErrorCode::SignatureVerificationWrongPayloadMetadata.into());
        }
        number_of_digits += 1;
        upperbound *= 10;
    }
    Ok(l.saturating_sub(number_of_digits))
}

#[cfg(test)]
impl From<&str> for EvmPrefixedMessage {
    fn from(string: &str) -> Self {
        EvmPrefixedMessage(string.as_bytes().to_vec())
    }
}

#[cfg(test)]
impl Secp256k1TestMessage for EvmPrefixedMessage {
    fn get_message_with_metadata(&self) -> Vec<u8> {
        let mut prefixed_message = format!("{}{}", EVM_MESSAGE_PREFIX, self.0.len()).into_bytes();
        prefixed_message.extend_from_slice(&self.0);
        prefixed_message
    }
}
