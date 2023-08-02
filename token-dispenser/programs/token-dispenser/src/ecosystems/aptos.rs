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
pub const APTOS_SUFFIX: &[u8] = b"\nnonce: ";
pub const APTOS_SIGNATURE_SCHEME_ID: u8 = 0;


/**
* An arbitrary message used in Aptos.
* Only the message payload is stored in this struct.
 */
#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct AptosMessage(Vec<u8>);


impl AptosMessage {
    pub fn parse(data: &[u8]) -> Result<Self> {
        if let Some(no_prefix) = data.strip_prefix(APTOS_PREFIX) {
            if let Some(message) = no_prefix.strip_suffix(APTOS_SUFFIX) {
                return Ok(AptosMessage(message.to_vec()));
            }
        }
        Err(ErrorCode::SignatureVerificationWrongMessageMetadata.into())
    }

    pub fn get_payload(&self) -> &[u8] {
        self.0.as_slice()
    }
}


#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct AptosAddress(pub [u8; 32]);

impl Into<AptosAddress> for Ed25519Pubkey {
    fn into(self) -> AptosAddress {
        AptosAddress(hash::hashv(&[&self.0, &[APTOS_SIGNATURE_SCHEME_ID]]).to_bytes())
    }
}

#[cfg(test)]
impl AptosMessage {
    pub fn new(message: &str) -> Self {
        Self(message.as_bytes().to_vec())
    }
    pub fn get_message_with_metadata(&self) -> Vec<u8> {
        let mut message = APTOS_PREFIX.to_vec();
        message.extend_from_slice(&self.0);
        message.extend_from_slice(&APTOS_SUFFIX);
        message.to_vec()
    }

    pub fn get_message_length(&self) -> usize {
        self.get_message_with_metadata().len()
    }


    pub fn hash(&self) -> hash::Hash {
        hash::hashv(&[&self.get_message_with_metadata()])
    }
}
