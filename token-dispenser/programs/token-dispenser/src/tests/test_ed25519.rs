use {
    crate::{
        ecosystems::{
            aptos::AptosMessage,
            ed25519::{
                Ed25519InstructionData,
                Ed25519InstructionHeader,
                Ed25519Pubkey,
                Ed25519TestMessage,
            },
            get_expected_payload,
            solana::SolanaMessage,
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
pub struct Ed25519TestIdentityCertificate<T: Ed25519TestMessage> {
    pub message:   T,
    pub signature: ed25519_dalek::Signature,
    pub publickey: ed25519_dalek::PublicKey,
}

impl<T: Ed25519TestMessage> Ed25519TestIdentityCertificate<T> {
    pub fn random(claimant: &Pubkey) -> Self {
        let message = T::new(&get_expected_payload(claimant));
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

    pub fn as_instruction(&self, instruction_index: u8, valid_signature: bool) -> Instruction {
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
            signature: signature_bytes.into(),
            pubkey: self.publickey.to_bytes().into(),
            message: self.message.get_message_with_metadata(),
        };

        Instruction {
            program_id: ED25519_ID,
            accounts:   vec![],
            data:       instruction_data.try_to_vec().unwrap(),
        }
    }
}

impl From<Ed25519TestIdentityCertificate<AptosMessage>> for Identity {
    fn from(val: Ed25519TestIdentityCertificate<AptosMessage>) -> Self {
        Identity::Aptos {
            address: Ed25519Pubkey::from(val.publickey.to_bytes()).into(),
        }
    }
}

impl Ed25519TestIdentityCertificate<AptosMessage> {
    pub fn as_proof_of_identity(&self, verification_instruction_index: u8) -> IdentityCertificate {
        IdentityCertificate::Aptos {
            pubkey: self.publickey.to_bytes().into(),
            verification_instruction_index,
        }
    }
}

impl From<Ed25519TestIdentityCertificate<SuiMessage>> for Identity {
    fn from(val: Ed25519TestIdentityCertificate<SuiMessage>) -> Self {
        Identity::Sui {
            address: Ed25519Pubkey::from(val.publickey.to_bytes()).into(),
        }
    }
}


impl Ed25519TestIdentityCertificate<SuiMessage> {
    pub fn as_proof_of_identity(&self, verification_instruction_index: u8) -> IdentityCertificate {
        IdentityCertificate::Sui {
            pubkey: Ed25519Pubkey::from(self.publickey.to_bytes()),
            verification_instruction_index,
        }
    }
}

impl From<Ed25519TestIdentityCertificate<SolanaMessage>> for Identity {
    fn from(val: Ed25519TestIdentityCertificate<SolanaMessage>) -> Self {
        Identity::Solana {
            pubkey: Ed25519Pubkey::from(val.publickey.to_bytes()),
        }
    }
}


impl Ed25519TestIdentityCertificate<SolanaMessage> {
    pub fn as_proof_of_identity(&self, verification_instruction_index: u8) -> IdentityCertificate {
        IdentityCertificate::Solana {
            pubkey: Ed25519Pubkey::from(self.publickey.to_bytes()),
            verification_instruction_index,
        }
    }
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
        .process_ix(&[signed_message.as_instruction(0, true)], &vec![])
        .await
        .is_ok());

    assert!(simulator
        .process_ix(&[signed_message.as_instruction(0, false)], &vec![])
        .await
        .is_err());
}
