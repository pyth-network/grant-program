use {
    crate::ErrorCode,
    anchor_lang::prelude::{
        Pubkey,
        *,
    },
};

pub mod cosmos;
pub mod evm;
pub mod secp256k1;

/**
 * Ecosystem agnostic authorization message that the identity on the leaf needs to sign.
 * */
pub const AUTHORIZATION_MESSAGE: [&str; 3] = [
    "Pyth Grant Program ID:\n",
    "\nI irrevocably authorize Solana wallet\n",
    "\nto withdraw my token allocation.\n",
];

/**
 * Check a message matches the expected authorization message.
 */
pub fn check_message(message: &[u8], claimant: &Pubkey) -> Result<()> {
    if message != get_expected_message(claimant).as_bytes() {
        return Err(ErrorCode::SignatureVerificationWrongMessage.into());
    }
    Ok(())
}

/**
 * Get the expected authorization message given the claimant authorized to receive the claim.
 */
pub fn get_expected_message(claimant: &Pubkey) -> String {
    AUTHORIZATION_MESSAGE[0].to_string()
        + &crate::ID.to_string()
        + AUTHORIZATION_MESSAGE[1]
        + claimant.to_string().as_str()
        + AUTHORIZATION_MESSAGE[2]
}

#[cfg(test)]
use pythnet_sdk::hashers::{
    keccak256::Keccak256,
    Hasher,
};

#[cfg(test)]
pub trait Secp256k1WrappedMessage {
    fn new(message: &str) -> Self;
    fn get_message_with_metadata(&self) -> Vec<u8>;
    fn hash(&self) -> libsecp256k1::Message {
        libsecp256k1::Message::parse(&Keccak256::hashv(&[&self.get_message_with_metadata()]))
    }
    fn get_message_with_metadata_length(&self) -> usize {
        self.get_message_with_metadata().len()
    }
}
