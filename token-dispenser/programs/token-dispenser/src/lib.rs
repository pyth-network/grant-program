#![allow(clippy::result_large_err)]

use {
    anchor_lang::{
        prelude::*,
        solana_program::{
            keccak::hashv,
            program::{
                invoke,
                invoke_signed,
            },
            system_instruction,
            sysvar::instructions::{
                load_instruction_at_checked,
                ID as SYSVAR_IX_ID,
            },
        },
        system_program,
    },
    anchor_spl::{
        associated_token::{
            self,
            AssociatedToken,
        },
        token::{
            spl_token,
            Mint,
            Token,
            TokenAccount,
        },
    },
    ecosystems::{
        aptos::{
            AptosAddress,
            AptosMessage,
        },
        check_payload,
        cosmos::{
            CosmosBech32Address,
            CosmosMessage,
            UncompressedSecp256k1Pubkey,
        },
        discord::DiscordMessage,
        ed25519::{
            Ed25519InstructionData,
            Ed25519Pubkey,
        },
        evm::EvmPrefixedMessage,
        secp256k1::{
            secp256k1_verify_signer,
            EvmPubkey,
            Secp256k1InstructionData,
            Secp256k1Signature,
        },
        sui::{
            SuiAddress,
            SuiMessage,
        },
    },
    pythnet_sdk::{
        accumulators::merkle::{
            MerklePath,
            MerkleRoot,
            MerkleTree,
        },
        hashers::Hasher,
    },
};

#[cfg(test)]
mod tests;

mod ecosystems;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

const CONFIG_SEED: &[u8] = b"config";
const RECEIPT_SEED: &[u8] = b"receipt";
#[program]
pub mod token_dispenser {
    use {
        super::*,
        anchor_spl::token,
    };

    /// This can only be called once and should be called right after the program is deployed.
    pub fn initialize(
        ctx: Context<Initialize>,
        merkle_root: MerkleRoot<SolanaHasher>,
        dispenser_guard: Pubkey,
        funder: Pubkey,
        max_transfer: u64,
    ) -> Result<()> {
        require_keys_neq!(dispenser_guard, Pubkey::default());
        let config: &mut Account<'_, Config> = &mut ctx.accounts.config;
        config.bump = *ctx.bumps.get("config").unwrap();
        config.merkle_root = merkle_root;
        config.dispenser_guard = dispenser_guard;
        config.mint = ctx.accounts.mint.key();
        config.treasury = ctx.accounts.treasury.key();
        config.address_lookup_table = ctx.accounts.address_lookup_table.key();
        config.funder = funder;
        config.max_transfer = max_transfer;
        Ok(())
    }

    /**
     * Claim a claimant's tokens. This instructions needs to enforce :
     * - The dispenser guard has signed the transaction - DONE
     * - The claimant is claiming no more than once per ecosystem - DONE
     * - The claimant has provided a valid proof of identity (is the owner of the wallet
     *   entitled to the tokens)
     * - The claimant has provided a valid proof of inclusion (this confirm that the claimant --
     *   DONE
     * - The claimant has not already claimed tokens -- DONE
     */
    pub fn claim<'info>(
        ctx: Context<'_, '_, '_, 'info, Claim<'info>>,
        claim_certificate: ClaimCertificate,
    ) -> Result<()> {
        let config = &ctx.accounts.config;
        let treasury = &mut ctx.accounts.treasury;
        let claimant_fund = &ctx.accounts.claimant_fund;

        // Check that the identity corresponding to the leaf has authorized the claimant
        let claim_info = claim_certificate.checked_into_claim_info(
            &ctx.accounts.sysvar_instruction,
            ctx.accounts.claimant.key,
            &ctx.accounts.config.dispenser_guard,
        )?;
        // Each leaf of the tree is a hash of the serialized claim info
        let leaf_vector = claim_info.try_to_vec()?;

        if !config
            .merkle_root
            .check(claim_certificate.proof_of_inclusion.clone(), &leaf_vector)
        {
            return err!(ErrorCode::InvalidInclusionProof);
        };


        checked_create_claim_receipt(
            0,
            &leaf_vector,
            &ctx.accounts.funder,
            &ctx.accounts.system_program,
            ctx.remaining_accounts,
        )?;

        require_gte!(
            config.max_transfer,
            claim_info.amount,
            ErrorCode::TransferExceedsMax
        );

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from:      treasury.to_account_info(),
                    to:        claimant_fund.to_account_info(),
                    authority: config.to_account_info(),
                },
                &[&[CONFIG_SEED, &[config.bump]]],
            ),
            claim_info.amount,
        )?;

        // reload treasury account from storage to get the updated balance
        treasury.reload()?;

        emit!(ClaimEvent {
            remaining_balance: treasury.amount,
            claimant: *ctx.accounts.claimant.key,
            claim_info,
        });


        Ok(())
    }
}

