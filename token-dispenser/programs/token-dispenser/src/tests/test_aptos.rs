use {
    crate::{
        ecosystems::{
            aptos::AptosMessage,
            ed25519::{
                Ed25519InstructionData,
                Ed25519InstructionHeader,
                Ed25519Pubkey,
                Ed25519Signature,
            },
            get_expected_message,
        },
        tests::dispenser_simulator::DispenserSimulator,
    },
    anchor_lang::{
        prelude::Pubkey,
        solana_program::ed25519_program::ID as ED25519_ID,
        AnchorSerialize,
    },
    ed25519_dalek::{
        Keypair,
        Signature,
        Signer,
    },
    rand_compatible::rngs::OsRng,
    solana_program_test::tokio,
    solana_sdk::instruction::Instruction,
};


pub struct AptosTestIdentityCertificate {
    pub message:   AptosMessage,
    pub signature: ed25519_dalek::Signature,
    pub publickey: ed25519_dalek::PublicKey,
}

impl AptosTestIdentityCertificate {
    pub fn random(claimant: &Pubkey) -> Self {
        let message = AptosMessage::new(&get_expected_message(claimant));
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

#[tokio::test]
pub async fn test_verify_aptos() {
    let message = AptosMessage::parse("APTOS\nmessage: hello\nnonce: ".as_bytes()).unwrap();
    println!("{:?}", message.get_payload())
}

#[tokio::test]
pub async fn test_verify_signed_message_onchain() {
    let signed_message = AptosTestIdentityCertificate::random(&Pubkey::new_unique());

    let mut simulator = DispenserSimulator::new().await;

    assert!(simulator
        .process_ix(&[signed_message.into_instruction(0, true)], &vec![])
        .await
        .is_ok());


    assert!(simulator
        .process_ix(&[signed_message.into_instruction(0, false)], &vec![])
        .await
        .is_err());
}
