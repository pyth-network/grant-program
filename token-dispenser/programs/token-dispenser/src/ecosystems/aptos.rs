use {
    super::ed25519::Ed25519Pubkey,
    crate::ErrorCode,
    anchor_lang::{
        prelude::*,
        solana_program::{
            self,
            hash,
        },
        AnchorDeserialize,
        AnchorSerialize,
    },
};

pub const APTOS_PREFIX: &str = "APTOS";
pub const APTOS_MESSAGE_PREFIX: &str = "message: ";
pub const APTOS_MESSAGE_NONCE: &str = "nonce: ";
pub const APTOS_SIGNATURE_SCHEME_ID: u8 = 0;


/**
* An arbitrary message used in Aptos.
* Only the message payload is stored in this struct.
 */
#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct AptosMessage(Vec<u8>);


impl AptosMessage {
    pub fn parse(data: &[u8]) -> Result<Self> {
        let data_as_string = std::str::from_utf8(data)
            .map_err(|_| ErrorCode::SignatureVerificationWrongMessageMetadata)?;
        let mut iter = data_as_string.split("\n");

        if let Some(prefix) = iter.next() {
            if let Some(data) = iter.next() {
                if let Some(nonce) = iter.next() {
                    if iter.next().is_none()
                        && prefix == APTOS_PREFIX
                        && nonce == APTOS_MESSAGE_NONCE
                    {
                        if data.starts_with(APTOS_MESSAGE_PREFIX) {
                            return Ok(Self(data[APTOS_MESSAGE_PREFIX.len()..].bytes().collect()));
                        }
                    }
                }
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
        let mut message = format!("{}{}{}", APTOS_PREFIX, "\n", APTOS_MESSAGE_PREFIX).into_bytes();
        message.extend_from_slice(&self.0);
        message.extend_from_slice(&format!("{}{}", "\n", APTOS_MESSAGE_NONCE).into_bytes());
        message.to_vec()
    }

    pub fn get_message_length(&self) -> usize {
        self.get_message_with_metadata().len()
    }


    pub fn hash(&self) -> hash::Hash {
        hash::hashv(&[&self.get_message_with_metadata()])
    }
}
