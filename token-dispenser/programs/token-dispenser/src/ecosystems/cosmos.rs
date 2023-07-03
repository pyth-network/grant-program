#[cfg(test)]
use super::Secp256k1WrappedMessage;
use {
    super::secp256k1::EvmPubkey,
    crate::ErrorCode,
    anchor_lang::{
        prelude::*,
        solana_program,
        AnchorDeserialize,
        AnchorSerialize,
    },
    base64::{
        engine::general_purpose::STANDARD as base64_standard_engine,
        Engine as _,
    },
    serde::{
        Deserialize,
        Serialize,
    },
    solana_program::keccak,
};

pub const EXPECTED_COSMOS_MESSAGE_TYPE: &str = "sign/MsgSignData";
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
            && sign_doc.chain_id == ""
            && sign_doc.fee.amount.len() == 0
            && sign_doc.fee.gas == "0"
            && sign_doc.memo == ""
            && sign_doc.msgs.len() == 1
            && sign_doc.sequence == "0")
        {
            return Err(ErrorCode::SignatureVerificationWrongMessageMetadata.into());
        }

        if !(sign_doc.msgs[0].r#type == EXPECTED_COSMOS_MESSAGE_TYPE) {
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


#[cfg(test)]
impl Secp256k1WrappedMessage for CosmosMessage {
    fn new(message: &str) -> Self {
        Self(message.as_bytes().to_vec())
    }

    fn get_message_with_metadata(&self) -> Vec<u8> {
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
}
