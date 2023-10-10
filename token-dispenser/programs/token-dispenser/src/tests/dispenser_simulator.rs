use {
    super::test_happy_path::TestClaimCertificate,
    crate::{
        accounts,
        get_config_pda,
        get_receipt_pda,
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
            program_option::COption,
            system_instruction::{
                self,
                create_account,
            },
            sysvar::instructions::ID as SYSVAR_IX_ID,
        },
        system_program,
        AccountDeserialize,
        AnchorSerialize,
        Id,
        InstructionData,
        ToAccountMetas,
    },
    anchor_spl::{
        associated_token::get_associated_token_address,
        token::{
            spl_token,
            spl_token::{
                error::TokenError,
                instruction::{
                    initialize_account3,
                    initialize_mint2,
                    mint_to,
                },
            },
            Mint,
            Token,
            TokenAccount,
        },
    },
    pythnet_sdk::accumulators::merkle::{
        MerklePath,
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
        slot_hashes::SlotHashes,
        transaction::{
            Transaction,
            TransactionError,
        },
    },
};

pub struct DispenserSimulator {
    banks_client:            BanksClient,
    pub genesis_keypair:     Keypair,
    recent_blockhash:        hash::Hash,
    pub mint_keypair:        Keypair,
    /// also the owner/authority of `pyth_treasury`
    pub pyth_mint_authority: Keypair,
    pub pyth_treasury:       Pubkey,
}

impl DispenserSimulator {
    pub async fn new() -> Self {
        let program_test = ProgramTest::new("token_dispenser", crate::id(), None);
        let (banks_client, genesis_keypair, recent_blockhash) = program_test.start().await;
        let mint_keypair = Keypair::new();
        let pyth_mint_authority = Keypair::new();
        let pyth_treasury = Keypair::new();
        let mut simulator = DispenserSimulator {
            banks_client,
            genesis_keypair,
            recent_blockhash,
            mint_keypair,
            pyth_mint_authority,
            pyth_treasury: pyth_treasury.pubkey(),
        };

        simulator
            .create_mint(
                &copy_keypair(&simulator.mint_keypair),
                &simulator.pyth_mint_authority.pubkey(),
                6,
            )
            .await
            .unwrap();

        simulator
            .create_token_account(
                simulator.mint_keypair.pubkey(),
                &copy_keypair(&simulator.pyth_mint_authority),
                &pyth_treasury,
            )
            .await
            .unwrap();

        simulator
    }

    pub fn generate_test_claim_certs(
        claimant: &Pubkey,
        dispenser_guard: &Keypair,
    ) -> Vec<TestClaimCertificate> {
        let keypair = ed25519_dalek::Keypair::from_bytes(&dispenser_guard.to_bytes()).unwrap();
        vec![
            TestClaimCertificate::random_evm(claimant),
            TestClaimCertificate::random_cosmos(claimant),
            TestClaimCertificate::random_discord(claimant, &keypair),
            TestClaimCertificate::random_aptos(claimant),
            TestClaimCertificate::random_sui(claimant),
            TestClaimCertificate::random_solana(claimant),
            TestClaimCertificate::random_injective(claimant),
        ]
    }


    pub async fn get_rent(&mut self) -> Rent {
        self.banks_client.get_rent().await.unwrap()
    }

    pub async fn airdrop(&mut self, target: Pubkey, amount: u64) -> Result<(), BanksClientError> {
        let airdrop_ix =
            system_instruction::transfer(&self.genesis_keypair.pubkey(), &target, amount);
        self.process_ix(&[airdrop_ix], &vec![]).await
    }

