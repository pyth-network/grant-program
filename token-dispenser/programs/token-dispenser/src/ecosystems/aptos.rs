#[cfg(test)]
use super::ed25519::Ed25519TestMessage;
use {
    crate::ErrorCode,
    anchor_lang::{
        prelude::*,
        AnchorDeserialize,
        AnchorSerialize,
    },
};

pub const APTOS_PREFIX: &[u8] = b"APTOS\nmessage: ";
pub const APTOS_SUFFIX: &[u8] = b"\nnonce: nonce";
pub const APTOS_SIGNATURE_SCHEME_ID: u8 = 0;


/**
* An arbitrary message used in Aptos.
* Only the message payload is stored in this struct.
 */

#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct AptosMessage(Vec<u8>);

impl AptosMessage {
    pub fn get_payload(&self) -> &[u8] {
        self.0.as_slice()
    }

    pub fn parse(data: &[u8]) -> Result<Self> {
        if let Some(no_prefix) = data.strip_prefix(APTOS_PREFIX) {
            if let Some(message) = no_prefix.strip_suffix(APTOS_SUFFIX) {
                return Ok(AptosMessage(message.to_vec()));
            }
        }
        Err(ErrorCode::SignatureVerificationWrongMessageMetadata.into())
    }
}

#[cfg(test)]
impl Ed25519TestMessage for AptosMessage {
    fn new(message: &str) -> Self {
        Self(message.as_bytes().to_vec())
    }

    fn get_message_with_metadata(&self) -> Vec<u8> {
        let mut message = APTOS_PREFIX.to_vec();
        message.extend_from_slice(&self.0);
        message.extend_from_slice(APTOS_SUFFIX);
        message.to_vec()
    }
}

#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct AptosAddress(pub [u8; 32]);