////////////////////////////////////////////////////////////////////////////////
// Contexts.
////////////////////////////////////////////////////////////////////////////////

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub payer:                Signer<'info>,
    #[account(init, payer = payer, space = Config::LEN, seeds = [CONFIG_SEED], bump)]
    pub config:               Account<'info, Config>,
    /// Mint of the treasury
    pub mint:                 Account<'info, Mint>,
    /// Treasury token account. This is an externally owned token account and
    /// the owner of this account will approve the config as a delegate using the
    /// solana CLI command `spl-token approve <treasury_account_address> <approve_amount> <config_address>`
    #[account( token::mint = mint )]
    pub treasury:             Account<'info, TokenAccount>,
    pub system_program:       Program<'info, System>,
    /// CHECK: Anchor doesn't have built-in support for address lookup table so adding this check to make sure at least the PDA owner is correct
    #[account(owner = solana_address_lookup_table_program::id())]
    pub address_lookup_table: UncheckedAccount<'info>,
}

#[derive(Accounts)]
#[instruction(claim_certificate : ClaimCertificate)]
pub struct Claim<'info> {
    #[account(mut)]
    pub funder:                   Signer<'info>, // Funds the claimant_fund and the claim receipt account
    pub claimant:                 Signer<'info>,
    /// Claimant's associated token account to receive the tokens
    /// Should be initialized outside of this program.
    #[account(
        init_if_needed,
        payer = funder,
        associated_token::authority = claimant,
        associated_token::mint = mint,
    )]
    pub claimant_fund:            Account<'info, TokenAccount>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump, has_one = treasury, has_one = mint)]
    pub config:                   Account<'info, Config>,
    pub mint:                     Account<'info, Mint>,
    #[account(mut)]
    pub treasury:                 Account<'info, TokenAccount>,
    pub token_program:            Program<'info, Token>,
    pub system_program:           Program<'info, System>,
    /// CHECK : Anchor wants me to write this comment because I'm using AccountInfo which doesn't check for ownership and doesn't deserialize the account automatically. But it's fine because I check the address and I load it using load_instruction_at_checked.
    #[account(address = SYSVAR_IX_ID)]
    pub sysvar_instruction:       AccountInfo<'info>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}


////////////////////////////////////////////////////////////////////////////////
// Instruction calldata.
////////////////////////////////////////////////////////////////////////////////

#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct ClaimInfo {
    pub identity: Identity,
    pub amount:   u64,
}

/**
 * This is the identity that the claimant will use to claim tokens.
 * A claimant can claim tokens for 1 identity on each ecosystem.
 * Typically for a blockchain it is a public key in the blockchain's address space.
 */
#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub enum Identity {
    Discord { username: String },
    Solana { pubkey: Ed25519Pubkey },
    Evm { pubkey: EvmPubkey },
    Sui { address: SuiAddress },
    Aptos { address: AptosAddress },
    Cosmwasm { address: CosmosBech32Address },
    Injective { address: CosmosBech32Address },
}

