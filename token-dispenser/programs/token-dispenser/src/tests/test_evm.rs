use {
    super::dispenser_simulator::DispenserSimulator,
    crate::ecosystems::{
        cosmos::{
            self,
            CosmosMessage,
        },
        evm::EvmPrefixedMessage,
        get_expected_message,
        secp256k1::{
            EvmPubkey,
            Secp256k1InstructionData,
            Secp256k1InstructionHeader,
            Secp256k1Signature,
        },
        Secp256k1WrappedMessage,
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
    EvmPubkey(addr)
}

#[derive(Clone)]
pub struct Secp256k1SignedMessage<T: Secp256k1WrappedMessage> {
    pub prefixed_message: T,
    pub signature:        libsecp256k1::Signature,
    pub recovery_id:      libsecp256k1::RecoveryId,
}

impl<T: Secp256k1WrappedMessage> Secp256k1SignedMessage<T> {
    pub fn recover(&self) -> libsecp256k1::PublicKey {
        libsecp256k1::recover(
            &self.prefixed_message.hash(),
            &self.signature,
            &self.recovery_id,
        )
        .unwrap()
    }

    pub fn recover_as_evm_address(&self) -> EvmPubkey {
        construct_evm_pubkey(&self.recover())
    }

    pub fn random(claimant: &Pubkey) -> Self {
        let message = T::new(&get_expected_message(claimant));
        let secret = libsecp256k1::SecretKey::random(&mut rand::thread_rng());
        let (signature, recovery_id) = libsecp256k1::sign(&message.hash(), &secret);
        Self {
            prefixed_message: T::new(&get_expected_message(claimant)),
            signature,
            recovery_id,
        }
    }

    pub fn into_instruction(&self, instruction_index: u8, valid_signature: bool) -> Instruction {
        let header = Secp256k1InstructionHeader::expected_header(
            self.prefixed_message
                .get_message_with_metadata_length()
                .try_into()
                .unwrap(),
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
            signature: Secp256k1Signature(signature_bytes),
            recovery_id: self.recovery_id.serialize(),
            message: self.prefixed_message.get_message_with_metadata(),
        };

        Instruction {
            program_id: SECP256K1_ID,
            accounts:   vec![],
            data:       instruction_data.try_to_vec().unwrap(),
        }
    }
}

#[tokio::test]
pub async fn test_verify_signed_message_onchain() {
    let evm_signed_message =
        Secp256k1SignedMessage::<EvmPrefixedMessage>::random(&Pubkey::new_unique());
    let cosmos_signed_message =
        Secp256k1SignedMessage::<CosmosMessage>::random(&Pubkey::new_unique());

    let mut simulator = DispenserSimulator::new().await;

    assert!(simulator
        .process_ix(&[evm_signed_message.into_instruction(0, true)], &vec![])
        .await
        .is_ok());


    assert!(simulator
        .process_ix(&[evm_signed_message.into_instruction(0, false)], &vec![])
        .await
        .is_err());

    assert!(simulator
        .process_ix(&[cosmos_signed_message.into_instruction(0, true)], &vec![])
        .await
        .is_ok());


    assert!(simulator
        .process_ix(&[cosmos_signed_message.into_instruction(0, false)], &vec![])
        .await
        .is_err());
}
