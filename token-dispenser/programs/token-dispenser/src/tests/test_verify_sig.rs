// const ETH_SAMPLE_MESSAGE : String = "localhost:3000 wants you to sign in with your Ethereum account:\n" +
// "0xf3f9225A2166861e745742509CED164183a626d7\n" +
// "\n" +
// "Sign In With Ethereum to prove you control this wallet.\n" +
// "\n" +
// "URI: http://localhost:3000\n" +
// "Version: 1\n" +
// "Chain ID: 1\n" +
// "Nonce: hjCoOeDU55zTKLwOc\n" +
// "Issued At: 2023-06-21T16:29:13.024Z";

// const ETH_SAMPLE_SIGNATURE : String = "0x031bf6d550f95621494e7dcfc79cb42a6cce5aa59f5c343c674c3b6269839eb51558caceecaa8f3b4c344bb17d6c6b57dd5a34dc9d431c45ff2e75383959b6821c";
use {
    super::dispenser_simulator::DispenserSimulator,
    crate::tests::verify::verify_secp256k1_signature,
    anchor_lang::prelude::Pubkey,
    pythnet_sdk::hashers::{
        keccak256::Keccak256,
        Hasher,
    },
    rand::thread_rng,
    solana_program_test::tokio,
    solana_sdk::{
        ed25519_instruction,
        secp256k1_instruction::{
            self,
            new_secp256k1_instruction,
            HASHED_PUBKEY_SERIALIZED_SIZE,
        },
    },
};

const HELLO: &str = "hello";

#[tokio::test]
pub async fn verify_sig() {
    let secp_privkey = libsecp256k1::SecretKey::random(&mut thread_rng());
    let hash = libsecp256k1::Message::parse(&Keccak256::hashv(&[HELLO]));
    let (signature, recovery_id) = libsecp256k1::sign(&hash, &secp_privkey);

    let eth_public_key =
        construct_eth_pubkey(&libsecp256k1::PublicKey::from_secret_key(&secp_privkey));

    let mut simulator = DispenserSimulator::new().await;

    assert!(libsecp256k1::verify(
        &hash,
        &signature,
        &libsecp256k1::PublicKey::from_secret_key(&secp_privkey)
    ));
    simulator
        .process_ix(
            &[verify_secp256k1_signature(
                eth_public_key,
                signature.serialize(),
                HELLO.as_bytes(),
                recovery_id.serialize(),
            )],
            &vec![],
        )
        .await
        .unwrap();
}

/// Creates an Ethereum address from a secp256k1 public key.
pub fn construct_eth_pubkey(
    pubkey: &libsecp256k1::PublicKey,
) -> [u8; HASHED_PUBKEY_SERIALIZED_SIZE] {
    let mut addr = [0u8; HASHED_PUBKEY_SERIALIZED_SIZE];
    addr.copy_from_slice(&Keccak256::hashv(&[&pubkey.serialize()[1..]])[12..]);
    assert_eq!(addr.len(), HASHED_PUBKEY_SERIALIZED_SIZE);
    addr
}
