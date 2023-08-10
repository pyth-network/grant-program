use {
    super::test_secp256k1::Secp256k1TestIdentityCertificate,
    crate::{
        ecosystems::{
            cosmos::{
                CosmosMessage,
                UncompressedSecp256k1Pubkey,
            },
            get_expected_payload,
            secp256k1::EvmPubkey,
        },
        Identity,
        IdentityCertificate,
    },
    anchor_lang::prelude::Pubkey,
    pythnet_sdk::hashers::keccak256::Keccak256,
    std::marker::PhantomData,
};

impl From<Secp256k1TestIdentityCertificate<CosmosMessage, Keccak256>> for Identity {
    fn from(val: Secp256k1TestIdentityCertificate<CosmosMessage, Keccak256>) -> Self {
        Identity::Injective {
            address: val.message.get_signer(),
        }
    }
}

impl Secp256k1TestIdentityCertificate<CosmosMessage, Keccak256> {
    pub fn as_proof_of_identity(&self, verification_instruction_index: u8) -> IdentityCertificate {
        IdentityCertificate::Injective {
            pubkey: self.recover_as_evm_address(),
            verification_instruction_index,
        }
    }
}


impl Secp256k1TestIdentityCertificate<CosmosMessage, Keccak256> {
    pub fn random(claimant: &Pubkey) -> Self {
        let secret = libsecp256k1::SecretKey::random(&mut rand::thread_rng());
        let public_key = libsecp256k1::PublicKey::from_secret_key(&secret);
        let message = CosmosMessage::from((
            get_expected_payload(claimant).as_bytes(),
            &EvmPubkey::from(UncompressedSecp256k1Pubkey::from(public_key.serialize())).into(),
        ));
        let (signature, recovery_id) = libsecp256k1::sign(&Self::hash_message(&message), &secret);
        Self {
            message,
            signature,
            recovery_id,
            _hasher: PhantomData,
        }
    }
}
