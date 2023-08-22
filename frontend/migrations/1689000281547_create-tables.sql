-- Up Migration
-- TODO: cosmwasm may need to be split out into one ecosystem per chain since the pubkeys are different
CREATE TYPE ecosystem_type as ENUM ('discord', 'solana', 'evm', 'sui', 'aptos', 'cosmwasm', 'injective');

-- Table for who gets what tokens with the merkle proof of each.
-- This maps on to ClaimInfo + proof of inclusion in the token_dispenser code.
CREATE TABLE "claims" (
    ecosystem ecosystem_type NOT NULL,
    -- public key if ecosystem is a blockchain, discord username otherwise
    identity TEXT NOT NULL,
    -- Amount in lamports (minimum denomination of SPL tokens)
    amount BIGINT NOT NULL,
    -- Merkle proof that the claim info for the first 3 fields is in the set.
    proof_of_inclusion BYTEA NOT NULL,
    PRIMARY KEY (ecosystem, identity)
);

-- Down Migration