    pub async fn create_mint(
        &mut self,
        mint_keypair: &Keypair,
        mint_authority: &Pubkey,
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
            initialize_mint2(
                &Token::id(),
                &mint_keypair.pubkey(),
                mint_authority,
                None,
                decimals,
            )
            .unwrap(),
        ];
        self.process_ix(init_mint_ixs, &vec![mint_keypair]).await
    }

    pub async fn setup_treasury(&mut self, mint_amount: u64) -> Result<(), BanksClientError> {
        self.mint_to_treasury(mint_amount).await.unwrap();
        self.verify_token_account_data(self.pyth_treasury, mint_amount, COption::None, 0)
            .await
            .unwrap();

        self.approve_treasury_delegate(get_config_pda().0, mint_amount)
            .await
            .unwrap();

        self.verify_token_account_data(
            self.pyth_treasury,
            mint_amount,
            COption::Some(get_config_pda().0),
            mint_amount,
        )
        .await
        .unwrap();
        Ok(())
    }

    pub async fn mint_to_treasury(&mut self, mint_amount: u64) -> Result<(), BanksClientError> {
        let mint_to_ix = &[mint_to(
            &Token::id(),
            &self.mint_keypair.pubkey(),
            &self.pyth_treasury,
            &self.pyth_mint_authority.pubkey(),
            &[],
            mint_amount,
        )
        .unwrap()];
        self.process_ix(mint_to_ix, &vec![&copy_keypair(&self.pyth_mint_authority)])
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


    pub async fn init_lookup_table(&mut self) -> Result<Pubkey, BanksClientError> {
        let recent_slot = self
            .banks_client
            .get_sysvar::<SlotHashes>()
            .await?
            .slot_hashes()
            .last()
            .unwrap()
            .0;
        let (create_ix, address_lookup_table) =
            solana_address_lookup_table_program::instruction::create_lookup_table(
                self.genesis_keypair.pubkey(),
                self.genesis_keypair.pubkey(),
                recent_slot,
            );
        self.process_ix(&[create_ix], &vec![]).await?;

        let extend_ix = solana_address_lookup_table_program::instruction::extend_lookup_table(
            address_lookup_table,
            self.genesis_keypair.pubkey(),
            Some(self.genesis_keypair.pubkey()),
            vec![
                get_config_pda().0,
                self.pyth_treasury,
                self.mint_keypair.pubkey(),
                spl_token::id(),
                system_program::System::id(),
                SYSVAR_IX_ID,
                spl_associated_token_account::id(),
            ],
        );

        self.process_ix(&[extend_ix], &vec![]).await?;


        Ok(address_lookup_table)
    }

    pub async fn initialize(
        &mut self,
        merkle_root: MerkleRoot<SolanaHasher>,
        dispenser_guard: Pubkey,
        address_lookup_table: Pubkey,
        mint_pubkey_override: Option<Pubkey>,
        treasury_pubkey_override: Option<Pubkey>,
        max_transfer_override: Option<u64>,
    ) -> Result<(), BanksClientError> {
        let accounts = accounts::Initialize::populate(
            self.genesis_keypair.pubkey(),
            mint_pubkey_override.unwrap_or(self.mint_keypair.pubkey()),
            treasury_pubkey_override.unwrap_or(self.pyth_treasury),
            address_lookup_table,
        )
        .to_account_metas(None);
        let instruction_data = instruction::Initialize {
            merkle_root,
            dispenser_guard,
            funder: self.genesis_keypair.pubkey(),
            max_transfer: max_transfer_override.unwrap_or(u64::MAX),
        };
        let instruction =
            Instruction::new_with_bytes(crate::id(), &instruction_data.data(), accounts);
        self.process_ix(&[instruction], &vec![]).await
    }


    pub async fn initialize_with_claimants(
        &mut self,
        claimants: Vec<Keypair>,
        dispenser_guard: &Keypair,
        max_transfer_override: Option<u64>,
    ) -> Result<
        (
            MerkleTree<SolanaHasher>,
            Vec<(Keypair, Vec<TestClaimCertificate>, u64)>,
        ),
        BanksClientError,
    > {
        let mock_offchain_certificates_and_claimants: Vec<(
            Keypair,
            Vec<TestClaimCertificate>,
            u64,
        )> = claimants
            .into_iter()
            .map(|c| {
                let pubkey = c.pubkey();
                let test_claim_certs =
                    DispenserSimulator::generate_test_claim_certs(&pubkey, dispenser_guard);
                let amount = test_claim_certs.iter().map(|y| y.amount).sum::<u64>();
                (c, test_claim_certs, amount)
            })
            .collect::<Vec<_>>();

        let merkle_items: Vec<ClaimInfo> = mock_offchain_certificates_and_claimants
            .iter()
            .flat_map(|(_, claim_certs, _)| {
                claim_certs
                    .iter()
                    .map(|item: &TestClaimCertificate| item.clone().into())
            })
            .collect();

        let address_lookup_table = self.init_lookup_table().await.unwrap();

        let merkle_tree = merkleize(merkle_items).0;

        self.initialize(
            merkle_tree.root.clone(),
            dispenser_guard.pubkey(),
            address_lookup_table,
            None,
            None,
            max_transfer_override,
        )
        .await?;

        let claim_sums = mock_offchain_certificates_and_claimants
            .iter()
            .map(|x| x.1.iter().map(|y| y.amount).sum::<u64>())
            .collect::<Vec<u64>>();

        self.setup_treasury(claim_sums.iter().sum::<u64>())
            .await
            .unwrap();

        Ok((merkle_tree, mock_offchain_certificates_and_claimants))
    }

    pub async fn approve_treasury_delegate(
        &mut self,
        delegate: Pubkey,
        amount: u64,
    ) -> Result<(), BanksClientError> {
        let approve_ix = spl_token::instruction::approve(
            &Token::id(),
            &self.pyth_treasury,
            &delegate,
            &self.pyth_mint_authority.pubkey(),
            &[],
            amount,
        )
        .unwrap();

        self.process_ix(
            &[approve_ix],
            &vec![&copy_keypair(&self.pyth_mint_authority)],
        )
        .await
    }

    pub async fn revoke_treasury_delegate(&mut self) -> Result<(), BanksClientError> {
        let revoke_ix = spl_token::instruction::revoke(
            &Token::id(),
            &self.pyth_treasury,
            &self.pyth_mint_authority.pubkey(),
            &[],
        )
        .unwrap();

        self.process_ix(
            &[revoke_ix],
            &vec![&copy_keypair(&self.pyth_mint_authority)],
        )
        .await
    }


    // Note: Not using versioned transaction here since
    // `BanksClient` doesn't support sending them and
    // it's already tested in the typescript tests
    pub async fn claim(
        &mut self,
        claimant: &Keypair,
        off_chain_claim_certificate: &TestClaimCertificate,
        merkle_tree: &MerkleTree<SolanaHasher>,
        claimant_fund: Option<Pubkey>,
        merkle_proof_override: Option<MerklePath<SolanaHasher>>,
        claim_receipt_override: Option<Pubkey>,
    ) -> Result<(), BanksClientError> {
        let (claim_certificate, option_instruction) =
            off_chain_claim_certificate.as_claim_certificate(merkle_tree, 0, merkle_proof_override);
        let config = self
            .get_account_data::<crate::Config>(get_config_pda().0)
            .await
            .unwrap();
        let mut accounts = accounts::Claim::populate(
            self.genesis_keypair.pubkey(),
            claimant.pubkey(),
            config.mint,
            claimant_fund
                .unwrap_or_else(|| get_associated_token_address(&claimant.pubkey(), &config.mint)),
            config.treasury,
        )
        .to_account_metas(None);

        accounts.push(AccountMeta::new(
            claim_receipt_override.unwrap_or(
                get_receipt_pda(
                    &<TestClaimCertificate as Into<ClaimInfo>>::into(
                        off_chain_claim_certificate.clone(),
                    )
                    .try_to_vec()?,
                )
                .0,
            ),
            false,
        ));


        let instruction_data: instruction::Claim = instruction::Claim { claim_certificate };

        let mut instructions = vec![];

        if let Some(verification_instruction) = option_instruction {
            instructions.push(verification_instruction);
        }

        instructions.push(Instruction::new_with_bytes(
            crate::id(),
            &instruction_data.data(),
            accounts,
        ));


        self.process_ix(&instructions, &vec![claimant]).await
    }

    pub async fn get_account(&mut self, key: Pubkey) -> Option<Account> {
        self.banks_client.get_account(key).await.ok()?
    }

    pub async fn get_account_data<T: AccountDeserialize>(&mut self, cart_key: Pubkey) -> Option<T> {
        self.get_account(cart_key)
            .await
            .and_then(|a| <T>::try_deserialize(&mut a.data()).ok())
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
        self.process_ix(init_token_account_ixs, &vec![token_account])
            .await
    }

    pub async fn create_associated_token_account(
        &mut self,
        owner: &Pubkey,
        mint: &Pubkey,
    ) -> Result<(), BanksClientError> {
        let create_associated_token_account_ix =
            spl_associated_token_account::instruction::create_associated_token_account(
                &self.genesis_keypair.pubkey(),
                owner,
                mint,
                &spl_token::id(),
            );
        self.process_ix(&[create_associated_token_account_ix], &vec![])
            .await
    }

    pub async fn verify_token_account_data(
        &mut self,
        token_account: Pubkey,
        expected_amount: u64,
        expected_delegate: COption<Pubkey>,
        expected_delegated_amount: u64,
    ) -> Result<(), BanksClientError> {
        let token_account_data = self
            .get_account_data::<TokenAccount>(token_account)
            .await
            .unwrap();
        assert_eq!(token_account_data.amount, expected_amount);
        assert_eq!(token_account_data.delegate, expected_delegate);
        assert_eq!(
            token_account_data.delegated_amount,
            expected_delegated_amount
        );
        Ok(())
    }
}

