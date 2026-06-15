use anchor_lang::prelude::*;
use anchor_spl::token::{transfer, Mint, Token, TokenAccount, Transfer};

use crate::errors::EscrowError;
use crate::state::{MatchAccount, MatchStatus};

#[derive(Accounts)]
pub struct AcceptMatch<'info> {
    #[account(mut)]
    pub challenger: Signer<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [MatchAccount::SEED, match_account.match_id.as_ref()],
        bump = match_account.bump,
        constraint = match_account.status == MatchStatus::Open @ EscrowError::NotOpen,
        constraint = match_account.mint == mint.key() @ EscrowError::WrongMint,
        constraint = match_account.creator != challenger.key() @ EscrowError::SelfMatch,
    )]
    pub match_account: Account<'info, MatchAccount>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = match_account,
    )]
    pub match_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = challenger_ata.mint == mint.key(),
        constraint = challenger_ata.owner == challenger.key(),
    )]
    pub challenger_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<AcceptMatch>) -> Result<()> {
    let stake = ctx.accounts.match_account.stake_amount;

    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.challenger_ata.to_account_info(),
            to: ctx.accounts.match_vault.to_account_info(),
            authority: ctx.accounts.challenger.to_account_info(),
        },
    );
    transfer(cpi_ctx, stake)?;

    let m = &mut ctx.accounts.match_account;
    m.challenger = ctx.accounts.challenger.key();
    m.challenger_deposited = true;
    m.status = MatchStatus::Live;

    emit!(MatchAccepted {
        match_id: m.match_id,
        challenger: m.challenger,
    });

    Ok(())
}

#[event]
pub struct MatchAccepted {
    pub match_id: [u8; 16],
    pub challenger: Pubkey,
}
