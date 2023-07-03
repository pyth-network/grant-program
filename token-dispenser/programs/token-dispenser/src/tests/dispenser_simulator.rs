use {
    super::test_evm::Secp256k1SignedMessage,
    crate::{
        accounts,
        ecosystems::Secp256k1WrappedMessage,
        get_receipt_pda,
        instruction,
        ClaimCertificate,
        Config,
        ErrorCode,
    },
    anchor_lang::{
        prelude::{
            AccountMeta,
            ProgramError,
            Pubkey,
        },
        solana_program::{
            hash,
            instruction::Instruction,
        },
        system_program,
        AnchorSerialize,
        Id,
        InstructionData,
        ToAccountMetas,
    },
    solana_program_test::{
        BanksClient,
        BanksClientError,
        ProgramTest,
        ProgramTestBanksClientExt,
    },
    solana_sdk::{
        account::Account,
        instruction::InstructionError,
        signature::Keypair,
        signer::Signer,
        transaction::{
            Transaction,
            TransactionError,
        },
    },
};

pub struct DispenserSimulator {
    banks_client:        BanksClient,
    pub genesis_keypair: Keypair,
    recent_blockhash:    hash::Hash,
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

    pub async fn process_ix(
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

    pub async fn claim<T: Secp256k1WrappedMessage>(
        &mut self,
        dispenser_guard: &Keypair,
        claim_certificate: &ClaimCertificate,
        signed_message: &Secp256k1SignedMessage<T>,
    ) -> Result<(), BanksClientError> {
        let mut accounts =
            accounts::Claim::populate(self.genesis_keypair.pubkey(), dispenser_guard.pubkey())
                .to_account_metas(None);


        accounts.push(AccountMeta::new(
            get_receipt_pda(&claim_certificate.claim_info.try_to_vec().unwrap()).0,
            false,
        ));


        accounts.push(AccountMeta::new_readonly(
            system_program::System::id(),
            false,
        ));
        accounts.push(AccountMeta::new(self.genesis_keypair.pubkey(), true));


        let instruction_data: instruction::Claim = instruction::Claim {
            claim_certificates: vec![claim_certificate.clone()],
        };
        let instruction =
            Instruction::new_with_bytes(crate::id(), &instruction_data.data(), accounts);

        self.process_ix(
            &[signed_message.into_instruction(0, true), instruction],
            &vec![dispenser_guard],
        )
        .await
    }


    pub async fn get_account(&mut self, key: Pubkey) -> Option<Account> {
        self.banks_client.get_account(key).await.unwrap()
    }
}


////////////////////////////////////////////////////////////////////////////////
// Error conversions.
////////////////////////////////////////////////////////////////////////////////


pub trait IntoTransactionError {
    fn into_transation_error(self) -> TransactionError;
}

impl IntoTransactionError for ErrorCode {
    fn into_transation_error(self) -> TransactionError {
        TransactionError::InstructionError(
            1, // 1 since instruction 0 is the compute budget
            InstructionError::try_from(u64::from(ProgramError::from(
                anchor_lang::prelude::Error::from(self),
            )))
            .unwrap(),
        )
    }
}
impl IntoTransactionError for InstructionError {
    fn into_transation_error(self) -> TransactionError {
        TransactionError::InstructionError(1, self) // 1 since instruction 0 is the compute budget
    }
}
