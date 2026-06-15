use anchor_lang::prelude::*;
use anchor_spl::token::{transfer, Mint, Token, TokenAccount, Transfer};

use crate::errors::EscrowError;
use crate::state::{MatchAccount, MatchStatus};

/// Emergency-only: refund both sides their original stake without rake.
/// Reserved for stuck matches (e.g., server outage exceeding grace window)
/// and dispute resolutions where neither party is at fault.
#[derive(Accounts)]
pub struct ForceRefund<'info> {
    #[account(
        constraint = server_authority.key() == match_account.server_authority @ EscrowError::NotServerAuthority,
    )]
    pub server_authority: Signer<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [MatchAccount::SEED, match_account.match_id.as_ref()],
        bump = match_account.bump,
        constraint = match_account.status == MatchStatus::Live @ EscrowError::NotLive,
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
        constraint = creator_ata.owner == match_account.creator,
    )]
    pub creator_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = challenger_ata.mint == mint.key(),
        constraint = challenger_ata.owner == match_account.challenger,
    )]
    pub challenger_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ForceRefund>) -> Result<()> {
    let amount = ctx.accounts.match_account.stake_amount;
    let match_id = ctx.accounts.match_account.match_id;
    let bump = ctx.accounts.match_account.bump;
    let seeds = &[MatchAccount::SEED, match_id.as_ref(), &[bump]];
    let signer = &[&seeds[..]];

    // Refund creator.
    let cpi = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.match_vault.to_account_info(),
            to: ctx.accounts.creator_ata.to_account_info(),
            authority: ctx.accounts.match_account.to_account_info(),
        },
        signer,
    );
    transfer(cpi, amount)?;

    // Refund challenger.
    let cpi = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.match_vault.to_account_info(),
            to: ctx.accounts.challenger_ata.to_account_info(),
            authority: ctx.accounts.match_account.to_account_info(),
        },
        signer,
    );
    transfer(cpi, amount)?;

    ctx.accounts.match_account.status = MatchStatus::Cancelled;

    emit!(MatchForceRefunded { match_id });
    Ok(())
}

#[event]
pub struct MatchForceRefunded {
    pub match_id: [u8; 16],
}
