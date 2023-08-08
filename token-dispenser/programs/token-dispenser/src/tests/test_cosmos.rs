use {
    super::test_secp256k1::Secp256k1TestIdentityCertificate,
    crate::{
        ecosystems::{
            cosmos::{
                CosmosMessage,
                UncompressedSecp256k1Pubkey,
            },
            get_expected_payload,
            secp256k1::Secp256k1TestMessage,
        },
        Identity,
        IdentityCertificate,
    },
    anchor_lang::prelude::Pubkey,
    pythnet_sdk::hashers::Hasher,
    rand::seq::SliceRandom,
    solana_sdk::hash::hashv,
    std::marker::PhantomData,
};


/**
 * A hasher that uses the solana pre-compiled keccak256 function.
 */
#[derive(Default, Debug, Clone, PartialEq)]
pub struct Sha256 {}
impl Hasher for Sha256 {
    type Hash = [u8; 32];

    fn hashv(data: &[impl AsRef<[u8]>]) -> Self::Hash {
        hashv(&data.iter().map(|x| x.as_ref()).collect::<Vec<&[u8]>>()).to_bytes()
    }
}

impl From<Secp256k1TestIdentityCertificate<CosmosMessage, Sha256>> for Identity {
    fn from(val: Secp256k1TestIdentityCertificate<CosmosMessage, Sha256>) -> Self {
        Identity::Cosmwasm {
            address: val.message.get_signer(),
        }
    }
}

impl From<Secp256k1TestIdentityCertificate<CosmosMessage, Sha256>> for IdentityCertificate {
    fn from(val: Secp256k1TestIdentityCertificate<CosmosMessage, Sha256>) -> Self {
        IdentityCertificate::Cosmwasm {
            chain_id:    val.message.extract_chain_id(),
            signature:   val.signature.serialize().into(),
            recovery_id: val.recovery_id.into(),
            pubkey:      val.recover().serialize().into(),
            message:     val.message.get_message_with_metadata(),
        }
    }
}

impl<U: Hasher> Secp256k1TestIdentityCertificate<CosmosMessage, U> {
    pub fn random(claimant: &Pubkey) -> Self {
        let secret = libsecp256k1::SecretKey::random(&mut rand::thread_rng());
        let public_key = libsecp256k1::PublicKey::from_secret_key(&secret);
        let chain_id = ["osmo", "cosmos", "neutron"]
            .choose(&mut rand::thread_rng())
            .unwrap()
            .to_string();

        let message = CosmosMessage::from((
            get_expected_payload(claimant).as_bytes(),
            &UncompressedSecp256k1Pubkey::from(public_key.serialize())
                .into_bech32(chain_id.as_str()),
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
