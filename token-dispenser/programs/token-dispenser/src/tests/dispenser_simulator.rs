use anchor_lang::{solana_program::{hash, instruction::Instruction}, prelude::Pubkey, ToAccountMetas, InstructionData};
use solana_program_test::{ProgramTest, BanksClientError, BanksClient, ProgramTestBanksClientExt};
use solana_sdk::{signature::Keypair, transaction::Transaction, signer::Signer};

use crate::{accounts, instruction, Config};

pub struct DispenserSimulator {
    banks_client: BanksClient,
    genesis_keypair: Keypair,
    recent_blockhash:  hash::Hash,
}

impl DispenserSimulator {
    pub async fn new() -> Self {
        let program_test = ProgramTest::new("token_dispenser", crate::id(), None);
        let (banks_client, genesis_keypair, recent_blockhash) = program_test.start().await;
        DispenserSimulator { banks_client, genesis_keypair, recent_blockhash }
    }

    async fn process_ix(
        &mut self,
        instruction: Instruction,
        signers: &Vec<&Keypair>,
    ) -> Result<(), BanksClientError> {
        let mut transaction =
            Transaction::new_with_payer(&[instruction], Some(&self.genesis_keypair.pubkey()));

        let blockhash = self
            .banks_client
            .get_new_latest_blockhash(&self.recent_blockhash)
            .await
            .unwrap();
        self.recent_blockhash = blockhash;

        transaction.partial_sign(&[&self.genesis_keypair], self.recent_blockhash);
        transaction.partial_sign(signers, self.recent_blockhash);
        self.banks_client.process_transaction(transaction).await
    }

    pub async fn initialize(&mut self, target_config: Config){
        let accounts = accounts::Initialize::populate(self.genesis_keypair.pubkey()).to_account_metas(None);
        let instruction_data = instruction::Initialize { target_config};
        let instruction = Instruction::new_with_bytes(crate::id(), &instruction_data.data(), accounts);

        self.process_ix(instruction, &vec![]).await.unwrap();
    }   

}