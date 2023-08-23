use {
    crate::{
        ecosystems::ed25519::Ed25519Pubkey,
        Identity,
        IdentityCertificate,
    },
    anchor_lang::prelude::*,
};


#[derive(Clone)]
pub struct SolanaTestIdentityCertificate(Ed25519Pubkey);

impl SolanaTestIdentityCertificate {
    pub fn new(claimant: &Pubkey) -> Self {
        Self(Ed25519Pubkey::from(*claimant))
    }
}

impl From<SolanaTestIdentityCertificate> for Identity {
    fn from(val: SolanaTestIdentityCertificate) -> Self {
        Identity::Solana { pubkey: val.0 }
    }
}


impl SolanaTestIdentityCertificate {
    pub fn as_proof_of_identity(&self, _: u8) -> IdentityCertificate {
        IdentityCertificate::Solana
    }
}
