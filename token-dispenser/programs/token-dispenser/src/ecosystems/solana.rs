#[cfg(test)]
use super::ed25519::Ed25519TestMessage;
use {
    super::get_expected_payload,
    anchor_lang::prelude::*,
};

/**
* An arbitrary signed message used in Solana
* The message that gets signed for Solana is just the raw payload.
 */
#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct SolanaMessage(Vec<u8>);

impl SolanaMessage {
    pub fn get_payload(&self) -> &[u8] {
        self.0.as_slice()
    }

    pub fn parse(data: &[u8]) -> Result<Self> {
        Ok(SolanaMessage(data.to_vec()))
    }
}

#[cfg(test)]
impl Ed25519TestMessage for SolanaMessage {
    fn expected(claimant: &Pubkey) -> Self {
        Self(get_expected_payload(claimant).into_bytes())
    }

    fn get_message_with_metadata(&self) -> Vec<u8> {
        self.0.clone()
    }
}
