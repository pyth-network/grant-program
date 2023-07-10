-- Up Migration
CREATE TYPE ecosystem_type as ENUM ('discord','solana', 'evm', 'sui', 'aptos', 'cosmwasm', 'kyc');

CREATE TABLE "amounts" (
    ecosystem ecosystem_type NOT NULL,
    identity TEXT NOT NULL,
    amount BIGINT NOT NULL,
    claimant TEXT,
    PRIMARY KEY (ecosystem, identity)
);


CREATE TABLE "authentications" (
    ecosystem ecosystem_type NOT NULL,
    identity TEXT NOT NULL,
    solana_pubkey TEXT NOT NULL,
    signature TEXT,
    message TEXT
)
-- Down Migration
