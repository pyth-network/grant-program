use {
    crate::ecosystems::{
        aptos::AptosMessage,
        ed25519::Ed25519TestMessage,
    },
    solana_program_test::tokio,
};

#[tokio::test]
pub async fn test_aptos_message() {
    assert_eq!(
        AptosMessage::parse(&AptosMessage::new("hello").get_message_with_metadata())
            .unwrap()
            .get_payload(),
        b"hello"
    );
}
