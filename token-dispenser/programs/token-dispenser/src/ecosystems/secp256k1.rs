use {
    crate::ErrorCode,
    anchor_lang::{
        prelude::*,
        solana_program::{
            hash,
            instruction::Instruction,
            secp256k1_program::ID as SECP256K1_ID,
            secp256k1_recover::secp256k1_recover,
        },
        AnchorDeserialize,
        AnchorSerialize,
    },
    bech32::ToBase32,
    ripemd::Digest,
};


pub const SECP256K1_FULL_PREFIX: u8 = 0x04;
pub const SECP256K1_ODD_PREFIX: u8 = 0x03;
pub const SECP256K1_EVEN_PREFIX: u8 = 0x02;
pub const SECP256K1_COMPRESSED_PUBKEY_LENGTH: usize = 33;

#[derive(AnchorDeserialize, AnchorSerialize, Clone, Copy, PartialEq)]
pub struct EvmPubkey([u8; Self::LEN]);
impl EvmPubkey {
    pub const LEN: usize = 20;
}

#[cfg(test)]
impl From<[u8; Self::LEN]> for EvmPubkey {
    fn from(bytes: [u8; Self::LEN]) -> Self {
        EvmPubkey(bytes)
    }
}

#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct Secp256k1Signature([u8; Secp256k1Signature::LEN]);
impl Secp256k1Signature {
    pub const LEN: usize = 64;
}

#[cfg(test)]
impl From<[u8; Self::LEN]> for Secp256k1Signature {
    fn from(bytes: [u8; Self::LEN]) -> Self {
        Secp256k1Signature(bytes)
    }
}


#[derive(AnchorDeserialize, AnchorSerialize, Clone, PartialEq, Eq, Debug)]
pub struct Secp256k1InstructionHeader {
    pub num_signatures:                u8,
    pub signature_offset:              u16,
    pub signature_instruction_index:   u8,
    pub eth_address_offset:            u16,
    pub eth_address_instruction_index: u8,
    pub message_data_offset:           u16,
    pub message_data_size:             u16,
    pub message_instruction_index:     u8,
}

impl Secp256k1InstructionHeader {
    pub const LEN: u16 = 1 + 2 + 1 + 2 + 1 + 2 + 2 + 1;
}

/** The layout of a Secp256k1 signature verification instruction on Solana */
pub struct Secp256k1InstructionData {
    pub header:      Secp256k1InstructionHeader,
    pub signature:   Secp256k1Signature,
    pub recovery_id: u8,
    pub eth_address: EvmPubkey,
    pub message:     Vec<u8>,
}

impl Secp256k1InstructionHeader {
    pub fn expected_header(message_length: u16, instruction_index: u8) -> Self {
        Secp256k1InstructionHeader {
            num_signatures:                1,
            signature_offset:              Secp256k1InstructionHeader::LEN,
            signature_instruction_index:   instruction_index,
            eth_address_offset:            Secp256k1InstructionHeader::LEN
                + Secp256k1Signature::LEN as u16
                + 1,
            eth_address_instruction_index: instruction_index,
            message_data_offset:           Secp256k1InstructionHeader::LEN
                + Secp256k1Signature::LEN as u16
                + 1
                + EvmPubkey::LEN as u16,
            message_data_size:             message_length,
            message_instruction_index:     instruction_index,
        }
    }
}

impl Secp256k1InstructionData {
    pub fn extract_message_and_check_signature(
        instruction: &Instruction,
        pubkey: &EvmPubkey,
        verification_instruction_index: &u8,
    ) -> Result<Vec<u8>> {
        if instruction.program_id != SECP256K1_ID {
            return Err(ErrorCode::SignatureVerificationWrongProgram.into());
        }

        if !instruction.accounts.is_empty() {
            return Err(ErrorCode::SignatureVerificationWrongAccounts.into());
        }

        let result = Self::try_from_slice(&instruction.data)?;
        if (result.header.message_instruction_index != *verification_instruction_index)
            || (result.header
                != Secp256k1InstructionHeader::expected_header(
                    result.header.message_data_size,
                    result.header.message_instruction_index,
                ))
        {
            return Err(ErrorCode::SignatureVerificationWrongHeader.into());
        }

        if result.eth_address != *pubkey {
            return Err(ErrorCode::SignatureVerificationWrongSigner.into());
        }

        Ok(result.message)
    }
}
impl AnchorDeserialize for Secp256k1InstructionData {
    fn deserialize(
        buf: &mut &[u8],
    ) -> std::result::Result<Secp256k1InstructionData, std::io::Error> {
        let header = Secp256k1InstructionHeader::deserialize(buf)?;
        let signature = Secp256k1Signature::deserialize(buf)?;
        let recovery_id = u8::deserialize(buf)?;
        let eth_address = EvmPubkey::deserialize(buf)?;

        let mut message: Vec<u8> = vec![];

        if buf.len() < header.message_data_size as usize {
            return Err(std::io::Error::from(std::io::ErrorKind::UnexpectedEof));
        }

        message.extend_from_slice(&buf[..header.message_data_size as usize]);
        *buf = &buf[header.message_data_size as usize..];
        Ok(Secp256k1InstructionData {
            header,
            eth_address,
            signature,
            recovery_id,
            message,
        })
    }
}


