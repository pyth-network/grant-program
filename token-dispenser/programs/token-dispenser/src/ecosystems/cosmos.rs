#[cfg(test)]
use super::secp256k1::Secp256k1TestMessage;
use {
    super::{
        get_expected_payload,
        secp256k1::{
            EvmPubkey,
            SECP256K1_COMPRESSED_PUBKEY_LENGTH,
            SECP256K1_EVEN_PREFIX,
            SECP256K1_ODD_PREFIX,
        },
    },
    crate::ErrorCode,
    anchor_lang::{
        prelude::*,
        solana_program::hash,
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
pub const INJECTIVE_CHAIN_ID: &str = "inj";
pub const ADMISSIBLE_CHAIN_IDS: [&str; 3] = ["sei", "neutron", "osmo"];

/**
* An ADR036 message used in Cosmos. ADR036 is a standard for signing arbitrary data.
* Only the message payload is stored in this struct.
* The message signed for Cosmos is a JSON serialized CosmosStdSignDoc containing the payload and ADR036 compliant parameters.
* The message also contains the bech32 address of the signer. We check that the signer corresponds to the public key.
 */
#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct CosmosMessage {
    payload: Vec<u8>,
    signer:  CosmosBech32Address,
}

impl CosmosMessage {
    pub fn parse(data: &[u8], signer: &CosmosBech32Address) -> Result<Self> {
        let sign_doc: CosmosStdSignDoc = serde_json::from_slice(data)
            .map_err(|_| error!(ErrorCode::SignatureVerificationWrongPayloadMetadata))?;

        if !(sign_doc.account_number == "0"
            && sign_doc.chain_id.is_empty()
            && sign_doc.fee.amount.is_empty()
            && sign_doc.fee.gas == "0"
            && sign_doc.memo.is_empty()
            && sign_doc.msgs.len() == 1
            && sign_doc.sequence == "0")
        {
            return err!(ErrorCode::SignatureVerificationWrongPayloadMetadata);
        }

        if sign_doc.msgs[0].r#type != EXPECTED_COSMOS_MESSAGE_TYPE {
            return err!(ErrorCode::SignatureVerificationWrongPayloadMetadata);
        }

        if sign_doc.msgs[0].value.signer != signer.0 {
            return err!(ErrorCode::SignatureVerificationWrongPayloadMetadata);
        }

        Ok(CosmosMessage {
            payload: base64_standard_engine
                .decode(sign_doc.msgs[0].value.data.as_bytes())
                .map_err(|_| error!(ErrorCode::SignatureVerificationWrongPayloadMetadata))?,
            signer:  CosmosBech32Address(sign_doc.msgs[0].value.signer.clone()),
        })
    }


    pub fn get_payload(&self) -> &[u8] {
        self.payload.as_slice()
    }

    pub fn build_message(payload: &[u8], signer: &CosmosBech32Address) -> Vec<u8> {
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
                    data:   base64_standard_engine.encode(payload),
                    signer: signer.0.clone(),
                },
            }],
            sequence:       "0".to_string(),
        };
        return serde_json::to_string(&sign_doc)
            .unwrap()
            .as_bytes()
            .to_vec();
    }

    pub fn get_expected_hash(payload: &[u8], signer: &CosmosBech32Address) -> [u8; 32] {
        hash::hashv(&[&CosmosMessage::build_message(payload, signer)]).to_bytes()
    }

    pub fn check_hashed_payload(
        hashed_message: &[u8],
        signer: &CosmosBech32Address,
        claimant: &Pubkey,
    ) -> Result<()> {
        if hashed_message
            != CosmosMessage::get_expected_hash(get_expected_payload(claimant).as_bytes(), signer)
        {
            return err!(ErrorCode::SignatureVerificationWrongPayload);
        }
        Ok(())
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

impl UncompressedSecp256k1Pubkey {
    /** Cosmos public addresses are different than the public key.
     * This one way algorithm converts the public key to the public address.
     * Note that the claimant needs to submit the public key to the program
     * to verify the signature.
     */
    pub fn into_bech32(self, chain_id: &str) -> Result<CosmosBech32Address> {
        let mut compressed: [u8; SECP256K1_COMPRESSED_PUBKEY_LENGTH] =
            [0; SECP256K1_COMPRESSED_PUBKEY_LENGTH];
        compressed[1..].copy_from_slice(&self.0[1..SECP256K1_COMPRESSED_PUBKEY_LENGTH]);
        compressed[0] = if self.0[Self::LEN - 1] % 2 == 0 {
            SECP256K1_EVEN_PREFIX
        } else {
            SECP256K1_ODD_PREFIX
        };
        let hash1 = hash::hashv(&[&compressed]);
        let mut hasher: ripemd::Ripemd160 = ripemd::Ripemd160::new();
        hasher.update(hash1);
        let hash2 = hasher.finalize();

        require!(
            ADMISSIBLE_CHAIN_IDS.contains(&chain_id),
            ErrorCode::UnauthorizedCosmosChainId
        );

        Ok(CosmosBech32Address(
            bech32::encode(chain_id, hash2.to_base32(), bech32::Variant::Bech32).unwrap(),
        ))
    }

    pub fn as_bytes(&self) -> [u8; Self::LEN] {
        self.0
    }
}


/**
 * A Secp256k1 pubkey used in Cosmos.
 */
#[derive(AnchorDeserialize, AnchorSerialize, Clone, Copy, PartialEq)]
pub struct UncompressedSecp256k1Pubkey([u8; Self::LEN]);
impl UncompressedSecp256k1Pubkey {
    pub const LEN: usize = 65;
}


#[cfg(test)]
impl From<[u8; Self::LEN]> for UncompressedSecp256k1Pubkey {
    fn from(bytes: [u8; Self::LEN]) -> Self {
        UncompressedSecp256k1Pubkey(bytes)
    }
}


#[derive(AnchorDeserialize, AnchorSerialize, Clone, Debug)]
pub struct CosmosBech32Address(String);

impl From<EvmPubkey> for CosmosBech32Address {
    fn from(value: EvmPubkey) -> Self {
        CosmosBech32Address(
            bech32::encode(
                INJECTIVE_CHAIN_ID,
                value.as_bytes().to_base32(),
                bech32::Variant::Bech32,
            )
            .unwrap(),
        )
    }
}


#[cfg(test)]
impl From<&str> for CosmosBech32Address {
    fn from(bytes: &str) -> Self {
        CosmosBech32Address(bytes.to_string())
    }
}

#[cfg(test)]
impl Secp256k1TestMessage for CosmosMessage {
    fn get_message_with_metadata(&self) -> Vec<u8> {
        CosmosMessage::build_message(&self.payload, &self.signer)
    }
}

#[cfg(test)]
impl From<(&[u8], &CosmosBech32Address)> for CosmosMessage {
    fn from(value: (&[u8], &CosmosBech32Address)) -> Self {
        CosmosMessage {
            payload: value.0.to_vec(),
            signer:  value.1.clone(),
        }
    }
}


#[cfg(test)]
pub const BECH32_SEPARATOR: &str = "1";

#[cfg(test)]
impl CosmosMessage {
    pub fn extract_chain_id(&self) -> String {
        self.signer
            .0
            .split(BECH32_SEPARATOR)
            .next()
            .unwrap()
            .to_string()
    }

    pub fn get_signer(&self) -> CosmosBech32Address {
        self.signer.clone()
    }
}