#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub enum IdentityCertificate {
    Discord {
        username:                       String,
        verification_instruction_index: u8,
    },
    Evm {
        pubkey:                         EvmPubkey,
        verification_instruction_index: u8,
    },
    Solana,
    Sui {
        pubkey:                         Ed25519Pubkey,
        verification_instruction_index: u8,
    },
    Aptos {
        pubkey:                         Ed25519Pubkey,
        verification_instruction_index: u8,
    },
    Cosmwasm {
        chain_id:    String,
        signature:   Secp256k1Signature,
        recovery_id: u8,
        pubkey:      UncompressedSecp256k1Pubkey,
        message:     Vec<u8>,
    },
    Injective {
        pubkey:                         EvmPubkey,
        verification_instruction_index: u8,
    },
}

#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct ClaimCertificate {
    pub amount:             u64,
    pub proof_of_identity:  IdentityCertificate,
    pub proof_of_inclusion: MerklePath<SolanaHasher>, // Proof that the leaf is in the tree
}

////////////////////////////////////////////////////////////////////////////////
// Accounts.
////////////////////////////////////////////////////////////////////////////////

/**
 * A hasher that uses the solana pre-compiled keccak256 function.
 */
#[derive(Default, Debug, Clone, PartialEq)]
pub struct SolanaHasher {}
impl Hasher for SolanaHasher {
    type Hash = [u8; 20];

    fn hashv(data: &[impl AsRef<[u8]>]) -> Self::Hash {
        let bytes = hashv(&data.iter().map(|x| x.as_ref()).collect::<Vec<&[u8]>>());
        let mut hash = [0u8; 20];
        hash.copy_from_slice(&bytes.as_ref()[0..20]);
        hash
    }
}

#[account]
#[derive(PartialEq, Debug)]
pub struct Config {
    pub bump:                 u8,
    pub merkle_root:          MerkleRoot<SolanaHasher>,
    pub dispenser_guard:      Pubkey,
    pub mint:                 Pubkey,
    pub treasury:             Pubkey,
    pub address_lookup_table: Pubkey,
    pub funder:               Pubkey,
    pub max_transfer:         u64, // This is an extra safeguard to prevent the dispenser from being drained
}

impl Config {
    pub const LEN: usize = 8 + 1 + 20 + 32 + 32 + 32 + 32 + 32 + 8;
}

#[account]
pub struct Receipt {}

////////////////////////////////////////////////////////////////////////////////
// Error.
////////////////////////////////////////////////////////////////////////////////

#[error_code]
pub enum ErrorCode {
    AlreadyClaimed,
    InvalidInclusionProof,
    WrongPda,
    // Signature verification errors
    SignatureVerificationWrongProgram,
    SignatureVerificationWrongAccounts,
    SignatureVerificationWrongHeader,
    SignatureVerificationWrongPayload,
    SignatureVerificationWrongPayloadMetadata,
    SignatureVerificationWrongSigner,
    UnauthorizedCosmosChainId,
    TransferExceedsMax,
}

pub fn check_claim_receipt_is_uninitialized(claim_receipt_account: &AccountInfo) -> Result<()> {
    if claim_receipt_account.owner.eq(&crate::id()) {
        return Err(ErrorCode::AlreadyClaimed.into());
    }
    Ok(())
}

/**
 * Checks that a proof of identity is valid and returns the underlying identity.
 * For some ecosystems like EVM we use a signature verification program,
 * for others like cosmos the signature is included in the ClaimCertificate.
 */
