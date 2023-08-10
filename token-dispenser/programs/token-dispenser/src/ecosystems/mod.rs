use {
    crate::ErrorCode,
    anchor_lang::prelude::{
        Pubkey,
        *,
    },
};

pub mod aptos;
pub mod cosmos;
pub mod ed25519;
pub mod evm;
pub mod secp256k1;
pub mod solana;
pub mod sui;

/**
 * Ecosystem agnostic authorization payload that the identity on the leaf needs to sign.
 *
 * NOTE: Any changes to this must also be made to the corresponding
 * constant in the typescript sdk
 * */
pub const AUTHORIZATION_PAYLOAD: [&str; 3] = [
    "Pyth Grant Program ID:\n",
    "\nI irrevocably authorize Solana wallet\n",
    "\nto withdraw my token allocation.\n",
];

/**
 * Check a payload matches the expected authorization payload.
 */
pub fn check_payload(payload: &[u8], claimant: &Pubkey) -> Result<()> {
    if payload != get_expected_payload(claimant).as_bytes() {
        msg!("payload: {:?}", payload);
        msg!("expected: {:?}", get_expected_payload(claimant).as_bytes());
        return err!(ErrorCode::SignatureVerificationWrongPayload);
    }
    Ok(())
}

/**
 * Get the expected authorization payload given the claimant authorized to receive the claim.
 */
pub fn get_expected_payload(claimant: &Pubkey) -> String {
    AUTHORIZATION_PAYLOAD[0].to_string()
        + &crate::ID.to_string()
        + AUTHORIZATION_PAYLOAD[1]
        + claimant.to_string().as_str()
        + AUTHORIZATION_PAYLOAD[2]
}
