use {
    super::secp256k1::EvmPubkey,
    crate::ErrorCode,
    anchor_lang::{
        prelude::*,
        solana_program::{
            hash,
            keccak,
        },
        AnchorDeserialize,
        AnchorSerialize,
    },
    base64::{
        engine::general_purpose::STANDARD as base64_standard_engine,
        Engine as _,
    },
    bech32::ToBase32,
    ripemd::Digest,
    serde::{
        Deserialize,
        Serialize,
    },
};

pub const EXPECTED_COSMOS_MESSAGE_TYPE: &str = "sign/MsgSignData";
pub const ODD_PREFIX: u8 = 0x03;
pub const EVEN_PREFIX: u8 = 0x02;
pub const COMPRESSED_LENGTH: usize = 33;

#[derive(AnchorDeserialize, AnchorSerialize, Clone, Copy, PartialEq)]
pub struct CosmosPubkey(pub [u8; Self::LEN]);
impl CosmosPubkey {
    pub const LEN: usize = 65;
}

impl Into<EvmPubkey> for CosmosPubkey {
    fn into(self) -> EvmPubkey {
        let mut addr = [0u8; EvmPubkey::LEN];
        addr.copy_from_slice(&keccak::hashv(&[&self.0[1..]]).to_bytes()[12..]);
        assert_eq!(addr.len(), EvmPubkey::LEN);
        EvmPubkey(addr)
    }
}

#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct CosmosMessage(Vec<u8>);

impl CosmosMessage {
    pub fn parse(data: &[u8]) -> Result<Self> {
        let sign_doc: CosmosStdSignDoc = serde_json::from_slice(data)
            .map_err(|_| ErrorCode::SignatureVerificationWrongMessageMetadata)?;

        if !(sign_doc.account_number == "0"
            && sign_doc.chain_id.is_empty()
            && sign_doc.fee.amount.is_empty()
            && sign_doc.fee.gas == "0"
            && sign_doc.memo.is_empty()
            && sign_doc.msgs.len() == 1
            && sign_doc.sequence == "0")
        {
            return Err(ErrorCode::SignatureVerificationWrongMessageMetadata.into());
        }

        if sign_doc.msgs[0].r#type != EXPECTED_COSMOS_MESSAGE_TYPE {
            return Err(ErrorCode::SignatureVerificationWrongMessageMetadata.into());
        }
        Ok(CosmosMessage(
            base64_standard_engine
                .decode(sign_doc.msgs[0].value.data.as_bytes())
                .map_err(|_| ErrorCode::SignatureVerificationWrongMessageMetadata)?,
        ))
    }

    pub fn get_payload(&self) -> &[u8] {
        self.0.as_slice()
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CosmosStdSignDoc {
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


// impl Secp256k1WrappedMessage for CosmosMessage {

#[cfg(test)]
impl CosmosMessage {
    pub fn new(message: &str) -> Self {
        Self(message.as_bytes().to_vec())
    }

    pub fn get_message_with_metadata(&self) -> Vec<u8> {
        let sign_doc: CosmosStdSignDoc = CosmosStdSignDoc {
            account_number: "0".to_string(),
            chain_id:       "".to_string(),
            fee:            CosmosStdFee {
                amount: vec![],
                gas:    "0".to_string(),
            },
            memo:           "".to_string(),
            msgs:           vec![CosmosStdMsg {
                r#type: EXPECTED_COSMOS_MESSAGE_TYPE.to_string(),
                value:  CosmosAdr036Value {
                    data:   base64_standard_engine.encode(&self.0),
                    signer: "".to_string(),
                },
            }],
            sequence:       "0".to_string(),
        };
        return serde_json::to_string(&sign_doc)
            .unwrap()
            .as_bytes()
            .to_vec();
    }

    pub fn hash(&self) -> libsecp256k1::Message {
        libsecp256k1::Message::parse(&hash::hashv(&[&self.get_message_with_metadata()]).to_bytes())
    }
}


#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct CosmosBech32Address(pub String);

impl CosmosPubkey {
    pub fn into_bech32(self, chain_id: &str) -> CosmosBech32Address {
        let mut compressed: [u8; COMPRESSED_LENGTH] = [0; COMPRESSED_LENGTH];
        compressed[1..].copy_from_slice(&self.0[1..COMPRESSED_LENGTH]);
        compressed[0] = if self.0[Self::LEN - 1] % 2 == 0 {
            EVEN_PREFIX
        } else {
            ODD_PREFIX
        };
        let hash1 = hash::hashv(&[&compressed]);
        let mut hasher: ripemd::Ripemd160 = ripemd::Ripemd160::new();
        hasher.update(hash1);
        let hash2 = hasher.finalize();
        CosmosBech32Address(
            bech32::encode(chain_id, hash2.to_base32(), bech32::Variant::Bech32).unwrap(),
        )
    }
}
