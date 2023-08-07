use {
    super::dispenser_simulator::DispenserSimulator,
    crate::{
        ecosystems::{
            evm::EvmPrefixedMessage,
            get_expected_message,
            secp256k1::{
                EvmPubkey,
                Secp256k1InstructionData,
                Secp256k1InstructionHeader,
            },
        },
        Identity,
        IdentityCertificate,
    },
    anchor_lang::{
        prelude::Pubkey,
        solana_program::secp256k1_program::ID as SECP256K1_ID,
        AnchorSerialize,
    },
    pythnet_sdk::hashers::{
        keccak256::Keccak256,
        Hasher,
    },
    solana_program_test::tokio,
    solana_sdk::instruction::Instruction,
};

/// Creates an Ethereum address from a secp256k1 public key.
pub fn construct_evm_pubkey(pubkey: &libsecp256k1::PublicKey) -> EvmPubkey {
    let mut addr = [0u8; EvmPubkey::LEN];
    addr.copy_from_slice(&Keccak256::hashv(&[&pubkey.serialize()[1..]])[12..]);
    assert_eq!(addr.len(), EvmPubkey::LEN);
    addr.into()
}

#[derive(Clone)]
pub struct EvmTestIdentityCertificate {
    pub message:     EvmPrefixedMessage,
    pub signature:   libsecp256k1::Signature,
    pub recovery_id: libsecp256k1::RecoveryId,
}

impl EvmTestIdentityCertificate {
    pub fn recover(&self) -> libsecp256k1::PublicKey {
        libsecp256k1::recover(&self.message.hash(), &self.signature, &self.recovery_id).unwrap()
    }

    pub fn recover_as_evm_address(&self) -> EvmPubkey {
        construct_evm_pubkey(&self.recover())
    }

    pub fn random(claimant: &Pubkey) -> Self {
        let prefixed_message = EvmPrefixedMessage::new(&get_expected_message(claimant));
        let secret = libsecp256k1::SecretKey::random(&mut rand::thread_rng());
        let (signature, recovery_id) = libsecp256k1::sign(&prefixed_message.hash(), &secret);
        Self {
            message: EvmPrefixedMessage::new(&get_expected_message(claimant)),
            signature,
            recovery_id,
        }
    }

    pub fn as_instruction(&self, instruction_index: u8, valid_signature: bool) -> Instruction {
        let header = Secp256k1InstructionHeader::expected_header(
            self.message.get_prefix_length().try_into().unwrap(),
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
            message: self.message.get_prefixed_message(),
        };

        Instruction {
            program_id: SECP256K1_ID,
            accounts:   vec![],
            data:       instruction_data.try_to_vec().unwrap(),
        }
    }
}

impl From<EvmTestIdentityCertificate> for Identity {
    fn from(val: EvmTestIdentityCertificate) -> Self {
        Identity::Evm {
            pubkey: val.recover_as_evm_address(),
        }
    }
}

impl EvmTestIdentityCertificate {
    pub fn as_proof_of_identity(&self, verification_instruction_index: u8) -> IdentityCertificate {
        IdentityCertificate::Evm {
            pubkey: self.recover_as_evm_address(),
            verification_instruction_index,
        }
    }
}

#[tokio::test]
pub async fn test_verify_signed_message_onchain() {
    let signed_message = EvmTestIdentityCertificate::random(&Pubkey::new_unique());

    let mut simulator = DispenserSimulator::new().await;

    assert!(simulator
        .process_ix(&[signed_message.as_instruction(0, true)], &vec![])
        .await
        .is_ok());


    assert!(simulator
        .process_ix(&[signed_message.as_instruction(0, false)], &vec![])
        .await
        .is_err());
}