impl AnchorSerialize for Secp256k1InstructionData {
    fn serialize<W: std::io::Write>(
        &self,
        writer: &mut W,
    ) -> std::result::Result<(), std::io::Error> {
        self.header.serialize(writer)?;
        self.signature.serialize(writer)?;
        self.recovery_id.serialize(writer)?;
        self.eth_address.serialize(writer)?;

        writer.write_all(&self.message)?;
        Ok(())
    }
}

/** Cosmos uses a different signing algorith than Evm for signing
 * messages. Instead of using Keccak256, Cosmos uses SHA256. This prevents
 * us from using the Secp256k1 instruction struct for Cosmos.
 */
pub fn secp256k1_sha256_verify_signer(
    signature: &Secp256k1Signature,
    recovery_id: &u8,
    pubkey: &UncompressedSecp256k1Pubkey,
    message: &Vec<u8>,
) -> Result<()> {
    let recovered_key = secp256k1_recover(
        &hash::hashv(&[message]).to_bytes(),
        *recovery_id,
        &signature.0,
    )
    .map_err(|_| ErrorCode::SignatureVerificationWrongSigner)?;
    if !(recovered_key.0 == pubkey.0[1..] && pubkey.0[0] == SECP256K1_FULL_PREFIX) {
        return Err(ErrorCode::SignatureVerificationWrongSigner.into());
    }
    Ok(())
}

impl UncompressedSecp256k1Pubkey {
    /** Cosmos public addresses are different than the public key.
     * This one way algorithm converts the public key to the public address.
     * Note that the claimant needs to submit the public key to the program
     * to verify the signature.
     */
    pub fn into_bech32(self, chain_id: &str) -> CosmosBech32Address {
        let mut compressed: [u8; SECP256K1_COMPRESSED_PUBKEY_LENGTH] =
            [0; SECP256K1_COMPRESSED_PUBKEY_LENGTH];
        compressed[1..].copy_from_slice(&self.0[1..SECP256K1_COMPRESSED_PUBKEY_LENGTH]);
        compressed[0] = if self.0[Self::LEN - 1] % 2 == 0 {
            SECP256K1_EVEN_PREFIX
        } else {
            SECP256K1_ODD_PREFIX
        };
        let hash1 = hash::hashv(&[&compressed]);
        let mut hasher: ripemd::Ripemd160 = ripemd::Ripemd160::new();
        hasher.update(hash1);
        let hash2 = hasher.finalize();
        CosmosBech32Address(
            bech32::encode(chain_id, hash2.to_base32(), bech32::Variant::Bech32).unwrap(),
        )
    }
}

/**
 * A Secp256k1 pubkey used in Cosmos.
 */
#[derive(AnchorDeserialize, AnchorSerialize, Clone, Copy, PartialEq)]
pub struct UncompressedSecp256k1Pubkey([u8; Self::LEN]);
impl UncompressedSecp256k1Pubkey {
    pub const LEN: usize = 65;
}


#[cfg(test)]
impl From<[u8; Self::LEN]> for UncompressedSecp256k1Pubkey {
    fn from(bytes: [u8; Self::LEN]) -> Self {
        UncompressedSecp256k1Pubkey(bytes)
    }
}


#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct CosmosBech32Address(String);

#[cfg(test)]
impl From<&str> for CosmosBech32Address {
    fn from(bytes: &str) -> Self {
        CosmosBech32Address(bytes.to_string())
    }
}


