use {
    super::test_happy_path::TestClaimCertificate,
    crate::{
        accounts,
        get_config_pda,
        get_receipt_pda,
        instruction,
        ClaimInfo,
        Config,
        ErrorCode,
        SolanaHasher,
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
            system_instruction::create_account,
        },
        system_program,
        AnchorSerialize,
        Id,
        InstructionData,
        ToAccountMetas,
    },
    anchor_spl::{
        associated_token::get_associated_token_address_with_program_id,
        token::{
            spl_token::instruction::initialize_mint,
            Mint,
            Token,
        },
    },
    pythnet_sdk::accumulators::merkle::MerkleTree,
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
    pub mint_keypair:    Keypair,
}

impl DispenserSimulator {
    pub async fn new() -> Self {
        let program_test = ProgramTest::new("token_dispenser", crate::id(), None);
        let (banks_client, genesis_keypair, recent_blockhash) = program_test.start().await;
        let mint_keypair = Keypair::new();
        let mut simulator = DispenserSimulator {
            banks_client,
            genesis_keypair,
            recent_blockhash,
            mint_keypair,
        };
        simulator.setup().await.unwrap();
        simulator
    }

    pub async fn setup(&mut self) -> Result<(), BanksClientError> {
        let token_mint_address = self.mint_keypair.pubkey();
        let space = Mint::LEN;
        let rent = &self.banks_client.get_rent().await.unwrap();
        let mint_authority = &self.genesis_keypair;
        let decimals = 6;
        let init_mint_ixs = &[
            create_account(
                &self.genesis_keypair.pubkey(),
                &self.mint_keypair.pubkey(),
                rent.minimum_balance(space),
                space as u64,
                &Token::id(),
            ),
            initialize_mint(
                &Token::id(),
                &token_mint_address,
                &mint_authority.pubkey(),
                Some(&mint_authority.pubkey()),
                decimals,
            )
            .unwrap(),
        ];
        let mint_keypair = &Self::copy_keypair(&self.mint_keypair);
        self.process_ix(init_mint_ixs, &vec![mint_keypair]).await
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
        let treasury = get_associated_token_address_with_program_id(
            &(get_config_pda().0),
            &self.mint_keypair.pubkey(),
            &Token::id(),
        );
        let accounts = accounts::Initialize::populate(
            self.genesis_keypair.pubkey(),
            self.mint_keypair.pubkey(),
            treasury,
        )
        .to_account_metas(None);
        let instruction_data = instruction::Initialize { target_config };
        let instruction =
            Instruction::new_with_bytes(crate::id(), &instruction_data.data(), accounts);
        self.process_ix(&[instruction], &vec![]).await
    }

    pub async fn claim(
        &mut self,
        dispenser_guard: &Keypair,
        off_chain_claim_certificate: &TestClaimCertificate,
        merkle_tree: &MerkleTree<SolanaHasher>,
    ) -> Result<(), BanksClientError> {
        let (claim_certificate, option_instruction) =
            off_chain_claim_certificate.into_claim_certificate(merkle_tree, 1);
        let mut accounts =
            accounts::Claim::populate(self.genesis_keypair.pubkey(), dispenser_guard.pubkey())
                .to_account_metas(None);

        accounts.push(AccountMeta::new(
            get_receipt_pda(
                &<TestClaimCertificate as Into<ClaimInfo>>::into(
                    off_chain_claim_certificate.clone(),
                )
                .try_to_vec()
                .unwrap(),
            )
            .0,
            false,
        ));

        accounts.push(AccountMeta::new_readonly(
            system_program::System::id(),
            false,
        ));
        accounts.push(AccountMeta::new(self.genesis_keypair.pubkey(), true));

        let instruction_data: instruction::Claim = instruction::Claim {
            claim_certificates: vec![claim_certificate],
        };

        let mut instructions = vec![];

        instructions.push(Instruction::new_with_bytes(
            crate::id(),
            &instruction_data.data(),
            accounts,
        ));

        if let Some(verification_instruction) = option_instruction {
            instructions.push(verification_instruction);
        }

        self.process_ix(&instructions, &vec![dispenser_guard]).await
    }

    pub async fn get_account(&mut self, key: Pubkey) -> Option<Account> {
        self.banks_client.get_account(key).await.unwrap()
    }

    fn copy_keypair(keypair: &Keypair) -> Keypair {
        Keypair::from_bytes(&keypair.to_bytes()).unwrap()
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
            0,
            InstructionError::try_from(u64::from(ProgramError::from(
                anchor_lang::prelude::Error::from(self),
            )))
            .unwrap(),
        )
    }
}
impl IntoTransactionError for InstructionError {
    fn into_transation_error(self) -> TransactionError {
        TransactionError::InstructionError(0, self)
    }
}
