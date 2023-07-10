use {
    crate::{
        ecosystems::{
            cosmos::{
                CosmosMessage,
                CosmosPubkey,
            },
            get_expected_message,
            secp256k1::Secp256k1Signature,
        },
        Identity,
        IdentityCertificate,
    },
    anchor_lang::prelude::Pubkey,
    rand::seq::SliceRandom,
};

#[derive(Clone)]
pub struct CosmosTestIdentityCertificate {
    pub chain_id:    String,
    pub signature:   libsecp256k1::Signature,
    pub recovery_id: libsecp256k1::RecoveryId,
    pub message:     CosmosMessage,
}

impl CosmosTestIdentityCertificate {
    pub fn recover(&self) -> libsecp256k1::PublicKey {
        libsecp256k1::recover(&self.message.hash(), &self.signature, &self.recovery_id).unwrap()
    }

    pub fn random(claimant: &Pubkey) -> Self {
        let message: CosmosMessage = CosmosMessage::new(&get_expected_message(claimant));
        let secret = libsecp256k1::SecretKey::random(&mut rand::thread_rng());
        let (signature, recovery_id) = libsecp256k1::sign(&message.hash(), &secret);
        Self {
            chain_id: ["osmo", "cosmos", "neutron"]
                .choose(&mut rand::thread_rng())
                .unwrap()
                .to_string(),
            message,
            signature,
            recovery_id,
        }
    }
}

impl Into<Identity> for CosmosTestIdentityCertificate {
    fn into(self) -> Identity {
        Identity::Cosmwasm(CosmosPubkey(self.recover().serialize()).into_bech32(&self.chain_id))
    }
}

impl Into<IdentityCertificate> for CosmosTestIdentityCertificate {
    fn into(self) -> IdentityCertificate {
        IdentityCertificate::Cosmwasm {
            chain_id:    self.chain_id.clone(),
            signature:   Secp256k1Signature(self.signature.serialize()),
            recovery_id: self.recovery_id.into(),
            pubkey:      CosmosPubkey(self.recover().serialize()),
            message:     self.message.get_message_with_metadata(),
        }
    }
}
