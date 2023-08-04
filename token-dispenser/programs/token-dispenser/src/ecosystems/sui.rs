#[cfg(test)]
use super::ed25519::TestMessage;
use {
    super::{
        ed25519::Ed25519Pubkey,
        get_expected_message,
    },
    crate::ErrorCode,
    anchor_lang::{
        prelude::*,
        AnchorDeserialize,
        AnchorSerialize,
    },
    blake2_rfc::blake2b::Blake2b,
};


pub const SUI_SIGNATURE_SCHEME_ID: u8 = 0;
pub const SUI_PREFIX: &[u8] = &[3, 0, 0];

/**
* An arbitrary message used in Sui
* Only the message payload is stored in this struct.
 */
#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct SuiMessage(Vec<u8>);

#[cfg(test)]
impl TestMessage for SuiMessage {
    fn new(message: &str) -> Self {
        Self(message.as_bytes().to_vec())
    }

    fn get_message_with_metadata(&self) -> Vec<u8> {
        let mut result: Vec<u8> = Vec::<u8>::new();
        result.extend(SUI_PREFIX);
        result.extend_from_slice(&self.0);
        blake2_rfc::blake2b::blake2b(32, &[], &result)
            .as_bytes()
            .to_vec()
    }
}

impl SuiMessage {
    pub fn get_expected_hash(message: &str) -> Vec<u8> {
        let mut result: Vec<u8> = Vec::<u8>::new();
        result.extend(SUI_PREFIX);
        result.extend_from_slice(&message.as_bytes());
        blake2_rfc::blake2b::blake2b(32, &[], &result)
            .as_bytes()
            .to_vec()
    }
}

pub fn check_hashed_message(message: &[u8], claimant: &Pubkey) -> Result<()> {
    if message != &SuiMessage::get_expected_hash(&get_expected_message(claimant)) {
        return Err(ErrorCode::SignatureVerificationWrongMessage.into());
    }
    Ok(())
}

#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct SuiAddress(pub [u8; 32]);

impl Into<SuiAddress> for Ed25519Pubkey {
    fn into(self) -> SuiAddress {
        let mut context = Blake2b::new(32);
        let mut result = SuiAddress([0u8; 32]);
        context.update(&[SUI_SIGNATURE_SCHEME_ID]);
        context.update(&self.0);

        result.0.copy_from_slice(context.finalize().as_bytes());
        return result;
    }
}
