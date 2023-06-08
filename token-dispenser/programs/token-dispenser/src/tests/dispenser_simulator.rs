use anchor_lang::prelude::{Pubkey, AccountMeta};
use anchor_lang::solana_program::hash;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::{
    InstructionData,
    ToAccountMetas, system_program, AnchorSerialize,
};
use anchor_lang::Id;
use solana_program_test::{
    BanksClient,
    BanksClientError,
    ProgramTest,
    ProgramTestBanksClientExt,
};
use solana_sdk::account::Account;
use solana_sdk::compute_budget::ComputeBudgetInstruction;
use solana_sdk::signature::Keypair;
use solana_sdk::signer::Signer;
use solana_sdk::transaction::Transaction;

use crate::{
    accounts,
    instruction,
    Config, ClaimCertificate, get_receipt_pda, get_claim,
};

pub struct DispenserSimulator {
    banks_client:     BanksClient,
    genesis_keypair:  Keypair,
    recent_blockhash: hash::Hash,
}

impl DispenserSimulator {
    pub async fn new() -> Self {
        let program_test = ProgramTest::new("token_dispenser", crate::id(), None);
        let (banks_client, genesis_keypair, recent_blockhash) = program_test.start().await;
        DispenserSimulator {
            banks_client,
            genesis_keypair,
            recent_blockhash,
        }
    }

    async fn process_ix(
        &mut self,
        instructions: &[Instruction],
        signers: &Vec<&Keypair>,
    ) -> Result<(), BanksClientError> {
        let mut transaction =
            Transaction::new_with_payer(instructions, Some(&self.genesis_keypair.pubkey()));

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

    pub async fn initialize(&mut self, target_config: Config) -> Result<(), BanksClientError> {
        let accounts =
            accounts::Initialize::populate(self.genesis_keypair.pubkey()).to_account_metas(None);
        let instruction_data = instruction::Initialize { target_config };
        let instruction =
            Instruction::new_with_bytes(crate::id(), &instruction_data.data(), accounts);

        self.process_ix(&[instruction], &vec![]).await
    }

    pub async fn claim(&mut self, dispenser_guard : &Keypair, claim_certificates: Vec<ClaimCertificate>) -> Result<(), BanksClientError>  {
        let compute_budget_instruction :Instruction = ComputeBudgetInstruction::set_compute_unit_limit(2000000);
        let mut accounts =
            accounts::Claim::populate(self.genesis_keypair.pubkey(), dispenser_guard.pubkey()).to_account_metas(None);
        accounts.push(
            AccountMeta::new_readonly(system_program::System::id(), false)
        );
        accounts.push(
            AccountMeta::new(self.genesis_keypair.pubkey(), true)
        );

        for claim_certificate in &claim_certificates {
            accounts.push(
                AccountMeta::new(get_receipt_pda(&get_claim(claim_certificate).try_to_vec().unwrap()).0, false)
            );
        }
        
        let instruction_data: instruction::Claim = instruction::Claim { claim_certificates };
        let instruction =
            Instruction::new_with_bytes(crate::id(), &instruction_data.data(), accounts);

        self.process_ix(&[compute_budget_instruction, instruction], &vec![dispenser_guard]).await
    }


    pub async fn get_account(&mut self, key: Pubkey) -> Option<Account> {
        self.banks_client.get_account(key).await.unwrap()
    }
}
