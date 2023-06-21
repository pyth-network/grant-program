use {
    pythnet_sdk::hashers::{
        keccak256::Keccak256,
        Hasher,
    },
    solana_sdk::{
        instruction::Instruction,
        secp256k1_instruction::{
            SecpSignatureOffsets,
            DATA_START,
            SIGNATURE_SERIALIZED_SIZE,
        },
    },
};

pub fn verify_secp256k1_signature(
    eth_pubkey: [u8; 20],
    signature_arr: [u8; 64],
    message_arr: &[u8],
    recovery_id: u8,
) -> Instruction {
    assert_eq!(signature_arr.len(), SIGNATURE_SERIALIZED_SIZE);

    let mut instruction_data = vec![];
    instruction_data.resize(
        DATA_START
            .saturating_add(eth_pubkey.len())
            .saturating_add(signature_arr.len())
            .saturating_add(message_arr.len())
            .saturating_add(1),
        0,
    );
    let eth_address_offset = DATA_START;
    instruction_data[eth_address_offset..eth_address_offset.saturating_add(eth_pubkey.len())]
        .copy_from_slice(&eth_pubkey);

    let signature_offset = DATA_START.saturating_add(eth_pubkey.len());
    instruction_data[signature_offset..signature_offset.saturating_add(signature_arr.len())]
        .copy_from_slice(&signature_arr);

    instruction_data[signature_offset.saturating_add(signature_arr.len())] = recovery_id;

    let message_data_offset = signature_offset
        .saturating_add(signature_arr.len())
        .saturating_add(1);
    instruction_data[message_data_offset..].copy_from_slice(message_arr);

    let num_signatures = 1;
    instruction_data[0] = num_signatures;
    let offsets = SecpSignatureOffsets {
        signature_offset:              signature_offset as u16,
        signature_instruction_index:   0,
        eth_address_offset:            eth_address_offset as u16,
        eth_address_instruction_index: 0,
        message_data_offset:           message_data_offset as u16,
        message_data_size:             message_arr.len() as u16,
        message_instruction_index:     0,
    };
    let writer = std::io::Cursor::new(&mut instruction_data[1..DATA_START]);
    bincode::serialize_into(writer, &offsets).unwrap();

    Instruction {
        program_id: solana_sdk::secp256k1_program::id(),
        accounts:   vec![],
        data:       instruction_data,
    }
}
