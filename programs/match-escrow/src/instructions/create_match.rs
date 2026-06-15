use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{transfer, Mint, Token, TokenAccount, Transfer},
};

use crate::errors::EscrowError;
use crate::state::{MatchAccount, MatchStatus};

pub const MIN_STAKE: u64 = 10_000_000;          // 10 $CHESS @ 6 decimals
pub const MAX_STAKE: u64 = 1_000_000_000_000;   // 1,000,000 $CHESS @ 6 decimals

#[derive(Accounts)]
#[instruction(match_id: [u8; 16])]
pub struct CreateMatch<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    /// CHECK: server authority pubkey is stored on the match for later validation.
    /// Provided as plain Pubkey (not signer here — only signs on settle).
    pub server_authority: UncheckedAccount<'info>,

    /// CHECK: treasury PDA, validated at settle time.
    pub treasury: UncheckedAccount<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer = creator,
        space = MatchAccount::LEN,
        seeds = [MatchAccount::SEED, match_id.as_ref()],
        bump,
    )]
    pub match_account: Account<'info, MatchAccount>,

    #[account(
        init,
        payer = creator,
        associated_token::mint = mint,
        associated_token::authority = match_account,
    )]
    pub match_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = creator_ata.mint == mint.key(),
        constraint = creator_ata.owner == creator.key(),
    )]
    pub creator_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<CreateMatch>,
    match_id: [u8; 16],
    stake_amount: u64,
    is_private: bool,
) -> Result<()> {
    require!(stake_amount >= MIN_STAKE, EscrowError::StakeBelowMinimum);
    require!(stake_amount <= MAX_STAKE, EscrowError::StakeAboveMaximum);

    // Lock creator's stake into vault.
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.creator_ata.to_account_info(),
            to: ctx.accounts.match_vault.to_account_info(),
            authority: ctx.accounts.creator.to_account_info(),
        },
    );
    transfer(cpi_ctx, stake_amount)?;

    let m = &mut ctx.accounts.match_account;
    m.match_id = match_id;
    m.mint = ctx.accounts.mint.key();
    m.stake_amount = stake_amount;
    m.creator = ctx.accounts.creator.key();
    m.challenger = Pubkey::default();
    m.server_authority = ctx.accounts.server_authority.key();
    m.treasury = ctx.accounts.treasury.key();
    m.creator_deposited = true;
    m.challenger_deposited = false;
    m.status = MatchStatus::Open;
    m.is_private = is_private;
    m.created_at = Clock::get()?.unix_timestamp;
    m.bump = ctx.bumps.match_account;

    emit!(MatchCreated {
        match_id,
        creator: m.creator,
        stake_amount,
        mint: m.mint,
        is_private,
    });

    Ok(())
}

#[event]
pub struct MatchCreated {
    pub match_id: [u8; 16],
    pub creator: Pubkey,
    pub stake_amount: u64,
    pub mint: Pubkey,
    pub is_private: bool,
}
