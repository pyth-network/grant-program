use anchor_lang::{
    prelude::*,
    AnchorDeserialize,
    AnchorSerialize,
};

#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct Ed25519Signature(pub [u8; Ed25519Signature::LEN]);
impl Ed25519Signature {
    pub const LEN: usize = 64;
}

#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct Ed25519Pubkey(pub [u8; Ed25519Pubkey::LEN]);
impl Ed25519Pubkey {
    pub const LEN: usize = 32;
}

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
            signature_offset:             Ed25519InstructionHeader::LEN,
            signature_instruction_index:  instruction_index as u16,
            public_key_offset:            Ed25519InstructionHeader::LEN
                + Ed25519Signature::LEN as u16,
            public_key_instruction_index: instruction_index as u16,
            message_data_offset:          Ed25519InstructionHeader::LEN
                + Ed25519Signature::LEN as u16
                + Ed25519Pubkey::LEN as u16,
            message_data_size:            message_length,
            message_instruction_index:    instruction_index as u16,
        }
    }
}

impl AnchorDeserialize for Ed25519InstructionData {
    fn deserialize(buf: &mut &[u8]) -> std::result::Result<Ed25519InstructionData, std::io::Error> {
        let header = Ed25519InstructionHeader::deserialize(buf)?;
        let signature = Ed25519Signature::deserialize(buf)?;
        let pubkey = Ed25519Pubkey::deserialize(buf)?;

        let mut message: Vec<u8> = vec![];
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
        self.signature.serialize(writer)?;
        self.pubkey.serialize(writer)?;

        writer.write_all(&self.message)?;
        Ok(())
    }
}