impl IdentityCertificate {
    pub fn checked_into_identity(
        &self,
        sysvar_instruction: &AccountInfo,
        claimant: &Pubkey,
        dispenser_guard: &Pubkey,
    ) -> Result<Identity> {
        match self {
            IdentityCertificate::Discord {
                username,
                verification_instruction_index,
            } => {
                let signature_verification_instruction = load_instruction_at_checked(
                    *verification_instruction_index as usize,
                    sysvar_instruction,
                )?;
                let discord_message = DiscordMessage::parse_and_check_claimant_and_username(
                    &Ed25519InstructionData::extract_message_and_check_signature(
                        &signature_verification_instruction,
                        &Ed25519Pubkey::from(*dispenser_guard),
                        verification_instruction_index,
                    )?,
                    username,
                    claimant,
                )?;

                Ok(Identity::Discord {
                    username: discord_message.get_username(),
                })
            }
            IdentityCertificate::Evm {
                pubkey,
                verification_instruction_index,
            } => {
                let signature_verification_instruction = load_instruction_at_checked(
                    *verification_instruction_index as usize,
                    sysvar_instruction,
                )?;
                check_payload(
                    EvmPrefixedMessage::parse(
                        &Secp256k1InstructionData::extract_message_and_check_signature(
                            &signature_verification_instruction,
                            pubkey,
                            verification_instruction_index,
                        )?,
                    )?
                    .get_payload(),
                    claimant,
                )?;
                Ok(Identity::Evm { pubkey: *pubkey })
            }
            IdentityCertificate::Cosmwasm {
                pubkey,
                chain_id,
                signature,
                recovery_id,
                message,
            } => {
                secp256k1_verify_signer(signature, recovery_id, pubkey, message)?;
                let cosmos_bech32 = pubkey.into_bech32(chain_id)?;
                CosmosMessage::check_hashed_payload(message, &cosmos_bech32, claimant)?;
                Ok(Identity::Cosmwasm {
                    address: cosmos_bech32,
                })
            }
            IdentityCertificate::Aptos {
                pubkey,
                verification_instruction_index,
            } => {
                let signature_verification_instruction = load_instruction_at_checked(
                    *verification_instruction_index as usize,
                    sysvar_instruction,
                )?;
                check_payload(
                    AptosMessage::parse(
                        &Ed25519InstructionData::extract_message_and_check_signature(
                            &signature_verification_instruction,
                            pubkey,
                            verification_instruction_index,
                        )?,
                    )?
                    .get_payload(),
                    claimant,
                )?;
                Ok(Identity::Aptos {
                    address: Into::<AptosAddress>::into(pubkey.clone()),
                })
            }
            IdentityCertificate::Sui {
                pubkey,
                verification_instruction_index,
            } => {
                let signature_verification_instruction = load_instruction_at_checked(
                    *verification_instruction_index as usize,
                    sysvar_instruction,
                )?;
                SuiMessage::check_hashed_payload(
                    &Ed25519InstructionData::extract_message_and_check_signature(
                        &signature_verification_instruction,
                        pubkey,
                        verification_instruction_index,
                    )?,
                    claimant,
                )?;
                Ok(Identity::Sui {
                    address: Into::<SuiAddress>::into(pubkey.clone()),
                })
            }
            IdentityCertificate::Solana => Ok(Identity::Solana {
                pubkey: Ed25519Pubkey::from(*claimant), // Solana verification relies on claimant signing the Solana transaction
            }),
            IdentityCertificate::Injective {
                pubkey,
                verification_instruction_index,
            } => {
                let signature_verification_instruction = load_instruction_at_checked(
                    *verification_instruction_index as usize,
                    sysvar_instruction,
                )?;
                let cosmos_bech32 = CosmosBech32Address::from(*pubkey);
                check_payload(
                    EvmPrefixedMessage::parse(
                        &Secp256k1InstructionData::extract_message_and_check_signature(
                            &signature_verification_instruction,
                            pubkey,
                            verification_instruction_index,
                        )?,
                    )?
                    .get_payload(),
                    claimant,
                )?;
                Ok(Identity::Injective {
                    address: cosmos_bech32,
                })
            }
        }
    }
}

/**
 * Check that the identity of the claim_info has authorized the claimant by signing a message.
 */
