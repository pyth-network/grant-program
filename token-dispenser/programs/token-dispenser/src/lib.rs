#![allow(clippy::result_large_err)]

use {
    anchor_lang::{
        prelude::*,
        solana_program::{
            sysvar::instructions::{ID as SYSVAR_IX_ID, load_instruction_at_checked},
            instruction::Instruction,
            keccak::hashv,
            program::{
                invoke,
                invoke_signed,
            },
            system_instruction,
        },
        system_program,
    },
    pythnet_sdk::{
        accumulators::merkle::{
            MerklePath,
            MerkleRoot,
            MerkleTree,
        },
        hashers::Hasher,
    },
    std::{
        collections::HashSet,
        mem::{
            self,
            Discriminant,
        },
    },
};

#[cfg(test)]
mod tests;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

const CONFIG_SEED: &[u8] = b"config";
const RECEIPT_SEED: &[u8] = b"receipt";
const CART_SEED: &[u8] = b"cart";

const MESSAGE : &str = "Pyth grant program:\nI irrevocably authorize solana wallet\n${SOLANA_WALLET}\nto claim PYTH tokens on my behalf.\n";

#[program]
pub mod token_dispenser {
    use super::*;

    /// This can only be called once and should be called right after the program is deployed.
    pub fn initialize(ctx: Context<Initialize>, target_config: Config) -> Result<()> {
        *ctx.accounts.config = target_config;
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
    pub fn claim(ctx: Context<Claim>, claims_with_proof: Vec<ClaimWithProof>) -> Result<()> {
        let config = &ctx.accounts.config;
        let cart = &mut ctx.accounts.cart;

        // TO DO : Actually check the proof of identity and the proof of inclusion
        for (index, claim_with_proof) in claims_with_proof.iter().enumerate() {
            // Each leaf of the tree is a hash of the serialized claim info
            // The identity is derived from the proof of identity (signature)
            // If the proof of identity does not correspond to a whitelisted identiy, the inclusion
            // verification will fail
            let ix: Instruction = load_instruction_at_checked(0, &ctx.accounts.sysvar_instruction)?;
            let leaf_vector = claim_with_proof.try_to_vec()?;

            if !config
                .merkle_root
                .check(claim_with_proof.proof.clone(), &leaf_vector)
            {
                return Err(ErrorCode::InvalidInclusionProof.into());
            };

            checked_create_claim_receipt(
                index,
                &leaf_vector,
                ctx.accounts.claimant.key,
                ctx.remaining_accounts,
            )?;

            cart.amount = cart
                .amount
                .checked_add(claim_with_proof.claim.amount)
                .ok_or(ErrorCode::ArithmeticOverflow)?;

            // Check that the claimant is not claiming tokens more than once per ecosystem
            if cart.set.contains(&claim_with_proof.claim.identity) {
                return Err(ErrorCode::MoreThanOneIdentityPerEcosystem.into());
            }
            cart.set.insert(&claim_with_proof.claim.identity);
        }

        // TO DO : Send tokens to claimant (we will also initialize a vesting account for them)
        Ok(())
    }
}

////////////////////////////////////////////////////////////////////////////////
// Contexts.
////////////////////////////////////////////////////////////////////////////////


#[derive(Accounts)]
#[instruction(target_config : Config)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub payer:          Signer<'info>,
    #[account(init, payer = payer, space = Config::LEN, seeds = [CONFIG_SEED], bump)]
    pub config:         Account<'info, Config>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(claim_infos : Vec<ClaimWithProof>)]
pub struct Claim<'info> {
    #[account(mut)]
    pub claimant:        Signer<'info>,
    pub dispenser_guard: Signer<'info>, /* Check that the dispenser guard has signed and matches
                                         * the config - Done */
    #[account(seeds = [CONFIG_SEED], bump, has_one = dispenser_guard)]
    pub config:          Account<'info, Config>,
    #[account(init_if_needed, space = Cart::LEN, payer = claimant, seeds = [CART_SEED, claimant.key.as_ref()], bump)]
    pub cart:            Account<'info, Cart>,
    pub system_program:  Program<'info, System>,
    #[account(address = SYSVAR_IX_ID)]
    pub sysvar_instruction: AccountInfo<'info>,
}

////////////////////////////////////////////////////////////////////////////////
// Instruction calldata.
////////////////////////////////////////////////////////////////////////////////

#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct ClaimWithProof {
    claim: ClaimInfo,
    proof: MerklePath<SolanaHasher>,
}

#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct ClaimInfo {
    identity: Identity,
    amount:   u64,
}

#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub enum Identity {
    Discord,
    Solana(Pubkey), // Pubkey, Signature
    Evm,
    Sui,
    Aptos,
    Cosmwasm,
}
impl Identity {
    pub fn to_discriminant(&self) -> usize {
        match self {
            Identity::Discord => 0,
            Identity::Solana(_) => 1,
            Identity::Evm => 2,
            Identity::Sui => 3,
            Identity::Aptos => 4,
            Identity::Cosmwasm => 5,
        }
    }

    pub const NUMBER_OF_VARIANTS: usize = 6;
}

#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct ClaimCertificate {
    proof_of_identity:  ProofOfIdentity, /* Proof that the caller is the owner of the wallet
                                          * entitled to the tokens */
    amount:             u64, // Amount of tokens contained in the leaf
    proof_of_inclusion: MerklePath<SolanaHasher>, // Proof that the leaf is in the tree
}

