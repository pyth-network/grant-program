use solana_sdk::instruction::Instruction;

use crate::ecosystems::secp256k1::{EvmPubkey, Secp256k1InstructionHeader, Secp256k1InstructionData};

use super::test_evm::construct_evm_pubkey;

use {
    crate::{
        ecosystems::{
            cosmos::{
                CosmosMessage,
                UncompressedSecp256k1Pubkey,
            },
            get_expected_payload,
        },
        Identity,
        IdentityCertificate,
    },
    anchor_lang::prelude::Pubkey,
    anchor_lang::AnchorDeserialize,
    anchor_lang::AnchorSerialize,
    anchor_lang::solana_program::secp256k1_program::ID as SECP256K1_ID,
};
use base64::{
    engine::general_purpose::STANDARD as base64_standard_engine,
    Engine as _,
};

#[derive(Clone)]
pub struct InjectiveTestIdentityCertificate {
    pub message:     CosmosMessage,
    pub signature:   libsecp256k1::Signature,
    pub recovery_id: libsecp256k1::RecoveryId,
}

impl InjectiveTestIdentityCertificate {
    pub fn recover(&self) -> libsecp256k1::PublicKey {
        libsecp256k1::recover(&self.message.hash_injective(), &self.signature, &self.recovery_id).unwrap()
    }

    pub fn recover_as_evm_address(&self) -> EvmPubkey {
        construct_evm_pubkey(&self.recover())
    }

    pub fn random(claimant: &Pubkey) -> Self {
        let prefixed_message = CosmosMessage::new(&get_expected_payload(claimant));
        let secret = libsecp256k1::SecretKey::random(&mut rand::thread_rng());
        let (signature, recovery_id) = libsecp256k1::sign(&prefixed_message.hash_injective(), &secret);
        Self {
            message: prefixed_message,
            signature,
            recovery_id,
        }
    }

    pub fn fixed() -> Self {
        let signature = libsecp256k1::Signature::parse_standard_slice(&base64_standard_engine.decode("EgVlT3SnPZMKtQ0ZKbbJtFoDB4aOAa4E5DJK7qwNxyF5h8mRcsu6PypOX20MWZ+ldyFNKETjHLtiBsJ+b4j5Hw==").unwrap()).unwrap();
        let recovery_id = libsecp256k1::RecoveryId::parse(1u8).unwrap();
        let message = CosmosMessage::new("Pyth grant program");
        return  InjectiveTestIdentityCertificate{
            message,
            signature,
            recovery_id,
        };
        
    }

    pub fn as_instruction(&self, instruction_index: u8, valid_signature: bool) -> Instruction {

        let header = Secp256k1InstructionHeader::expected_header(
            self.message.get_message_length().try_into().unwrap(),
            instruction_index,
        );

        let mut signature_bytes = self.signature.serialize();
        if !valid_signature {
            // Flip the first byte of the signature to make it invalid
            signature_bytes[0] ^= 0xff;
        }


        let instruction_data = Secp256k1InstructionData {
            header,
            eth_address: self.recover_as_evm_address(),
            signature: signature_bytes.into(),
            recovery_id: self.recovery_id.serialize(),
            message: self.message.get_message_with_metadata(),
        };

        Instruction {
            program_id: SECP256K1_ID,
            accounts:   vec![],
            data:       instruction_data.try_to_vec().unwrap(),
        }
    }
}

impl From<InjectiveTestIdentityCertificate> for Identity {
    fn from(val: InjectiveTestIdentityCertificate) -> Self {
        Identity::Injective { address: val.recover_as_evm_address().into() }
    }
}

impl InjectiveTestIdentityCertificate {
    pub fn as_proof_of_identity(&self, verification_instruction_index: u8) -> IdentityCertificate {
        IdentityCertificate::Injective  {
            pubkey: self.recover_as_evm_address(),
            verification_instruction_index,
        }
    }
}
