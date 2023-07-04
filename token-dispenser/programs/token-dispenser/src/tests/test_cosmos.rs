use {
    crate::{
        ecosystems::{
            cosmos::{
                CosmosBech32Address,
                CosmosMessage,
                CosmosPubkey,
            },
            evm::EvmPrefixedMessage,
            get_expected_message,
            secp256k1::Secp256k1Signature,
        },
        ClaimCertificate,
        Identity,
        ProofOfIdentity,
    },
    anchor_lang::prelude::Pubkey,
    pythnet_sdk::wire::v1::Proof,
    rand::{
        seq::SliceRandom,
        Rng,
    },
};

#[derive(Clone)]
pub struct CosmosOffChainProofOfIdentity {
    pub chain_id:    String,
    pub signature:   libsecp256k1::Signature,
    pub recovery_id: libsecp256k1::RecoveryId,
    pub message:     CosmosMessage,
}

impl CosmosOffChainProofOfIdentity {
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

impl Into<Identity> for CosmosOffChainProofOfIdentity {
    fn into(self) -> Identity {
        Identity::Cosmwasm(CosmosPubkey(self.recover().serialize()).into_bech32(&self.chain_id))
    }
}

impl Into<ProofOfIdentity> for CosmosOffChainProofOfIdentity {
    fn into(self) -> ProofOfIdentity {
        ProofOfIdentity::Cosmwasm {
            chain_id:    self.chain_id.clone(),
            signature:   Secp256k1Signature(self.signature.serialize()),
            recovery_id: self.recovery_id.into(),
            pubkey:      CosmosPubkey(self.recover().serialize()),
            message:     self.message.get_message_with_metadata(),
        }
    }
}
