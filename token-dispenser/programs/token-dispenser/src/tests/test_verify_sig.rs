use libsecp256k1::RecoveryId;

const ETH_SAMPLE_MESSAGE : &str = "\x19Ethereum Signed Message:\n275localhost:3000 wants you to sign in with your Ethereum account:\n0xf3f9225A2166861e745742509CED164183a626d7\n\nSign In With Ethereum to prove you control this wallet.\n\nURI: http://localhost:3000\nVersion: 1\nChain ID: 1\nNonce: wIdVdFLtFSwM6Cfri\nIssued At: 2023-06-22T12:45:06.577Z";

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

#[test]
pub fn verify_sig_message() {
    // let pubkey = hex::decode("f3f9225A2166861e745742509CED164183a626d7").unwrap();
    println!("{:?}", ETH_SAMPLE_MESSAGE.as_bytes());
    let hash = libsecp256k1::Message::parse(&Keccak256::hashv(&[ETH_SAMPLE_MESSAGE.as_bytes()]));
    let signature = "dac0dfe99fb958f80aa0bda65b4fe3b02a7f4d07baa8395b5dad8585e69fe5d05d9a52c108d201a4465348b3fd8aecd7e56a9690c0ee584fd3b8d6cd7effb46d";
    let signature_bytes = hex::decode(signature).expect("Decoding failed");
    let mut signature_array: [u8; 64] = [0; 64];
    signature_array.copy_from_slice(&signature_bytes[..]);
    let signature_string =
        libsecp256k1::Signature::parse_standard(&signature_array).expect("Decoding failed");

    let recovery_id = RecoveryId::parse_rpc(0x1b).unwrap();

    let eth = libsecp256k1::recover(&hash, &signature_string, &recovery_id).unwrap();

    println!("{:?}", ETH_SAMPLE_MESSAGE.len());
    println!("{:?}", hex::encode(construct_eth_pubkey(&eth)));
}

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
