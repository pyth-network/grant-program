use {
    crate::{
        ecosystems::{
            aptos::AptosMessage,
            ed25519::{
                Ed25519InstructionData,
                Ed25519InstructionHeader,
                Ed25519Pubkey,
                Ed25519Signature,
                TestMessage,
            },
            get_expected_message,
            sui::SuiMessage,
        },
        tests::dispenser_simulator::DispenserSimulator,
        Identity,
        IdentityCertificate,
    },
    anchor_lang::{
        prelude::Pubkey,
        solana_program::ed25519_program::ID as ED25519_ID,
        AnchorSerialize,
    },
    ed25519_dalek::{
        Keypair,
        Signer,
    },
    rand_compatible::rngs::OsRng,
    solana_program_test::tokio,
    solana_sdk::instruction::Instruction,
};

#[derive(Clone)]
pub struct Ed25519TestIdentityCertificate<T: TestMessage> {
    pub message:   T,
    pub signature: ed25519_dalek::Signature,
    pub publickey: ed25519_dalek::PublicKey,
}

impl<T: TestMessage> Ed25519TestIdentityCertificate<T> {
    pub fn random(claimant: &Pubkey) -> Self {
        let message = T::new(&get_expected_message(claimant));
        let mut csprng = OsRng {};
        let keypair: Keypair = Keypair::generate(&mut csprng);
        let signature = keypair.sign(&message.get_message_with_metadata());
        let publickey = keypair.public;
        Self {
            message,
            signature,
            publickey,
        }
    }

    pub fn into_instruction(&self, instruction_index: u8, valid_signature: bool) -> Instruction {
        let header = Ed25519InstructionHeader::expected_header(
            self.message.get_message_length().try_into().unwrap(),
            instruction_index,
        );

        let mut signature_bytes = self.signature.to_bytes();
        if !valid_signature {
            // Flip the first byte of the signature to make it invalid
            signature_bytes[0] ^= 0xff;
        }


        let instruction_data = Ed25519InstructionData {
            header,
            signature: Ed25519Signature(signature_bytes),
            pubkey: Ed25519Pubkey(self.publickey.to_bytes()),
            message: self.message.get_message_with_metadata(),
        };

        Instruction {
            program_id: ED25519_ID,
            accounts:   vec![],
            data:       instruction_data.try_to_vec().unwrap(),
        }
    }
}

impl Into<Identity> for Ed25519TestIdentityCertificate<AptosMessage> {
    fn into(self) -> Identity {
        Identity::Aptos {
            address: Ed25519Pubkey(self.publickey.to_bytes()).into(),
        }
    }
}

impl Ed25519TestIdentityCertificate<AptosMessage> {
    pub fn into_proof_of_identity(
        &self,
        verification_instruction_index: u8,
    ) -> IdentityCertificate {
        IdentityCertificate::Aptos {
            pubkey: Ed25519Pubkey(self.publickey.to_bytes()),
            verification_instruction_index,
        }
    }
}

impl Into<Identity> for Ed25519TestIdentityCertificate<SuiMessage> {
    fn into(self) -> Identity {
        Identity::Sui {
            address: Ed25519Pubkey(self.publickey.to_bytes()).into(),
        }
    }
}


impl Ed25519TestIdentityCertificate<SuiMessage> {
    pub fn into_proof_of_identity(
        &self,
        verification_instruction_index: u8,
    ) -> IdentityCertificate {
        IdentityCertificate::Sui {
            pubkey: Ed25519Pubkey(self.publickey.to_bytes()),
            verification_instruction_index,
        }
    }
}

#[tokio::test]
pub async fn test_aptos_message() {
    assert!(AptosMessage::parse("APTOS\nmessage: hello\nnonce: nonce".as_bytes()).is_ok());
    assert_eq!(
        AptosMessage::parse(&AptosMessage::new("hello").get_message_with_metadata())
            .unwrap()
            .get_payload(),
        b"hello"
    );
}

#[tokio::test]
pub async fn test_verify_signed_message_onchain() {
    let signed_message =
        Ed25519TestIdentityCertificate::<SuiMessage>::random(&Pubkey::new_unique());

    let mut simulator = DispenserSimulator::new().await;

    assert!(ed25519_dalek::Verifier::verify(
        &signed_message.publickey,
        &signed_message.message.get_message_with_metadata(),
        &signed_message.signature
    )
    .is_ok());

    assert!(simulator
        .process_ix(&[signed_message.into_instruction(0, true)], &vec![])
        .await
        .is_ok());

    assert!(simulator
        .process_ix(&[signed_message.into_instruction(0, false)], &vec![])
        .await
        .is_err());
}
