use {
    crate::ErrorCode,
    anchor_lang::prelude::{
        Pubkey,
        *,
    },
};

pub mod evm;
pub mod secp256k1;
pub mod cosmos;

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
    return "Pyth Grant Program".to_string();
}
