#[cfg(test)]
use {
    super::ed25519::Ed25519TestMessage,
    rand::distributions::{
        Alphanumeric,
        DistString,
    },
};
use {
    crate::ErrorCode,
    anchor_lang::prelude::*,
};

/**
 * This message (borsh-serialized) needs to be signed by the dispenser guard after
 * verifying the claimant's pubkey controls the discord account.
 * The dispenser guard key should not be used for anything else.
 */
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DiscordMessage {
    username: String,
    claimant: Pubkey,
}

impl DiscordMessage {
    pub fn parse_and_check_claimant(data: &[u8], claimant: &Pubkey) -> Result<Self> {
        let result = DiscordMessage::try_from_slice(data)?;

        if result.claimant != *claimant {
            return Err(ErrorCode::SignatureVerificationWrongPayload.into());
        }

        Ok(result)
    }

    pub fn get_username(&self) -> String {
        self.username.clone()
    }
}

#[cfg(test)]
impl Ed25519TestMessage for DiscordMessage {
    fn for_claimant(claimant: &Pubkey) -> Self {
        Self {
            username: Alphanumeric.sample_string(&mut rand::thread_rng(), 16),
            claimant: *claimant,
        }
    }

    fn get_message_with_metadata(&self) -> Vec<u8> {
        self.try_to_vec().unwrap()
    }
}
