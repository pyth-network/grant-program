use {
    crate::ErrorCode,
    anchor_lang::prelude::{
        Pubkey,
        *,
    },
};

pub mod evm;

pub const MESSAGE: [&str; 2] = [
    "I irrevocably authorize Solana wallet\n",
    "\nto withdraw my token allocation.\n",
];

pub fn check_message_matches(message: &[u8], claimant: &Pubkey) -> Result<()> {
    if (message != get_expected_message(claimant).as_bytes()) {
        return Err(ErrorCode::SignatureVerificationWrongMessage.into());
    }
    Ok(())
}

pub fn get_expected_message(claimant: &Pubkey) -> String {
    MESSAGE[0].to_string() + claimant.to_string().as_str() + "\nto withdraw my token allocation.\n"
}
