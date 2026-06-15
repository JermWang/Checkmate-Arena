use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("2PicFGu1K2LztiAy7pWs7o1grfTsvm93jSgmthcfXx4U");

#[program]
pub mod match_escrow {
    use super::*;

    /// Initializes a match PDA and locks the creator's stake into the match vault.
    /// `match_id` is a client-generated 16-byte UUID. `stake_amount` is in mint base units.
    pub fn create_match(
        ctx: Context<CreateMatch>,
        match_id: [u8; 16],
        stake_amount: u64,
        is_private: bool,
    ) -> Result<()> {
        instructions::create_match::handler(ctx, match_id, stake_amount, is_private)
    }

    /// Challenger locks their matching stake. Match transitions to Live.
    pub fn accept_match(ctx: Context<AcceptMatch>) -> Result<()> {
        instructions::accept_match::handler(ctx)
    }

    /// Creator-initiated cancellation. Only valid pre-acceptance. Full refund.
    pub fn cancel_match(ctx: Context<CancelMatch>) -> Result<()> {
        instructions::cancel_match::handler(ctx)
    }

    /// Server-authority-only settlement. Pays winner minus house fee, or splits net pot on draw.
    pub fn settle_match(ctx: Context<SettleMatch>, result: MatchResult) -> Result<()> {
        instructions::settle_match::handler(ctx, result)
    }

    /// Emergency refund — server-authority-only. Used for stuck/disputed matches.
    pub fn force_refund(ctx: Context<ForceRefund>) -> Result<()> {
        instructions::force_refund::handler(ctx)
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum MatchResult {
    CreatorWins,
    ChallengerWins,
    Draw,
}
