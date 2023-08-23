use {
    crate::ErrorCode,
    anchor_lang::{
        prelude::*,
        solana_program::{
            ed25519_program::ID as ED25519_ID,
            instruction::Instruction,
        },
        AnchorDeserialize,
        AnchorSerialize,
    },
};


#[derive(AnchorDeserialize, AnchorSerialize, Clone, PartialEq, Debug)]
pub struct Ed25519Signature([u8; Ed25519Signature::LEN]);
impl Ed25519Signature {
    pub const LEN: usize = 64;
}

#[cfg(test)]
impl From<[u8; Self::LEN]> for Ed25519Signature {
    fn from(bytes: [u8; Self::LEN]) -> Self {
        Ed25519Signature(bytes)
    }
}

#[derive(AnchorDeserialize, AnchorSerialize, Clone, PartialEq, Debug)]
pub struct Ed25519Pubkey([u8; Ed25519Pubkey::LEN]);
impl Ed25519Pubkey {
    pub const LEN: usize = 32;
}

impl From<Pubkey> for Ed25519Pubkey {
    fn from(pubkey: Pubkey) -> Self {
        let mut bytes = [0u8; 32];
        bytes.copy_from_slice(pubkey.as_ref());
        Self(bytes)
    }
}

impl Ed25519Pubkey {
    pub fn to_bytes(&self) -> [u8; Self::LEN] {
        self.0
    }
}

#[cfg(test)]
impl From<[u8; Self::LEN]> for Ed25519Pubkey {
    fn from(bytes: [u8; Self::LEN]) -> Self {
        Ed25519Pubkey(bytes)
    }
}

#[derive(PartialEq, Debug)]
/** The layout of a Ed25519 signature verification instruction on Solana */
pub struct Ed25519InstructionData {
    pub header:    Ed25519InstructionHeader,
    pub signature: Ed25519Signature,
    pub pubkey:    Ed25519Pubkey,
    pub message:   Vec<u8>,
}


#[derive(AnchorDeserialize, AnchorSerialize, Clone, PartialEq, Eq, Debug)]
pub struct Ed25519InstructionHeader {
    num_signatures:               u8,
    padding:                      u8,
    signature_offset:             u16,
    signature_instruction_index:  u16,
    public_key_offset:            u16,
    public_key_instruction_index: u16,
    message_data_offset:          u16,
    message_data_size:            u16,
    message_instruction_index:    u16,
}

impl Ed25519InstructionHeader {
    pub const LEN: u16 = 2 + 2 + 2 + 2 + 2 + 2 + 2 + 2;
}


impl Ed25519InstructionHeader {
    pub fn expected_header(message_length: u16, instruction_index: u8) -> Self {
        Ed25519InstructionHeader {
            num_signatures:               1,
            padding:                      0,
            signature_offset:             Ed25519InstructionHeader::LEN + Ed25519Pubkey::LEN as u16,
            signature_instruction_index:  instruction_index as u16,
            public_key_offset:            Ed25519InstructionHeader::LEN,
            public_key_instruction_index: instruction_index as u16,
            message_data_offset:          Ed25519InstructionHeader::LEN
                + Ed25519Signature::LEN as u16
                + Ed25519Pubkey::LEN as u16,
            message_data_size:            message_length,
            message_instruction_index:    instruction_index as u16,
        }
    }
}

impl Ed25519InstructionData {
    pub fn extract_message_and_check_signature(
        instruction: &Instruction,
        pubkey: &Ed25519Pubkey,
        verification_instruction_index: &u8,
    ) -> Result<Vec<u8>> {
        if instruction.program_id != ED25519_ID {
            return err!(ErrorCode::SignatureVerificationWrongProgram);
        }

        if !instruction.accounts.is_empty() {
            return err!(ErrorCode::SignatureVerificationWrongAccounts);
        }

        let result = Self::try_from_slice(&instruction.data)?;
        if result.header
            != Ed25519InstructionHeader::expected_header(
                result.header.message_data_size,
                *verification_instruction_index,
            )
        {
            return err!(ErrorCode::SignatureVerificationWrongHeader);
        }

        if result.pubkey != *pubkey {
            return err!(ErrorCode::SignatureVerificationWrongSigner);
        }

        Ok(result.message)
    }
}

impl AnchorDeserialize for Ed25519InstructionData {
    fn deserialize(buf: &mut &[u8]) -> std::result::Result<Ed25519InstructionData, std::io::Error> {
        let header = Ed25519InstructionHeader::deserialize(buf)?;
        let pubkey = Ed25519Pubkey::deserialize(buf)?;
        let signature = Ed25519Signature::deserialize(buf)?;

        let mut message: Vec<u8> = vec![];
        if buf.len() < header.message_data_size as usize {
            return Err(std::io::Error::from(std::io::ErrorKind::UnexpectedEof));
        }

        message.extend_from_slice(&buf[..header.message_data_size as usize]);
        *buf = &buf[header.message_data_size as usize..];
        Ok(Ed25519InstructionData {
            header,
            pubkey,
            signature,
            message,
        })
    }
}

impl AnchorSerialize for Ed25519InstructionData {
    fn serialize<W: std::io::Write>(
        &self,
        writer: &mut W,
    ) -> std::result::Result<(), std::io::Error> {
        self.header.serialize(writer)?;
        self.pubkey.serialize(writer)?;
        self.signature.serialize(writer)?;

        writer.write_all(&self.message)?;
        Ok(())
    }
}

