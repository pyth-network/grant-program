use anchor_lang::prelude::Pubkey;
use rand::distributions::{Alphanumeric, DistString};
use crate::{ecosystems::discord::DiscordMessage, Identity, IdentityCertificate};

use super::test_ed25519::Ed25519TestIdentityCertificate;
