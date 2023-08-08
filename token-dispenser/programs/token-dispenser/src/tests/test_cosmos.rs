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
            address: UncompressedSecp256k1Pubkey::from(val.recover().serialize())
                .into_bech32("osmo"),
        }
    }
}

impl From<Secp256k1TestIdentityCertificate<CosmosMessage, Sha256>> for IdentityCertificate {
    fn from(val: Secp256k1TestIdentityCertificate<CosmosMessage, Sha256>) -> Self {
        IdentityCertificate::Cosmwasm {
            chain_id:    "osmo".to_string(),
            signature:   val.signature.serialize().into(),
            recovery_id: val.recovery_id.into(),
            pubkey:      val.recover().serialize().into(),
            message:     val.message.get_message_with_metadata(),
        }
    }
}
