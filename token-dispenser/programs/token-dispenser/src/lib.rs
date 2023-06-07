use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::{
    invoke,
    invoke_signed,
};
use anchor_lang::solana_program::system_instruction;
use pythnet_sdk::accumulators::merkle::{
    MerklePath,
    MerkleRoot,
};
use pythnet_sdk::hashers::keccak256::Keccak256;
use std::collections::HashSet;
use std::mem::{
    self,
    Discriminant,
};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

const CONFIG_SEED: &[u8] = b"config";
const CLAIM_SEED: &[u8] = b"claim";
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
     * - The claimant has not already claimed tokens
     */
    pub fn claim(ctx: Context<Claim>, claim_certificates: Vec<ClaimCertificate>) -> Result<()> {
        let config = &ctx.accounts.config;

        let mut total_amount: u64 = 0;

        // Check that the claimant is not claiming tokens for more than one ecosystem
        verify_one_identity_per_ecosystem(&claim_certificates)?;

        let merkle_root = MerkleRoot::<Keccak256>::new(config.merkle_root);

        // TO DO : Actually check the proof of identity and the proof of inclusion
        for claim_certificate in &claim_certificates {
            // Each leaf of the tree is a hash of the serialized claim info
            // The identity is derived from the proof of identity (signature)
            // If the proof of identity does not correspond to a whitelisted identiy, the inclusion
            // verification will fail
            let leaf_vector = get_claim(claim_certificate).try_to_vec()?;
            merkle_root.check(
                MerklePath::<Keccak256>::new(claim_certificate.proof_of_inclusion.clone()),
                &leaf_vector,
            );
            create_claim_receipt(
                ctx.program_id,
                ctx.accounts.claimant.key,
                ctx.remaining_accounts,
                &leaf_vector,
            )?;
            total_amount = total_amount
                .checked_add(claim_certificate.amount)
                .ok_or(ErrorCode::ArithmeticOverflow)?;
        }

        // TO DO : Check that the claimant has not already claimed the tokens (We will initialize a
        // claim account for each leaf that has been claimed)

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
    #[account(init, payer = payer, space = 8 + 32, seeds = [CONFIG_SEED], bump)]
    pub config:         Account<'info, Config>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(claim_certificates : Vec<ClaimCertificate>)]
pub struct Claim<'info> {
    pub claimant:        Signer<'info>,
    pub dispenser_guard: Signer<'info>, /* Check that the dispenser guard has signed and matches
                                         * the config - Done */
    #[account(seeds = [CONFIG_SEED], bump, has_one = dispenser_guard)]
    pub config:          Account<'info, Config>,
}

////////////////////////////////////////////////////////////////////////////////
// Instruction calldata.
////////////////////////////////////////////////////////////////////////////////


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


#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct ClaimCertificate {
    proof_of_identity:  ProofOfIdentity, /* Proof that the caller is the owner of the wallet
                                          * entitled to the tokens */
    amount:             u64, // Amount of tokens contained in the leaf
    proof_of_inclusion: Vec<[u8; 32]>, // Proof that the leaf is in the tree
}

/**
 * A proof of identity is composed by a public key and a signature except for discord where we
 * can't verify the identity in the smart contract.
 */
#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub enum ProofOfIdentity {
    Discord,
    Solana(Vec<u8>), // Signature
    Evm,
    Sui,
    Aptos,
    Cosmwasm,
}

pub fn get_claim(claim_certificate: &ClaimCertificate) -> ClaimInfo {
    ClaimInfo {
        identity: get_identity(&claim_certificate.proof_of_identity),
        amount:   claim_certificate.amount,
    }
}


pub fn get_identity(item: &ProofOfIdentity) -> Identity {
    match item {
        ProofOfIdentity::Discord => Identity::Discord,
        ProofOfIdentity::Solana(_) => Identity::Solana(Pubkey::new_from_array([0u8; 32])),
        ProofOfIdentity::Evm => Identity::Evm,
        ProofOfIdentity::Sui => Identity::Sui,
        ProofOfIdentity::Aptos => Identity::Aptos,
        ProofOfIdentity::Cosmwasm => Identity::Cosmwasm,
    }
}


pub fn verify_one_identity_per_ecosystem(claim_certificates: &Vec<ClaimCertificate>) -> Result<()> {
    let hash_set: HashSet<Discriminant<ProofOfIdentity>> = claim_certificates
        .iter()
        .map(|claim_certificate| mem::discriminant(&claim_certificate.proof_of_identity))
        .collect();
    if hash_set.len() != claim_certificates.len() {
        return Err(ErrorCode::MoreThanOneIdentityPerEcosystem.into());
    }
    Ok(())
}

////////////////////////////////////////////////////////////////////////////////
// Accounts.
////////////////////////////////////////////////////////////////////////////////

#[account]
pub struct Config {
    pub merkle_root:     [u8; 32],
    pub dispenser_guard: Pubkey,
}

////////////////////////////////////////////////////////////////////////////////
// Error.
////////////////////////////////////////////////////////////////////////////////

#[error_code]
pub enum ErrorCode {
    ArithmeticOverflow,
    MoreThanOneIdentityPerEcosystem,
    AlreadyClaimed,
}

/**
 * Creates a claim receipt for the claimant. This is an account that contains no data. Each leaf
 * is associated with a unique claim receipt account. Since the number of claim receipt accounts to be
 * passed to the program is dynamic and equal to the size of `claim_certificates`, it is awkward to
 * declare them in the anchor context. Instead, we pass them inside remaining_accounts.
 * If the account is initialized, the assign instruction will fail.
 */
pub fn create_claim_receipt(
    program_id: &Pubkey,
    payer: &Pubkey,
    remanining_accounts: &[AccountInfo],
    leaf: &[u8],
) -> Result<()> {
    let (claim_pubkey, bump) = Pubkey::find_program_address(&[&CLAIM_SEED, leaf], program_id);

    // Pay rent for the receipt account
    let transfer_instruction =
        system_instruction::transfer(&payer, &claim_pubkey, Rent::get()?.minimum_balance(0));
    invoke(&transfer_instruction, remanining_accounts)?;

    // Assign it to the program, this instruction will fail if the account already belongs to the
    // program
    let assign_instruction = system_instruction::assign(&claim_pubkey, program_id);
    invoke_signed(
        &assign_instruction,
        remanining_accounts,
        &[&[CLAIM_SEED], &[&[bump]]],
    )
    .map_err(|_| ErrorCode::AlreadyClaimed)?;

    Ok(())
}
