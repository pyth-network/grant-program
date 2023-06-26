use {
    crate::ErrorCode,
    anchor_lang::{
        prelude::*,
        solana_program::{
            instruction::Instruction as SolanaInstruction,
            secp256k1_program::ID as SECP256K1_ID,
        },
        AnchorDeserialize,
        AnchorSerialize,
    },
    pythnet_sdk::hashers::{
        keccak256::Keccak256,
        Hasher,
    },
};

pub const EVM_MESSAGE_PREFIX: &str = "\x19Ethereum Signed Message:\n";
pub const EVM_PUBKEY_SIZE: usize = 20;

#[derive(AnchorDeserialize, AnchorSerialize, Clone, Copy, PartialEq)]
pub struct EvmPubkey(pub [u8; EVM_PUBKEY_SIZE]);

pub const EVM_SIGNATURE_SIZE: usize = 64;
#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct EvmSignature(pub [u8; EVM_SIGNATURE_SIZE]);

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
    pub fn expected(message_data_size: usize) -> Self {
        Self {
            num_signatures:                1,
            signature_offset:              Secp256k1InstructionHeader::LEN,
            signature_instruction_index:   0,
            eth_address_offset:            Secp256k1InstructionHeader::LEN
                + EVM_SIGNATURE_SIZE as u16
                + 1,
            eth_address_instruction_index: 0,
            message_data_offset:           Secp256k1InstructionHeader::LEN
                + EVM_SIGNATURE_SIZE as u16
                + 1
                + EVM_PUBKEY_SIZE as u16,
            message_data_size:             message_data_size as u16,
            message_instruction_index:     0,
        }
    }
}

impl Secp256k1InstructionHeader {
    pub const LEN: u16 = 1 + 2 + 1 + 2 + 1 + 2 + 2 + 1;
}

pub struct Secp256k1InstructionData {
    pub header:      Secp256k1InstructionHeader,
    pub signature:   EvmSignature,
    pub recovery_id: u8,
    pub eth_address: EvmPubkey,
    pub message:     Vec<u8>,
}

impl AnchorDeserialize for Secp256k1InstructionData {
    fn deserialize(
        buf: &mut &[u8],
    ) -> std::result::Result<Secp256k1InstructionData, std::io::Error> {
        let header = Secp256k1InstructionHeader::deserialize(buf)?;
        let signature = EvmSignature::deserialize(buf)?;
        let recovery_id = u8::deserialize(buf)?;
        let eth_address = EvmPubkey::deserialize(buf)?;

        let mut message: Vec<u8> = vec![];
        message.extend_from_slice(&buf[..header.message_data_size as usize]);
        *buf = &buf[header.message_data_size as usize..];
        return Ok(Secp256k1InstructionData {
            header,
            eth_address,
            signature,
            recovery_id,
            message,
        });
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

pub fn check_authorized(
    pubkey: &EvmPubkey,
    ix: SolanaInstruction,
    claimant: &Pubkey,
) -> Result<()> {
    // Check program address
    if ix.program_id != SECP256K1_ID {
        return Err(ErrorCode::SignatureVerificationWrongProgram.into());
    }

    if ix.accounts.len() != 0 {
        return Err(ErrorCode::SignatureVerificationWrongAccounts.into());
    }

    let data = Secp256k1InstructionData::try_from_slice(ix.data.as_slice())?;

    msg!("data.header: {:?}", data.header);
    msg!(
        "data.header expected: {:?}",
        Secp256k1InstructionHeader::expected(data.message.len())
    );
    if data.header != Secp256k1InstructionHeader::expected(data.message.len()) {
        return Err(ErrorCode::SignatureVerificationWrongHeader.into());
    }

    if data.eth_address != *pubkey {
        return Err(ErrorCode::SignatureVerificationWrongSigner.into());
    }

    Ok(())
}
