#[cfg(test)]
use super::ed25519::Ed25519TestMessage;
use {
    crate::ErrorCode,
    anchor_lang::prelude::*,
};

/**
 * This message (borsh-serialized) needs to be signed by the dispenser guard after
 * verifying the claimant's pubkey controls the discord account.
 * The dispenser guard key should not be used for anything else.
 */
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct DiscordMessage {
    username: String,
    claimant: Pubkey,
}

impl DiscordMessage {
    pub fn parse_and_check_claimant_and_username(
        data: &[u8],
        username: &str,
        claimant: &Pubkey,
    ) -> Result<Self> {
        let result = DiscordMessage::try_from_slice(data)?;

        if result.username != *username {
            return err!(ErrorCode::SignatureVerificationWrongPayload);
        }

        if result.claimant != *claimant {
            return err!(ErrorCode::SignatureVerificationWrongPayload);
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
            username: claimant.to_string(),
            claimant: *claimant,
        }
    }

    fn get_message_with_metadata(&self) -> Vec<u8> {
        self.try_to_vec().unwrap()
    }
}


#[test]
pub fn test_discord_parse_and_check_claimant_and_username() {
    let claimant = Pubkey::new_unique();
    let username = claimant.to_string();
    let message = DiscordMessage::for_claimant(&claimant);
    assert_eq!(
        DiscordMessage::parse_and_check_claimant_and_username(
            &message.get_message_with_metadata(),
            &username,
            &claimant,
        )
        .unwrap()
        .get_username(),
        username
    );

    let other_claimant = Pubkey::new_unique();
    let res = DiscordMessage::parse_and_check_claimant_and_username(
        &message.get_message_with_metadata(),
        &username,
        &other_claimant,
    );
    assert!(res.is_err());
    assert_eq!(
        res.unwrap_err(),
        Error::from(ErrorCode::SignatureVerificationWrongPayload)
    );

    let other_username = "other_username";
    let res = DiscordMessage::parse_and_check_claimant_and_username(
        &message.get_message_with_metadata(),
        other_username,
        &claimant,
    );
    assert!(res.is_err());
    assert_eq!(
        res.unwrap_err(),
        Error::from(ErrorCode::SignatureVerificationWrongPayload)
    );
}
