use {
    super::{
        check_message_matches,
        get_expected_message,
    },
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
};

pub const EVM_PUBKEY_SIZE: usize = 20;
pub const EVM_SIGNATURE_SIZE: usize = 64;

#[derive(AnchorDeserialize, AnchorSerialize, Clone, Copy, PartialEq)]
pub struct EvmPubkey(pub [u8; EVM_PUBKEY_SIZE]);

#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct EvmSignature(pub [u8; EVM_SIGNATURE_SIZE]);


pub const EVM_MESSAGE_PREFIX: &str = "\x19Ethereum Signed Message:\n";

/**
 * An EIP-191 prefixed message.
 * When a browser wallet signs a message, it prepends the message with a prefix and the length of a message.
 * This struct represents the prefixed message and helps with creating and verifying it.
 */
#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct EvmPrefixedMessage(pub Vec<u8>);

impl EvmPrefixedMessage {
    pub fn check_is_authorization_message(&self, claimant: &Pubkey) -> Result<()> {
        let evm_message_length = get_expected_message(claimant).len().to_string();

        if self.0.starts_with(EVM_MESSAGE_PREFIX.as_bytes())
            && self.0[EVM_MESSAGE_PREFIX.len()..].starts_with(evm_message_length.as_bytes())
        {
            return check_message_matches(
                &self.0.as_slice()[(EVM_MESSAGE_PREFIX.len() + evm_message_length.len())..],
                claimant,
            );
        } else {
            return Err(ErrorCode::SignatureVerificationWrongMessagePrefix.into());
        }
    }

    pub fn get_expected_header(&self) -> Secp256k1InstructionHeader {
        Secp256k1InstructionHeader {
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
            message_data_size:             self.0.len() as u16,
            message_instruction_index:     0,
        }
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
    pub header:           Secp256k1InstructionHeader,
    pub signature:        EvmSignature,
    pub recovery_id:      u8,
    pub eth_address:      EvmPubkey,
    pub prefixed_message: EvmPrefixedMessage,
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
        Ok(Secp256k1InstructionData {
            header,
            eth_address,
            signature,
            recovery_id,
            prefixed_message: EvmPrefixedMessage(message),
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

        writer.write_all(&self.prefixed_message.0)?;
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

    if !ix.accounts.is_empty() {
        return Err(ErrorCode::SignatureVerificationWrongAccounts.into());
    }

    let data = Secp256k1InstructionData::try_from_slice(ix.data.as_slice())?;

    if data.header != data.prefixed_message.get_expected_header() {
        return Err(ErrorCode::SignatureVerificationWrongHeader.into());
    }

    if data.eth_address != *pubkey {
        return Err(ErrorCode::SignatureVerificationWrongSigner.into());
    }

    data.prefixed_message
        .check_is_authorization_message(claimant)?;

    Ok(())
}