impl ClaimCertificate {
    pub fn checked_into_claim_info(
        &self,
        sysvar_instruction: &AccountInfo,
        claimant: &Pubkey,
        dispenser_guard: &Pubkey,
    ) -> Result<ClaimInfo> {
        Ok(ClaimInfo {
            identity: self.proof_of_identity.checked_into_identity(
                sysvar_instruction,
                claimant,
                dispenser_guard,
            )?,
            amount:   self.amount,
        })
    }
}


/**
 * Creates a claim receipt for the claimant. This is an account that contains no data. Each leaf
 * is associated with a unique claim receipt account. Since the number of claim receipt accounts
 * to be passed to the program is dynamic and equal to the size of `claim_certificates`, it is
 * awkward to declare them in the anchor context. Instead, we pass them inside
 * remaining_accounts. If the account is initialized, the assign instruction will fail.
 */
pub fn checked_create_claim_receipt<'info>(
    index: usize,
    leaf: &[u8],
    funder: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
    remaining_accounts: &[AccountInfo<'info>],
) -> Result<()> {
    let (receipt_pubkey, bump) = get_receipt_pda(leaf);


    // The claim receipt accounts should appear in remaining accounts in the same order as the claim certificates
    let claim_receipt_account = &remaining_accounts[index];
    require_keys_eq!(
        claim_receipt_account.key(),
        receipt_pubkey,
        ErrorCode::WrongPda
    );

    check_claim_receipt_is_uninitialized(claim_receipt_account)?;

    let account_infos = vec![
        claim_receipt_account.clone(),
        funder.to_account_info(),
        system_program.to_account_info(),
    ];
    // Pay rent for the receipt account
    let transfer_instruction = system_instruction::transfer(
        &funder.key(),
        &claim_receipt_account.key(),
        Rent::get()?
            .minimum_balance(0)
            .saturating_sub(claim_receipt_account.lamports()),
    );
    invoke(&transfer_instruction, &account_infos)?;

    // Assign it to the program, this instruction will fail if the account already belongs to the
    // program
    let assign_instruction = system_instruction::assign(&claim_receipt_account.key(), &crate::id());
    invoke_signed(
        &assign_instruction,
        &account_infos,
        &[&[
            RECEIPT_SEED,
            &MerkleTree::<SolanaHasher>::hash_leaf(leaf),
            &[bump],
        ]],
    )
    .map_err(|_| ErrorCode::AlreadyClaimed)?;

    Ok(())
}


////////////////////////////////////////////////////////////////////////////////
// Sdk.
////////////////////////////////////////////////////////////////////////////////

pub fn get_config_pda() -> (Pubkey, u8) {
    Pubkey::find_program_address(&[CONFIG_SEED], &crate::id())
}

pub fn get_receipt_pda(leaf: &[u8]) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[RECEIPT_SEED, &MerkleTree::<SolanaHasher>::hash_leaf(leaf)],
        &crate::id(),
    )
}

impl crate::accounts::Initialize {
    pub fn populate(
        payer: Pubkey,
        mint: Pubkey,
        treasury: Pubkey,
        address_lookup_table: Pubkey,
    ) -> Self {
        crate::accounts::Initialize {
            payer,
            config: get_config_pda().0,
            mint,
            treasury,
            system_program: system_program::System::id(),
            address_lookup_table,
        }
    }
}

impl crate::accounts::Claim {
    pub fn populate(
        funder: Pubkey,
        claimant: Pubkey,
        mint: Pubkey,
        claimant_fund: Pubkey,
        treasury: Pubkey,
    ) -> Self {
        crate::accounts::Claim {
            funder,
            claimant,
            claimant_fund,
            config: get_config_pda().0,
            mint,
            treasury,
            token_program: spl_token::id(),
            system_program: system_program::System::id(),
            sysvar_instruction: SYSVAR_IX_ID,
            associated_token_program: associated_token::ID,
        }
    }
}


////////////////////////////////////////////////////////////////////////////////
// Event
////////////////////////////////////////////////////////////////////////////////

#[event]
pub struct ClaimEvent {
    pub remaining_balance: u64,
    pub claimant:          Pubkey,
    pub claim_info:        ClaimInfo,
}
