use anchor_lang::prelude::*;

/// House fee in basis points (2%).
pub const RAKE_BPS: u64 = 200;
pub const BPS_DENOMINATOR: u64 = 10_000;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum MatchStatus {
    Open,
    Live,
    Settled,
    Cancelled,
}

#[account]
pub struct MatchAccount {
    /// 16-byte UUID (client-generated). PDA seed.
    pub match_id: [u8; 16],

    /// SPL mint of the stake token (must equal expected $CHESS mint).
    pub mint: Pubkey,

    /// Stake required from EACH side (so total pot = 2 * stake_amount).
    pub stake_amount: u64,

    /// Creator wallet.
    pub creator: Pubkey,

    /// Challenger wallet (Pubkey::default() until accepted).
    pub challenger: Pubkey,

    /// Server's settle-authority pubkey (set at create time).
    pub server_authority: Pubkey,

    /// Treasury PDA that receives the house fee.
    pub treasury: Pubkey,

    /// True once creator deposit completed.
    pub creator_deposited: bool,

    /// True once challenger deposit completed.
    pub challenger_deposited: bool,

    /// Lifecycle status.
    pub status: MatchStatus,

    /// Private vs public match flag (informational; doesn't change escrow logic).
    pub is_private: bool,

    /// Unix timestamp at create.
    pub created_at: i64,

    /// Bump of this PDA.
    pub bump: u8,
}

impl MatchAccount {
    pub const SEED: &'static [u8] = b"match";

    // Size: 8 disc + 16 + 32 + 8 + 32 + 32 + 32 + 32 + 1 + 1 + 1 + 1 + 8 + 1
    pub const LEN: usize = 8 + 16 + 32 + 8 + 32 + 32 + 32 + 32 + 1 + 1 + 1 + 1 + 8 + 1;
}
