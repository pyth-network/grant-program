use serde_json::Value;

use {
    crate::tests::test_evm::construct_evm_pubkey,
    anchor_lang::solana_program,
    bech32::ToBase32,
    ripemd::{
        self,
        Digest,
    },
    solana_program_test::tokio,
    std::hash::Hash,
};

const sample_message : &str = r#"{"account_number":"0","chain_id":"","fee":{"amount":[],"gas":"0"},"memo":"","msgs":[{"type":"sign/MsgSignData","value":{"data":"aGVsbG8gd29ybGQ=","signer":"osmo1ymk637a7wljvt4w7q9lnrw95mg9sr37yatxd9h"}}],"sequence":"0"}"#;

#[tokio::test]
pub async fn test_verify_signed_message_onchain() {
    let pubkey: [u8; 33] = [
        3, 48, 114, 61, 21, 63, 159, 19, 166, 233, 129, 43, 123, 186, 189, 173, 173, 78, 170, 212,
        88, 246, 109, 129, 18, 101, 92, 144, 121, 59, 184, 186, 203,
    ];
    let hash1 = solana_program::hash::hashv(&[&pubkey]);
    let mut hasher: ripemd::Ripemd160 = ripemd::Ripemd160::new();
    hasher.update(&hash1);
    let hash2 = hasher.finalize();
    println!(
        "{}",
        bech32::encode("cosmos", &hash2.to_base32(), bech32::Variant::Bech32).unwrap()
    );
    println!(
        "{}",
        bech32::encode("neutron", &hash2.to_base32(), bech32::Variant::Bech32).unwrap()
    );
    println!(
        "{}",
        bech32::encode("osmo", &hash2.to_base32(), bech32::Variant::Bech32).unwrap()
    );


    let inj_pubkey: [u8; 33] = [
        3, 80, 146, 6, 37, 107, 81, 163, 205, 121, 114, 159, 33, 142, 214, 54, 54, 40, 198, 45,
        187, 146, 175, 88, 50, 228, 131, 73, 220, 119, 49, 106, 181,
    ];

    println!("{:?}", &libsecp256k1::PublicKey::parse_compressed(&inj_pubkey).unwrap().serialize());
    let inj_evm =
        &construct_evm_pubkey(&libsecp256k1::PublicKey::parse_compressed(&inj_pubkey).unwrap());
    // let mut hasher : ripemd::Ripemd160 = ripemd::Ripemd160::new();
    // hasher.update(&hash1);
    // let hash2 = hasher.finalize();
    println!(
        "{}",
        bech32::encode("inj", &inj_evm.0.to_base32(), bech32::Variant::Bech32).unwrap()
    );
    
    let v: Value = serde_json::from_str(sample_message).unwrap();

    // Access parts of the data by indexing with square brackets.
    println!("account_number: {}", v["msgs"]);

    println!("SAMPLE MESSAGE: {}", sample_message);
}


struct CosmosS