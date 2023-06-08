use anchor_lang::{system_program, prelude::Pubkey};
use solana_program_test::tokio;
use super::dispenser_simulator::DispenserSimulator;
use anchor_lang::Id;

#[tokio::test]
pub async fn test_initialize(){
    let mut simulator = DispenserSimulator::new().await;
    simulator.initialize(crate::Config { merkle_root: [0;32], dispenser_guard: Pubkey::new_unique() }).await;
}