/**
 * A proof of identity is composed by a public key and a signature except for discord where we
 * can't verify the identity in the smart contract.
 */
#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub enum ProofOfIdentity {
    Discord,
    Solana, // Signature
    Evm,
    Sui,
    Aptos,
    Cosmwasm,
}

pub fn get_claim(claim_certificate: &ClaimCertificate, instruction: &Instruction, claimant : &Pubkey) -> ClaimInfo {
    ClaimInfo {
        identity: check_authorized(&claim_certificate.proof_of_identity, instruction, claimant),
        amount:   claim_certificate.amount,
    }
}


pub fn check_authorized(item: &ProofOfIdentity, instruction: &Instruction, claimant : &Pubkey) -> Identity {
    match item {
        ProofOfIdentity::Discord => Identity::Discord,
        ProofOfIdentity::Solana => Identity::Solana(Pubkey::new_from_array([0u8; 32])),
        ProofOfIdentity::Evm => Identity::Evm,
        ProofOfIdentity::Sui => Identity::Sui,
        ProofOfIdentity::Aptos => Identity::Aptos,
        ProofOfIdentity::Cosmwasm => Identity::Cosmwasm,
    }
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
    type Hash = [u8; 32];

    fn hashv(data: &[impl AsRef<[u8]>]) -> Self::Hash {
        hashv(&data.iter().map(|x| x.as_ref()).collect::<Vec<&[u8]>>()).to_bytes()
    }
}

#[account]
#[derive(PartialEq, Debug)]
pub struct Config {
    pub merkle_root:     MerkleRoot<SolanaHasher>,
    pub dispenser_guard: Pubkey,
}

impl Config {
    pub const LEN: usize = 8 + 32 + 32;
}

#[account]
pub struct Receipt {}

#[account]
pub struct Cart {
    pub amount: u64,
    pub set:    ClaimedEcosystems,
}

impl Cart {
    pub const LEN: usize = 8 + 8 + 6;
}
#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct ClaimedEcosystems {
    set: [bool; Identity::NUMBER_OF_VARIANTS],
}

impl ClaimedEcosystems {
    pub fn new() -> Self {
        ClaimedEcosystems {
            set: [false; Identity::NUMBER_OF_VARIANTS],
        }
    }

    pub fn insert(&mut self, item: &Identity) -> () {
        let index = item.to_discriminant();
        self.set[index] = true;
    }
    pub fn contains(&self, item: &Identity) -> bool {
        self.set[item.to_discriminant()]
    }
}


////////////////////////////////////////////////////////////////////////////////
// Error.
////////////////////////////////////////////////////////////////////////////////

#[error_code]
pub enum ErrorCode {
    ArithmeticOverflow,
    MoreThanOneIdentityPerEcosystem,
    AlreadyClaimed,
    InvalidInclusionProof,
    WrongPda,
}


pub fn check_claim_receipt_is_unitialized(claim_receipt_account: &AccountInfo) -> Result<()> {
    if claim_receipt_account.owner.eq(&crate::id()) {
        return Err(ErrorCode::AlreadyClaimed.into());
    }
    Ok(())
}

/**
 * Creates a claim receipt for the claimant. This is an account that contains no data. Each leaf
 * is associated with a unique claim receipt account. Since the number of claim receipt accounts
 * to be passed to the program is dynamic and equal to the size of `claim_certificates`, it is
 * awkward to declare them in the anchor context. Instead, we pass them inside
 * remaining_accounts. If the account is initialized, the assign instruction will fail.
 */
pub fn checked_create_claim_receipt(
    index: usize,
    leaf: &[u8],
    payer: &Pubkey,
    remaining_accounts: &[AccountInfo],
) -> Result<()> {
    let (receipt_pubkey, bump) = get_receipt_pda(leaf);

    // The claim receipt accounts should appear in remaining accounts in the same order as the claim certificates
    let claim_receipt_account = &remaining_accounts[index];
    if !claim_receipt_account.key.eq(&receipt_pubkey) {
        return Err(ErrorCode::WrongPda.into());
    }

    check_claim_receipt_is_unitialized(claim_receipt_account)?;

    // Pay rent for the receipt account
    let transfer_instruction = system_instruction::transfer(
        payer,
        &claim_receipt_account.key(),
        Rent::get()?.minimum_balance(0),
    );
    invoke(&transfer_instruction, remaining_accounts)?;


    // Assign it to the program, this instruction will fail if the account already belongs to the
    // program
    let assign_instruction = system_instruction::assign(&claim_receipt_account.key(), &crate::id());
    invoke_signed(
        &assign_instruction,
        remaining_accounts,
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

pub fn get_cart_pda(claimant: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[CART_SEED, claimant.as_ref()], &crate::id())
}

impl crate::accounts::Initialize {
    pub fn populate(payer: Pubkey) -> Self {
        crate::accounts::Initialize {
            payer,
            config: get_config_pda().0,
            system_program: system_program::System::id(),
        }
    }
}

impl crate::accounts::Claim {
    pub fn populate(claimant: Pubkey, dispenser_guard: Pubkey) -> Self {
        crate::accounts::Claim {
            claimant,
            dispenser_guard,
            config: get_config_pda().0,
            cart: get_cart_pda(&claimant).0,
            system_program: system_program::System::id(),
            sysvar_instruction : SYSVAR_IX_ID
        }
    }
}
