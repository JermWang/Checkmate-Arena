use anchor_lang::prelude::*;
use anchor_spl::token::{transfer, Mint, Token, TokenAccount, Transfer};

use crate::errors::EscrowError;
use crate::state::{MatchAccount, MatchStatus};

#[derive(Accounts)]
pub struct CancelMatch<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [MatchAccount::SEED, match_account.match_id.as_ref()],
        bump = match_account.bump,
        constraint = match_account.status == MatchStatus::Open @ EscrowError::NotOpen,
        constraint = match_account.creator == creator.key() @ EscrowError::NotCreator,
        constraint = !match_account.challenger_deposited @ EscrowError::AlreadyAccepted,
        constraint = match_account.mint == mint.key() @ EscrowError::WrongMint,
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
        constraint = creator_ata.mint == mint.key(),
        constraint = creator_ata.owner == creator.key(),
    )]
    pub creator_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<CancelMatch>) -> Result<()> {
    let amount = ctx.accounts.match_account.stake_amount;
    let match_id = ctx.accounts.match_account.match_id;
    let bump = ctx.accounts.match_account.bump;

    let seeds = &[MatchAccount::SEED, match_id.as_ref(), &[bump]];
    let signer = &[&seeds[..]];

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.match_vault.to_account_info(),
            to: ctx.accounts.creator_ata.to_account_info(),
            authority: ctx.accounts.match_account.to_account_info(),
        },
        signer,
    );
    transfer(cpi_ctx, amount)?;

    ctx.accounts.match_account.status = MatchStatus::Cancelled;

    emit!(MatchCancelled { match_id });
    Ok(())
}

#[event]
pub struct MatchCancelled {
    pub match_id: [u8; 16],
}
