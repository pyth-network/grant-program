use {
    super::dispenser_simulator::DispenserSimulator,
    crate::{
        ecosystems::{
            evm::EvmPrefixedMessage,
            get_expected_payload,
            secp256k1::{
                EvmPubkey,
                Secp256k1InstructionData,
                Secp256k1InstructionHeader,
                Secp256k1TestMessage,
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
    std::marker::PhantomData,
};

/// Creates an Ethereum address from a secp256k1 public key.
pub fn construct_evm_pubkey(pubkey: &libsecp256k1::PublicKey) -> EvmPubkey {
    let mut addr = [0u8; EvmPubkey::LEN];
    addr.copy_from_slice(&Keccak256::hashv(&[&pubkey.serialize()[1..]])[12..]);
    assert_eq!(addr.len(), EvmPubkey::LEN);
    addr.into()
}

#[derive(Clone)]
pub struct Secp256k1TestIdentityCertificate<T: Secp256k1TestMessage, U: Hasher> {
    pub message:     T,
    pub signature:   libsecp256k1::Signature,
    pub recovery_id: libsecp256k1::RecoveryId,
    pub _hasher:     PhantomData<U>,
}

impl<T: Secp256k1TestMessage, U: Hasher> Secp256k1TestIdentityCertificate<T, U> {
    pub fn hash_message(message: &T) -> libsecp256k1::Message {
        libsecp256k1::Message::parse_slice(
            U::hashv(&[&message.get_message_with_metadata()]).as_ref(),
        )
        .unwrap()
    }

    pub fn recover(&self) -> libsecp256k1::PublicKey {
        libsecp256k1::recover(
            &Self::hash_message(&self.message),
            &self.signature,
            &self.recovery_id,
        )
        .unwrap()
    }

    pub fn recover_as_evm_address(&self) -> EvmPubkey {
        construct_evm_pubkey(&self.recover())
    }
}

impl<T: Secp256k1TestMessage> Secp256k1TestIdentityCertificate<T, Keccak256> {
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

impl From<Secp256k1TestIdentityCertificate<EvmPrefixedMessage, Keccak256>> for Identity {
    fn from(val: Secp256k1TestIdentityCertificate<EvmPrefixedMessage, Keccak256>) -> Self {
        Identity::Evm {
            pubkey: val.recover_as_evm_address(),
        }
    }
}

impl Secp256k1TestIdentityCertificate<EvmPrefixedMessage, Keccak256> {
    pub fn as_proof_of_identity(&self, verification_instruction_index: u8) -> IdentityCertificate {
        IdentityCertificate::Evm {
            pubkey: self.recover_as_evm_address(),
            verification_instruction_index,
        }
    }
}
impl Secp256k1TestIdentityCertificate<EvmPrefixedMessage, Keccak256> {
    pub fn random(claimant: &Pubkey) -> Self {
        let message = EvmPrefixedMessage::from(get_expected_payload(claimant).as_str());
        let secret = libsecp256k1::SecretKey::random(&mut rand::thread_rng());
        let (signature, recovery_id) = libsecp256k1::sign(&Self::hash_message(&message), &secret);
        Self {
            message,
            signature,
            recovery_id,
            _hasher: PhantomData,
        }
    }
}

#[tokio::test]
pub async fn test_verify_signed_message_onchain() {
    let signed_message: Secp256k1TestIdentityCertificate<EvmPrefixedMessage, Keccak256> =
        Secp256k1TestIdentityCertificate::<EvmPrefixedMessage, Keccak256>::random(
            &Pubkey::new_unique(),
        );

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