pub fn copy_keypair(keypair: &Keypair) -> Keypair {
    Keypair::from_bytes(&keypair.to_bytes()).unwrap()
}

////////////////////////////////////////////////////////////////////////////////
// Error conversions.
////////////////////////////////////////////////////////////////////////////////

pub trait IntoTransactionError {
    fn into_transaction_error(self, instruction_index: u8) -> TransactionError;
}

impl IntoTransactionError for ErrorCode {
    fn into_transaction_error(self, instruction_index: u8) -> TransactionError {
        TransactionError::InstructionError(
            instruction_index,
            InstructionError::try_from(u64::from(ProgramError::from(
                anchor_lang::prelude::Error::from(self),
            )))
            .unwrap(),
        )
    }
}

impl IntoTransactionError for anchor_lang::error::ErrorCode {
    fn into_transaction_error(self, instruction_index: u8) -> TransactionError {
        TransactionError::InstructionError(
            instruction_index,
            InstructionError::try_from(u64::from(ProgramError::from(
                anchor_lang::prelude::Error::from(self),
            )))
            .unwrap(),
        )
    }
}

impl IntoTransactionError for TokenError {
    fn into_transaction_error(self, instruction_index: u8) -> TransactionError {
        TransactionError::InstructionError(
            instruction_index,
            InstructionError::try_from(u64::from(ProgramError::from(self))).unwrap(),
        )
    }
}
impl IntoTransactionError for InstructionError {
    fn into_transaction_error(self, instruction_index: u8) -> TransactionError {
        TransactionError::InstructionError(instruction_index, self)
    }
}
