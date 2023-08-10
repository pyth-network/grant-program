use {
    crate::ecosystems::{
        aptos::AptosMessage,
        ed25519::Ed25519TestMessage,
        get_expected_payload,
    },
    anchor_lang::prelude::Pubkey,
    solana_program_test::tokio,
};

#[tokio::test]
pub async fn test_aptos_message() {
    let claimant = Pubkey::new_unique();
    assert_eq!(
        AptosMessage::parse(&AptosMessage::for_claimant(&claimant).get_message_with_metadata())
            .unwrap()
            .get_payload(),
        get_expected_payload(&claimant).as_bytes()
    );
}
