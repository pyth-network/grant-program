#[cfg(test)]
use super::ed25519::Ed25519TestMessage;
use {
    super::{
        ed25519::Ed25519Pubkey,
        get_expected_payload,
    },
    crate::ErrorCode,
    anchor_lang::{
        prelude::*,
        AnchorDeserialize,
        AnchorSerialize,
    },
    blake2_rfc::blake2b::Blake2b,
    uleb128::WriteULeb128Ext,
};


pub const SUI_SIGNATURE_SCHEME_ID: u8 = 0;
pub const SUI_PREFIX: &[u8] = &[3, 0, 0];

/**
* An arbitrary message used in Sui
* Only the message payload is stored in this struct.
* The message that gets signed for Sui is the blake2b256 hash of the prefixed payload. (i.e. blake2b(SUI_PREFIX + payload))
*
 */
#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct SuiMessage(Vec<u8>);


impl SuiMessage {
    pub fn get_expected_hash(payload: &str) -> Vec<u8> {
        let mut result: Vec<u8> = Vec::<u8>::new();
        result.extend(SUI_PREFIX);
        result.write_uleb128_u64(payload.len() as u64).unwrap();
        result.extend_from_slice(payload.as_bytes());
        blake2_rfc::blake2b::blake2b(32, &[], &result)
            .as_bytes()
            .to_vec()
    }


    /**
     * Sui hashes the prefixed payload with Blake2b before signing therefore we can't use the same flow
     * of parsing the message as in other ecosystems. Instead we just check that the hash of the prefixed payload
     * matches the hash of the expected payload
     */
    pub fn check_hashed_payload(payload: &[u8], claimant: &Pubkey) -> Result<()> {
        if payload != SuiMessage::get_expected_hash(&get_expected_payload(claimant)) {
            return err!(ErrorCode::SignatureVerificationWrongPayload);
        }
        Ok(())
    }
}


#[cfg(test)]
impl Ed25519TestMessage for SuiMessage {
    fn for_claimant(claimant: &Pubkey) -> Self {
        Self(get_expected_payload(claimant).into_bytes())
    }

    fn get_message_with_metadata(&self) -> Vec<u8> {
        let mut result: Vec<u8> = Vec::<u8>::new();
        result.extend(SUI_PREFIX);
        result.write_uleb128_u64(self.0.len() as u64).unwrap();
        result.extend_from_slice(&self.0);
        blake2_rfc::blake2b::blake2b(32, &[], &result)
            .as_bytes()
            .to_vec()
    }
}


#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct SuiAddress([u8; 32]);

impl SuiAddress {
    pub const LEN: usize = 32;
}

impl From<Ed25519Pubkey> for SuiAddress {
    fn from(val: Ed25519Pubkey) -> Self {
        let mut context = Blake2b::new(32);
        let mut result = SuiAddress([0u8; 32]);
        context.update(&[SUI_SIGNATURE_SCHEME_ID]);
        context.update(&val.to_bytes());

        result.0.copy_from_slice(context.finalize().as_bytes());
        result
    }
}

#[cfg(test)]
impl From<[u8; Self::LEN]> for SuiAddress {
    fn from(bytes: [u8; Self::LEN]) -> Self {
        SuiAddress(bytes)
    }
}


#[test]
pub fn test_check_hashed_payload() {
    let claimant = Pubkey::new_unique();
    let expected_hash = SuiMessage::get_expected_hash(&get_expected_payload(&claimant));

    assert!(SuiMessage::check_hashed_payload(&expected_hash, &claimant).is_ok());

    assert_eq!(
        SuiMessage::check_hashed_payload(&expected_hash, &Pubkey::new_unique()),
        err!(ErrorCode::SignatureVerificationWrongPayload)
    );
    assert_eq!(
        SuiMessage::check_hashed_payload(
            &SuiMessage::get_expected_hash("this_is_the_wrong_payload"),
            &claimant
        ),
        err!(ErrorCode::SignatureVerificationWrongPayload)
    );
}
