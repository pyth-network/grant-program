use {
    super::cosmos::UncompressedSecp256k1Pubkey,
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
};


pub const SECP256K1_FULL_PREFIX: u8 = 0x04;
pub const SECP256K1_ODD_PREFIX: u8 = 0x03;
pub const SECP256K1_EVEN_PREFIX: u8 = 0x02;
pub const SECP256K1_COMPRESSED_PUBKEY_LENGTH: usize = 33;
pub const ETH_ADDRESS_LENGTH: u16 = 20;

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
    /// This follows the layout implemented by`Secp256k1Program.createInstructionWithEthAddress`
    /// from the [solana/web3.js library](https://github.com/solana-labs/solana-web3.js/blob/master/packages/library-legacy/src/programs/secp256k1.ts)
    pub fn expected_header(message_length: u16, instruction_index: u8) -> Self {
        Secp256k1InstructionHeader {
            num_signatures:                1,
            signature_offset:              Secp256k1InstructionHeader::LEN + ETH_ADDRESS_LENGTH,
            signature_instruction_index:   instruction_index,
            eth_address_offset:            Secp256k1InstructionHeader::LEN,
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
            return err!(ErrorCode::SignatureVerificationWrongProgram);
        }

        if !instruction.accounts.is_empty() {
            return err!(ErrorCode::SignatureVerificationWrongAccounts);
        }
        let result = Self::try_from_slice(&instruction.data)?;
        if result.header
            != Secp256k1InstructionHeader::expected_header(
                result.header.message_data_size,
                *verification_instruction_index,
            )
        {
            return err!(ErrorCode::SignatureVerificationWrongHeader);
        }

        if result.eth_address != *pubkey {
            return err!(ErrorCode::SignatureVerificationWrongSigner);
        }

        Ok(result.message)
    }
}
impl AnchorDeserialize for Secp256k1InstructionData {
    fn deserialize(
        buf: &mut &[u8],
    ) -> std::result::Result<Secp256k1InstructionData, std::io::Error> {
        let header = Secp256k1InstructionHeader::deserialize(
            &mut &buf[..Secp256k1InstructionHeader::LEN as usize],
        )?;

        let signature = Secp256k1Signature::deserialize(
            &mut &buf[header.signature_offset as usize..(header.signature_offset as usize) + 64],
        )?;

        let recovery_id = u8::deserialize(
            &mut &buf
                [header.signature_offset as usize + 64..(header.signature_offset as usize) + 65],
        )?;

        let eth_address = EvmPubkey::deserialize(
            &mut &buf
                [header.eth_address_offset as usize..(header.eth_address_offset as usize) + 32],
        )?;

        let mut message: Vec<u8> = vec![];
        if (&buf[header.message_data_offset as usize..]).len() < header.message_data_size as usize {
            return Err(std::io::Error::from(std::io::ErrorKind::UnexpectedEof));
        }
        message.extend_from_slice(
            &buf[header.message_data_offset as usize
                ..(header.message_data_offset + header.message_data_size) as usize],
        );

        *buf = &buf[(header.message_data_offset + header.message_data_size) as usize..];
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
    if !(recovered_key.0 == pubkey.as_bytes()[1..] && pubkey.as_bytes()[0] == SECP256K1_FULL_PREFIX)
    {
        return err!(ErrorCode::SignatureVerificationWrongSigner);
    }
    Ok(())
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
