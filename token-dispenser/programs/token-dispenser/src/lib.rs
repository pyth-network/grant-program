use anchor_lang::prelude::*;
use std::collections::HashSet;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

const CONFIG_SEED: &[u8] = b"config";
#[program]
pub mod token_dispenser {
    use super::*;
    use anchor_lang::solana_program::keccak;

    /// This can only be called once and should be called right after the program is deployed.
    pub fn initialize(ctx: Context<Initialize>, target_config: Config) -> Result<()> {
        *ctx.accounts.config = target_config;
        Ok(())
    }

    /**
     * Claim a claimant's tokens. This instructions needs to enforce :
     * - The dispenser guard has signed the transaction
     * - The claimant is not claiming tokens for more than one ecosystem
     * - The claimant has provided a valid proof of identity (is the owner of the wallet
     *   entitled to the tokens)
     * - The claimant has provided a valid proof of inclusion (this confirm that the claimant
     *   has been an allocation)
     * - The claimant has not already claimed tokens
     */
    pub fn claim(ctx: Context<Claim>, proofs: Vec<Proof>) -> Result<()> {
        let config = &ctx.accounts.config;

        let mut total_amount: u64 = 0;

        // Check that the claimant is not claiming tokens for more than one ecosystem
        verify_one_identity_per_ecosystem(&proofs)?;

        // TO DO : Actually check the proof of identity and the proof of inclusion
        for proof in proofs {
            proof.proof_of_identity.verify_signature()?;
            // Each leaf of the tree is a hash of the amount and the discriminator and public key of
            // the identity
            let leaf: [u8; 32] = keccak::hashv(&[
                &proof.amount.to_le_bytes(),
                &proof.proof_of_identity.into_seed_for_leaf(),
            ])
            .0;
            verify_inclusion(leaf, proof.proof_of_inclusion, config.merkle_root)?;
            total_amount = total_amount
                .checked_add(proof.amount)
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
#[instruction(proofs : Vec<Proof>)]
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
pub struct Proof {
    amount:             u64,             // Amount of tokens contained in the leaf
    proof_of_identity:  ProofOfIdentity, /* Proof that the caller is the owner of the wallet
                                          * entitled to the tokens */
    proof_of_inclusion: Vec<[u8; 32]>, // Proof that the leaf is in the tree
}

/**
 * A proof of identity is composed by a public key and a signature except for discord where we
 * can't verify the identity in the smart contract.
 */
#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub enum ProofOfIdentity {
    Discord,
    Solana(Pubkey, Vec<u8>), // Pubkey, Signature
    Evm,
    Sui,
    Aptos,
    Cosmwasm,
}

impl ProofOfIdentity {
    pub fn verify_signature(&self) -> Result<()> {
        // TO DO Actually verify the signature here
        Ok(())
    }

    // Each leaf of the tree is a hash of the amount and the discriminator and public key of the
    // identity
    pub fn into_seed_for_leaf(&self) -> [u8; 33] {
        let mut seed = [0u8; 33];
        let discriminant: u8 = self.into();
        let pubkey = match self {
            ProofOfIdentity::Solana(pubkey, _) => pubkey.to_bytes(),
            _ => [0u8; 32],
        };
        seed.copy_from_slice(&[discriminant]);
        seed[1..33].copy_from_slice(&pubkey);
        return seed;
    }
}


/// Maybe there's a smart way to do this with macros, but I don't know how to do it.
impl Into<u8> for &ProofOfIdentity {
    fn into(self) -> u8 {
        match self {
            ProofOfIdentity::Discord => 0,
            ProofOfIdentity::Solana(_, _) => 1,
            ProofOfIdentity::Evm => 2,
            ProofOfIdentity::Sui => 3,
            ProofOfIdentity::Aptos => 4,
            ProofOfIdentity::Cosmwasm => 5,
        }
    }
}

pub fn verify_one_identity_per_ecosystem(proofs: &Vec<Proof>) -> Result<()> {
    let hash_set: HashSet<u8> = proofs
        .iter()
        .map(|proof| (&proof.proof_of_identity).into())
        .collect();
    if hash_set.len() != proofs.len() {
        return Err(ErrorCode::MoreThanOneIdentityPerEcosystem.into());
    }
    Ok(())
}

pub fn verify_inclusion(
    leaf: [u8; 32],
    merkle_proof: Vec<[u8; 32]>,
    merkle_root: [u8; 32],
) -> Result<()> {
    // TO DO
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
}
