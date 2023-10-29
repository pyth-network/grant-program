use {
    super::test_secp256k1::Secp256k1TestIdentityCertificate,
    crate::{
        ecosystems::{
            cosmos::{
                CosmosMessage,
                UncompressedSecp256k1Pubkey,
                ADMISSIBLE_CHAIN_IDS,
            },
            get_expected_payload,
        },
        ErrorCode,
        Identity,
        IdentityCertificate,
    },
    anchor_lang::{
        error,
        prelude::Pubkey,
    },
    pythnet_sdk::hashers::Hasher,
    rand::seq::SliceRandom,
    solana_sdk::hash::hashv,
    std::marker::PhantomData,
};


/**
 * A Sha256 hasher
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
            message:     Secp256k1TestIdentityCertificate::<CosmosMessage, Sha256>::hash_message(
                &val.message,
            )
            .serialize()
            .to_vec(),
        }
    }
}

impl Secp256k1TestIdentityCertificate<CosmosMessage, Sha256> {
    pub fn random(claimant: &Pubkey) -> Self {
        let secret = libsecp256k1::SecretKey::random(&mut rand::thread_rng());
        let public_key = libsecp256k1::PublicKey::from_secret_key(&secret);
        let chain_id = ADMISSIBLE_CHAIN_IDS
            .choose(&mut rand::thread_rng())
            .unwrap()
            .to_string();

        let message = CosmosMessage::from((
            get_expected_payload(claimant).as_bytes(),
            &UncompressedSecp256k1Pubkey::from(public_key.serialize())
                .into_bech32(chain_id.as_str())
                .unwrap(),
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


#[test]
pub fn test_authorized_cosmos_chain_ids() {
    let secret = libsecp256k1::SecretKey::random(&mut rand::thread_rng());
    let public_key = libsecp256k1::PublicKey::from_secret_key(&secret);
    assert!(UncompressedSecp256k1Pubkey::from(public_key.serialize())
        .into_bech32("neutron")
        .is_ok());
    assert_eq!(
        UncompressedSecp256k1Pubkey::from(public_key.serialize())
            .into_bech32("cosmos")
            .unwrap_err(),
        error!(ErrorCode::UnauthorizedCosmosChainId)
    );
}