#[cfg(test)]
use anchor_lang::prelude::ProgramError::BorshIoError;
#[test]
pub fn test_signature_verification() {
    let secp256k1_ix = Secp256k1InstructionData {
        header:      Secp256k1InstructionHeader::expected_header(5, 0),
        signature:   Secp256k1Signature([0; Secp256k1Signature::LEN]),
        recovery_id: 0,
        eth_address: EvmPubkey([0; EvmPubkey::LEN]),
        message:     b"hello".to_vec(),
    };

    assert_eq!(
        Secp256k1InstructionData::extract_message_and_check_signature(
            &Instruction {
                program_id: SECP256K1_ID,
                accounts:   vec![],
                data:       secp256k1_ix.try_to_vec().unwrap(),
            },
            &EvmPubkey([0; EvmPubkey::LEN]),
            &0,
        )
        .unwrap(),
        b"hello".to_vec()
    );

    assert_eq!(
        Secp256k1InstructionData::extract_message_and_check_signature(
            &Instruction {
                program_id: Pubkey::new_unique(),
                accounts:   vec![],
                data:       secp256k1_ix.try_to_vec().unwrap(),
            },
            &EvmPubkey([0; EvmPubkey::LEN]),
            &0,
        )
        .unwrap_err(),
        ErrorCode::SignatureVerificationWrongProgram.into()
    );

    assert_eq!(
        Secp256k1InstructionData::extract_message_and_check_signature(
            &Instruction {
                program_id: SECP256K1_ID,
                accounts:   vec![AccountMeta {
                    pubkey:      Pubkey::new_unique(),
                    is_signer:   true,
                    is_writable: false,
                }],
                data:       secp256k1_ix.try_to_vec().unwrap(),
            },
            &EvmPubkey([0; EvmPubkey::LEN]),
            &0,
        )
        .unwrap_err(),
        ErrorCode::SignatureVerificationWrongAccounts.into()
    );

    assert_eq!(
        Secp256k1InstructionData::extract_message_and_check_signature(
            &Instruction {
                program_id: SECP256K1_ID,
                accounts:   vec![],
                data:       secp256k1_ix.try_to_vec().unwrap(),
            },
            &EvmPubkey([0; EvmPubkey::LEN]),
            &1, // wrong instruction index
        )
        .unwrap_err(),
        ErrorCode::SignatureVerificationWrongHeader.into()
    );

    assert_eq!(
        Secp256k1InstructionData::extract_message_and_check_signature(
            &Instruction {
                program_id: SECP256K1_ID,
                accounts:   vec![],
                data:       secp256k1_ix.try_to_vec().unwrap(),
            },
            &EvmPubkey([1; EvmPubkey::LEN]),
            &0,
        )
        .unwrap_err(),
        ErrorCode::SignatureVerificationWrongSigner.into()
    );


    let secp256k1_ix_message_too_long = Secp256k1InstructionData {
        header:      Secp256k1InstructionHeader::expected_header(2, 0),
        signature:   Secp256k1Signature([0; Secp256k1Signature::LEN]),
        recovery_id: 0,
        eth_address: EvmPubkey([0; EvmPubkey::LEN]),
        message:     b"hello".to_vec(),
    };

    assert_eq!(
        Secp256k1InstructionData::extract_message_and_check_signature(
            &Instruction {
                program_id: SECP256K1_ID,
                accounts:   vec![],
                data:       secp256k1_ix_message_too_long.try_to_vec().unwrap(),
            },
            &EvmPubkey([0; EvmPubkey::LEN]),
            &0,
        )
        .unwrap_err(),
        BorshIoError("Not all bytes read".to_string()).into()
    );

    let secp256k1_ix_message_too_short = Secp256k1InstructionData {
        header:      Secp256k1InstructionHeader::expected_header(10, 0),
        signature:   Secp256k1Signature([0; Secp256k1Signature::LEN]),
        recovery_id: 0,
        eth_address: EvmPubkey([0; EvmPubkey::LEN]),
        message:     b"hello".to_vec(),
    };

    assert_eq!(
        Secp256k1InstructionData::extract_message_and_check_signature(
            &Instruction {
                program_id: SECP256K1_ID,
                accounts:   vec![],
                data:       secp256k1_ix_message_too_short.try_to_vec().unwrap(),
            },
            &EvmPubkey([0; EvmPubkey::LEN]),
            &0,
        )
        .unwrap_err(),
        BorshIoError("unexpected end of file".to_string()).into()
    );
}
