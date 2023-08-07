#[cfg(test)]
use super::ed25519::Ed25519TestMessage;
use {
    super::ed25519::Ed25519Pubkey,
    crate::ErrorCode,
    anchor_lang::{
        prelude::*,
        solana_program::hash,
        AnchorDeserialize,
        AnchorSerialize,
    },
};

pub const APTOS_PREFIX: &[u8] = b"APTOS\nmessage: ";
pub const APTOS_SUFFIX: &[u8] = b"\nnonce: nonce";
pub const APTOS_SIGNATURE_SCHEME_ID: u8 = 0;


/**
* An arbitrary signed message used in Aptos.
* Only the message payload is stored in this struct.
* The message signed for Aptos is the payload prefixed with APTOS_PREFIX and suffixed with APTOS_SUFFIX.
 */

#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct AptosMessage(Vec<u8>);

impl AptosMessage {
    pub fn get_payload(&self) -> &[u8] {
        self.0.as_slice()
    }

    pub fn parse(data: &[u8]) -> Result<Self> {
        if let Some(no_prefix) = data.strip_prefix(APTOS_PREFIX) {
            if let Some(payload) = no_prefix.strip_suffix(APTOS_SUFFIX) {
                return Ok(AptosMessage(payload.to_vec()));
            }
        }
        Err(ErrorCode::SignatureVerificationWrongPayloadMetadata.into())
    }
}

#[cfg(test)]
impl Ed25519TestMessage for AptosMessage {
    fn new(payload: &str) -> Self {
        Self(payload.as_bytes().to_vec())
    }

    fn get_message_with_metadata(&self) -> Vec<u8> {
        let mut message = APTOS_PREFIX.to_vec();
        message.extend_from_slice(&self.0);
        message.extend_from_slice(APTOS_SUFFIX);
        message.to_vec()
    }
}

#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct AptosAddress([u8; 32]);

impl AptosAddress {
    pub const LEN: usize = 32;
}

impl From<Ed25519Pubkey> for AptosAddress {
    fn from(val: Ed25519Pubkey) -> Self {
        AptosAddress(hash::hashv(&[&val.to_bytes(), &[APTOS_SIGNATURE_SCHEME_ID]]).to_bytes())
    }
}

#[cfg(test)]
impl From<[u8; Self::LEN]> for AptosAddress {
    fn from(bytes: [u8; Self::LEN]) -> Self {
        AptosAddress(bytes)
    }
}
