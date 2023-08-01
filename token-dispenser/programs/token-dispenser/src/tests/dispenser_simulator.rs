use {
    super::test_happy_path::TestClaimCertificate,
    crate::{
        accounts,
        get_cart_pda,
        get_config_pda,
        get_receipt_pda,
        get_treasury_ata,
        instruction,
        tests::merkleize,
        ClaimInfo,
        ErrorCode,
        SolanaHasher,
    },
    anchor_lang::{
        prelude::{
            AccountMeta,
            ProgramError,
            Pubkey,
            Rent,
        },
        solana_program::{
            hash,
            instruction::Instruction,
            system_instruction::create_account,
        },
        system_program,
        AccountDeserialize,
        AnchorSerialize,
        Id,
        InstructionData,
        ToAccountMetas,
    },
    anchor_spl::{
        associated_token::{
            get_associated_token_address,
            get_associated_token_address_with_program_id,
            AssociatedToken,
        },
        token::{
            spl_token::instruction::{
                initialize_account3,
                initialize_mint,
                mint_to,
            },
            Mint,
            Token,
            TokenAccount,
        },
    },
    pythnet_sdk::accumulators::merkle::{
        MerkleRoot,
        MerkleTree,
    },
    solana_program_test::{
        BanksClient,
        BanksClientError,
        ProgramTest,
        ProgramTestBanksClientExt,
    },
    solana_sdk::{
        account::{
            Account,
            ReadableAccount,
        },
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
        simulator
            .create_mint(
                &copy_keypair(&simulator.mint_keypair),
                &copy_keypair(&simulator.genesis_keypair),
                6,
            )
            .await
            .unwrap();
        simulator
    }

    pub fn generate_test_claim_certs(claimant: Pubkey) -> Vec<TestClaimCertificate> {
        vec![
            TestClaimCertificate::random_evm(&claimant),
            TestClaimCertificate::random_cosmos(&claimant),
            TestClaimCertificate::random_discord(),
        ]
    }


    pub async fn get_rent(&mut self) -> Rent {
        self.banks_client.get_rent().await.unwrap()
    }

    pub async fn create_mint(
        &mut self,
        mint_keypair: &Keypair,
        mint_authority: &Keypair,
        decimals: u8,
    ) -> Result<(), BanksClientError> {
        let space = Mint::LEN;
        let rent = &self.get_rent().await;
        let init_mint_ixs = &[
            create_account(
                &self.genesis_keypair.pubkey(),
                &mint_keypair.pubkey(),
                rent.minimum_balance(space),
                space as u64,
                &Token::id(),
            ),
            initialize_mint(
                &Token::id(),
                &mint_keypair.pubkey(),
                &mint_authority.pubkey(),
                None,
                decimals,
            )
            .unwrap(),
        ];
        self.process_ix(init_mint_ixs, &vec![mint_keypair, mint_authority])
            .await
    }

    pub async fn mint_to_treasury(&mut self, mint_amount: u64) -> Result<(), BanksClientError> {
        let config = get_config_pda().0;
        let treasury = get_treasury_ata(&config, &self.mint_keypair.pubkey());
        let mint_to_ix = &[mint_to(
            &Token::id(),
            &self.mint_keypair.pubkey(),
            &treasury,
            &self.genesis_keypair.pubkey(),
            &[],
            mint_amount,
        )
        .unwrap()];
        self.process_ix(mint_to_ix, &vec![&copy_keypair(&self.genesis_keypair)])
            .await
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

    pub async fn initialize(
        &mut self,
        merkle_root: MerkleRoot<SolanaHasher>,
        dispenser_guard: Pubkey,
        mint_pubkey_override: Option<Pubkey>,
        treasury_pubkey_override: Option<Pubkey>,
    ) -> Result<(), BanksClientError> {
        let treasury = get_associated_token_address_with_program_id(
            &(get_config_pda().0),
            &self.mint_keypair.pubkey(),
            &Token::id(),
        );
        let accounts = accounts::Initialize::populate(
            self.genesis_keypair.pubkey(),
            mint_pubkey_override.unwrap_or(self.mint_keypair.pubkey()),
            treasury_pubkey_override.unwrap_or(treasury),
        )
        .to_account_metas(None);
        let instruction_data = instruction::Initialize {
            merkle_root,
            dispenser_guard,
        };
        let instruction =
            Instruction::new_with_bytes(crate::id(), &instruction_data.data(), accounts);
        self.process_ix(&[instruction], &vec![]).await
    }


    pub async fn initialize_with_claimants(
        &mut self,
        claimants: Vec<Keypair>,
        dispenser_guard: &Keypair,
    ) -> Result<
        (
            MerkleTree<SolanaHasher>,
            Vec<(Keypair, Vec<TestClaimCertificate>)>,
        ),
        BanksClientError,
    > {
        let mock_offchain_certificates_and_claimants: Vec<(Keypair, Vec<TestClaimCertificate>)> =
            claimants
                .into_iter()
                .map(|c| {
                    let pubkey = c.pubkey();
                    (c, DispenserSimulator::generate_test_claim_certs(pubkey))
                })
                .collect::<Vec<_>>();
        let merkle_items: Vec<ClaimInfo> = mock_offchain_certificates_and_claimants
            .iter()
            .flat_map(|(_, claim_certs)| {
                claim_certs
                    .iter()
                    .map(|item: &TestClaimCertificate| item.clone().into())
            })
            .collect();

        let merkle_tree = merkleize(merkle_items).0;
        self.initialize(
            merkle_tree.root.clone(),
            dispenser_guard.pubkey(),
            None,
            None,
        )
        .await?;
        Ok((merkle_tree, mock_offchain_certificates_and_claimants))
    }


    pub async fn claim(
        &mut self,
        claimant: &Keypair,
        dispenser_guard: &Keypair,
        off_chain_claim_certificate: &TestClaimCertificate,
        merkle_tree: &MerkleTree<SolanaHasher>,
    ) -> Result<(), BanksClientError> {
        let (claim_certificate, option_instruction) =
            off_chain_claim_certificate.into_claim_certificate(merkle_tree, 1);
        let mut accounts = accounts::Claim::populate(claimant.pubkey(), dispenser_guard.pubkey())
            .to_account_metas(None);

        accounts.push(AccountMeta::new(
            get_receipt_pda(
                &<TestClaimCertificate as Into<ClaimInfo>>::into(
                    off_chain_claim_certificate.clone(),
                )
                .try_to_vec()?,
            )
            .0,
            false,
        ));

        accounts.push(AccountMeta::new_readonly(
            system_program::System::id(),
            false,
        ));
        accounts.push(AccountMeta::new(claimant.pubkey(), true));

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

        self.process_ix(&instructions, &vec![dispenser_guard, claimant])
            .await
    }

    pub async fn checkout(
        &mut self,
        claimant: &Keypair,
        mint: Pubkey,
    ) -> Result<(), BanksClientError> {
        let accounts = accounts::Checkout::populate(claimant.pubkey(), mint).to_account_metas(None);

        let instruction_data = instruction::Checkout {};
        let mut instructions = vec![];

        instructions.push(Instruction::new_with_bytes(
            crate::id(),
            &instruction_data.data(),
            accounts,
        ));


        self.process_ix(&instructions, &vec![claimant]).await
    }

    /**
     *  Generate a `checkout` Instruction deriving all the correct accounts
     *  based on the provided `claimant` unless explicitly overridden by providing
     *  an `Option<Pubkey>` for the account.
     */
    pub fn checkout_ix(
        &mut self,
        claimant: Pubkey,
        cart: Option<Pubkey>,
        claimant_fund: Option<Pubkey>,
    ) -> Instruction {
        let config = get_config_pda().0;
        let cart = cart.unwrap_or(get_cart_pda(&claimant).0);
        let claimant_fund = claimant_fund.unwrap_or(get_associated_token_address(
            &claimant,
            &self.mint_keypair.pubkey(),
        ));
        let checkout = crate::accounts::Checkout {
            claimant,
            config,
            mint: self.mint_keypair.pubkey(),
            treasury: get_treasury_ata(&get_config_pda().0, &self.mint_keypair.pubkey()),
            cart,
            claimant_fund,
            system_program: system_program::System::id(),
            token_program: Token::id(),
            associated_token_program: AssociatedToken::id(),
        };
        let ix_data = instruction::Checkout {};
        let accounts = checkout.to_account_metas(None);
        Instruction::new_with_bytes(crate::id(), &ix_data.data(), accounts)
    }

    pub async fn get_account(&mut self, key: Pubkey) -> Option<Account> {
        self.banks_client.get_account(key).await.ok()?
    }

    pub async fn get_account_data<T: AccountDeserialize>(&mut self, cart_key: Pubkey) -> Option<T> {
        self.get_account(cart_key)
            .await
            .map(|a| <T>::try_deserialize(&mut a.data()).ok())
            .flatten()
    }

    pub async fn create_token_account(
        &mut self,
        mint: Pubkey,
        owner: &Keypair,
        token_account: &Keypair,
    ) -> Result<(), BanksClientError> {
        let init_token_account_ixs = &[
            create_account(
                &self.genesis_keypair.pubkey(),
                &token_account.pubkey(),
                self.get_rent().await.minimum_balance(TokenAccount::LEN),
                TokenAccount::LEN as u64,
                &Token::id(),
            ),
            initialize_account3(
                &Token::id(),
                &token_account.pubkey(),
                &mint,
                &owner.pubkey(),
            )
            .unwrap(),
        ];
        self.process_ix(init_token_account_ixs, &vec![&owner, &token_account])
            .await
    }
}

pub fn copy_keypair(keypair: &Keypair) -> Keypair {
    Keypair::from_bytes(&keypair.to_bytes()).unwrap()
}

////////////////////////////////////////////////////////////////////////////////
// Error conversions.
////////////////////////////////////////////////////////////////////////////////

pub trait IntoTransactionError {
    fn into_transaction_error(self) -> TransactionError;
}

impl IntoTransactionError for ErrorCode {
    fn into_transaction_error(self) -> TransactionError {
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
    fn into_transaction_error(self) -> TransactionError {
        TransactionError::InstructionError(0, self)
    }
}
