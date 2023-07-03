use {
    crate::tests::test_evm::construct_evm_pubkey,
    anchor_lang::solana_program,
    base64::{
        engine::general_purpose::STANDARD as base64_standard_engine,
        Engine as _,
    },
    bech32::ToBase32,
    ripemd::{
        self,
        Digest,
    },
    serde::{
        Deserialize,
        Serialize,
    },
    serde_json::Value,
    solana_program_test::tokio,
    solana_sdk::{
        hash::hashv,
        signature,
    },
    std::hash::Hash,
};

const MESSAGE: &str = "Pyth Grant Program";
const b64_pubkey: &str = "AzByPRU/nxOm6YEre7q9ra1OqtRY9m2BEmVckHk7uLrL";
const b64_signature: &str =
    "SyifqLu+llCqBT8IOroipXV3uh/cpxWRziLCvNbV9Ut+16q3TNaRo4wSIgEoFidsqYTqbGvjJVnBQuKcC85/gg==";
const sample_message: &str = r#"{"account_number":"0","chain_id":"","fee":{"amount":[],"gas":"0"},"memo":"","msgs":[{"type":"sign/MsgSignData","value":{"data":"UHl0aCBHcmFudCBQcm9ncmFt","signer":"cosmos1lv3rrn5trdea7vs43z5m4y34d5r3zxp484wcpu"}}],"sequence":"0"}"#;

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

    println!(
        "{:?}",
        &libsecp256k1::PublicKey::parse_compressed(&inj_pubkey)
            .unwrap()
            .serialize()
    );
    let inj_evm =
        &construct_evm_pubkey(&libsecp256k1::PublicKey::parse_compressed(&inj_pubkey).unwrap());
    // let mut hasher : ripemd::Ripemd160 = ripemd::Ripemd160::new();
    // hasher.update(&hash1);
    // let hash2 = hasher.finalize();
    println!(
        "{}",
        bech32::encode("inj", &inj_evm.0.to_base32(), bech32::Variant::Bech32).unwrap()
    );

    let v: CosmosStdDoc = serde_json::from_str(sample_message).unwrap();

    // Access parts of the data by indexing with square brackets.
    println!("account_number: {:?}", v.msgs);

    println!("SAMPLE MESSAGE: {}", sample_message);

    let mut pubkey_bytes: [u8; 33] = [0; 33];
    pubkey_bytes.copy_from_slice(&base64_standard_engine.decode(b64_pubkey).unwrap());
    let pubkey: libsecp256k1::PublicKey =
        libsecp256k1::PublicKey::parse_compressed(&pubkey_bytes).unwrap();
    println!("{:?}", pubkey.serialize());

    let mut signature_bytes: [u8; 64] = [0; 64];
    signature_bytes.copy_from_slice(&base64_standard_engine.decode(b64_signature).unwrap());
    let signature: libsecp256k1::Signature =
        libsecp256k1::Signature::parse_standard(&signature_bytes).unwrap();

    let message = libsecp256k1::Message::parse(&hashv(&[sample_message.as_bytes()]).to_bytes());

    println!(
        "RECOVERED: {:?}",
        libsecp256k1::recover(
            &message,
            &signature,
            &libsecp256k1::RecoveryId::parse(0).unwrap()
        )
        .unwrap()
        .serialize()
    );
    println!(
        "RECOVERED: {:?}",
        libsecp256k1::recover(
            &message,
            &signature,
            &libsecp256k1::RecoveryId::parse(1).unwrap()
        )
        .unwrap()
        .serialize()
    );
    libsecp256k1::recover(
        &message,
        &signature,
        &libsecp256k1::RecoveryId::parse(2).unwrap(),
    )
    .is_err();
    libsecp256k1::recover(
        &message,
        &signature,
        &libsecp256k1::RecoveryId::parse(3).unwrap(),
    )
    .is_err();

    assert_eq!(
        pubkey,
        libsecp256k1::recover(
            &message,
            &signature,
            &libsecp256k1::RecoveryId::parse(1).unwrap()
        )
        .unwrap()
    );
}


#[derive(Serialize, Deserialize, Debug)]
struct CosmosStdDoc {
    account_number: String,
    chain_id:       String,
    fee:            CosmosStdFee,
    memo:           String,
    msgs:           Vec<CosmosStdMsg>,
    sequence:       String,
}

#[derive(Serialize, Deserialize, Debug)]
struct CosmosStdMsg {
    r#type: String,
    value:  CosmosAdr036Value,
}

#[derive(Serialize, Deserialize, Debug)]
struct CosmosAdr036Value {
    data:   String,
    signer: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct CosmosStdFee {
    amount: Vec<CosmosCoin>,
    gas:    String,
}

#[derive(Serialize, Deserialize, Debug)]
struct CosmosCoin {
    amount: String,
    denom:  String,
}