#[cfg(test)]
pub trait Ed25519TestMessage
where
    Self: Sized,
{
    fn for_claimant(claimant: &Pubkey) -> Self;
    fn get_message_with_metadata(&self) -> Vec<u8>;
    fn get_message_length(&self) -> usize {
        self.get_message_with_metadata().len()
    }
}

#[cfg(test)]
use anchor_lang::prelude::ProgramError::BorshIoError;


#[test]
pub fn test_signature_verification() {
    let ed25519_ix = Ed25519InstructionData {
        header:    Ed25519InstructionHeader::expected_header(5, 0),
        signature: Ed25519Signature([0; Ed25519Signature::LEN]),
        message:   b"hello".to_vec(),
        pubkey:    Ed25519Pubkey([0; Ed25519Pubkey::LEN]),
    };

    assert_eq!(
        Ed25519InstructionData::extract_message_and_check_signature(
            &Instruction {
                program_id: ED25519_ID,
                accounts:   vec![],
                data:       ed25519_ix.try_to_vec().unwrap(),
            },
            &Ed25519Pubkey([0; Ed25519Pubkey::LEN]),
            &0,
        )
        .unwrap(),
        b"hello".to_vec()
    );

    assert_eq!(
        Ed25519InstructionData::extract_message_and_check_signature(
            &Instruction {
                program_id: Pubkey::new_unique(),
                accounts:   vec![],
                data:       ed25519_ix.try_to_vec().unwrap(),
            },
            &Ed25519Pubkey([0; Ed25519Pubkey::LEN]),
            &0,
        )
        .unwrap_err(),
        ErrorCode::SignatureVerificationWrongProgram.into()
    );

    assert_eq!(
        Ed25519InstructionData::extract_message_and_check_signature(
            &Instruction {
                program_id: ED25519_ID,
                accounts:   vec![AccountMeta {
                    pubkey:      Pubkey::new_unique(),
                    is_signer:   true,
                    is_writable: false,
                }],
                data:       ed25519_ix.try_to_vec().unwrap(),
            },
            &Ed25519Pubkey([0; Ed25519Pubkey::LEN]),
            &0,
        )
        .unwrap_err(),
        ErrorCode::SignatureVerificationWrongAccounts.into()
    );

    assert_eq!(
        Ed25519InstructionData::extract_message_and_check_signature(
            &Instruction {
                program_id: ED25519_ID,
                accounts:   vec![],
                data:       ed25519_ix.try_to_vec().unwrap(),
            },
            &Ed25519Pubkey([0; Ed25519Pubkey::LEN]),
            &1, // wrong instruction index
        )
        .unwrap_err(),
        ErrorCode::SignatureVerificationWrongHeader.into()
    );

    assert_eq!(
        Ed25519InstructionData::extract_message_and_check_signature(
            &Instruction {
                program_id: ED25519_ID,
                accounts:   vec![],
                data:       ed25519_ix.try_to_vec().unwrap(),
            },
            &Ed25519Pubkey([1; Ed25519Pubkey::LEN]),
            &0,
        )
        .unwrap_err(),
        ErrorCode::SignatureVerificationWrongSigner.into()
    );


    let ed25519_ix_message_too_long = Ed25519InstructionData {
        header:    Ed25519InstructionHeader::expected_header(2, 0),
        signature: Ed25519Signature([0; Ed25519Signature::LEN]),
        pubkey:    Ed25519Pubkey([0; Ed25519Pubkey::LEN]),
        message:   b"hello".to_vec(),
    };

    assert_eq!(
        Ed25519InstructionData::extract_message_and_check_signature(
            &Instruction {
                program_id: ED25519_ID,
                accounts:   vec![],
                data:       ed25519_ix_message_too_long.try_to_vec().unwrap(),
            },
            &Ed25519Pubkey([0; Ed25519Pubkey::LEN]),
            &0,
        )
        .unwrap_err(),
        BorshIoError("Not all bytes read".to_string()).into()
    );

    let ed25519_ix_message_too_short = Ed25519InstructionData {
        header:    Ed25519InstructionHeader::expected_header(10, 0),
        signature: Ed25519Signature([0; Ed25519Signature::LEN]),
        pubkey:    Ed25519Pubkey([0; Ed25519Pubkey::LEN]),
        message:   b"hello".to_vec(),
    };

    assert_eq!(
        Ed25519InstructionData::extract_message_and_check_signature(
            &Instruction {
                program_id: ED25519_ID,
                accounts:   vec![],
                data:       ed25519_ix_message_too_short.try_to_vec().unwrap(),
            },
            &Ed25519Pubkey([0; Ed25519Pubkey::LEN]),
            &0,
        )
        .unwrap_err(),
        BorshIoError("unexpected end of file".to_string()).into()
    );
}

#[test]
pub fn test_serde() {
    let expected_ed25519_ix = Ed25519InstructionData {
        header:    Ed25519InstructionHeader::expected_header(5, 0),
        signature: Ed25519Signature([1; Ed25519Signature::LEN]),
        pubkey:    Ed25519Pubkey([2; Ed25519Pubkey::LEN]),
        message:   b"hello".to_vec(),
    };

    let ed25519_ix =
        Ed25519InstructionData::try_from_slice(&expected_ed25519_ix.try_to_vec().unwrap()).unwrap();

    assert_eq!(ed25519_ix, expected_ed25519_ix);
}
