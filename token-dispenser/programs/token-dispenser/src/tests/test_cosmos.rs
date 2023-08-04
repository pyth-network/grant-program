use {
    crate::{
        ecosystems::{
            cosmos::CosmosMessage,
            get_expected_message,
            secp256k1::{
                Secp256k1Signature,
                UncompressedSecp256k1Pubkey,
            },
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

impl From<CosmosTestIdentityCertificate> for Identity {
    fn from(val: CosmosTestIdentityCertificate) -> Self {
        Identity::Cosmwasm {
            address: UncompressedSecp256k1Pubkey(val.recover().serialize()).into_bech32(&val.chain_id),
        }
    }
}

impl From<CosmosTestIdentityCertificate> for IdentityCertificate {
    fn from(val: CosmosTestIdentityCertificate) -> Self {
        IdentityCertificate::Cosmwasm {
            chain_id:    val.chain_id.clone(),
            signature:   Secp256k1Signature(val.signature.serialize()),
            recovery_id: val.recovery_id.into(),
            pubkey:      UncompressedSecp256k1Pubkey(val.recover().serialize()),
            message:     val.message.get_message_with_metadata(),
        }
    }
}
