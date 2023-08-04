use {
    crate::ErrorCode,
    anchor_lang::{
        prelude::*,
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
};

pub const EXPECTED_COSMOS_MESSAGE_TYPE: &str = "sign/MsgSignData";

/**
* An ADR036 message used in Cosmos. ADR036 is a standard for signing arbitrary data.
* Only the message payload is stored in this struct.
 */
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

/**
* A Cosmos signed doc. It's basically a Cosmos transaction.
* The signer signs the hash of the signed doc serialized as JSON.
* For ADR036 (arbitrary messages), a lot of fields are zeroed.
 */
#[derive(Serialize, Deserialize, Debug)]
pub struct CosmosStdSignDoc {
    account_number: String,
    chain_id:       String,
    fee:            CosmosStdFee,
    memo:           String,
    msgs:           Vec<CosmosStdMsg>,
    sequence:       String,
}

/**
* A cosmos message, there can be more than one in a signed doc.
*/
#[derive(Serialize, Deserialize, Debug)]
struct CosmosStdMsg {
    r#type: String,
    value:  CosmosAdr036Value,
}

/**
* The payload of a Cosmos ADR036 message.
*/
#[derive(Serialize, Deserialize, Debug)]
struct CosmosAdr036Value {
    data:   String,
    signer: String,
}

/**
* Fee information in a signed doc. for ADR036 this is zeroed.
*/
#[derive(Serialize, Deserialize, Debug)]
struct CosmosStdFee {
    amount: Vec<CosmosCoin>,
    gas:    String,
}

/**
* A Cosmos coin used in the fee information.
*/
#[derive(Serialize, Deserialize, Debug)]
struct CosmosCoin {
    amount: String,
    denom:  String,
}

#[cfg(test)]
impl CosmosMessage {
    pub fn new(message: &str) -> Self {
        Self(message.as_bytes().to_vec())
    }

    /**
     * Returns the serialized message including metadata.
     */
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
