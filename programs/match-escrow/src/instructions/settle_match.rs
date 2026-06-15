use anchor_lang::prelude::*;
use anchor_spl::token::{transfer, Mint, Token, TokenAccount, Transfer};

use crate::errors::EscrowError;
use crate::state::{MatchAccount, MatchStatus, BPS_DENOMINATOR, RAKE_BPS};
use crate::MatchResult;

#[derive(Accounts)]
pub struct SettleMatch<'info> {
    /// The single keypair allowed to settle (stored in KMS server-side).
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

    /// Rake destination (ATA owned by the treasury PDA stored on the match).
    #[account(
        mut,
        constraint = treasury_ata.mint == mint.key(),
        constraint = treasury_ata.owner == match_account.treasury @ EscrowError::WrongTreasury,
    )]
    pub treasury_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<SettleMatch>, result: MatchResult) -> Result<()> {
    let m = &ctx.accounts.match_account;
    let pot = m
        .stake_amount
        .checked_mul(2)
        .ok_or(EscrowError::MathOverflow)?;
    let rake = pot
        .checked_mul(RAKE_BPS)
        .ok_or(EscrowError::MathOverflow)?
        .checked_div(BPS_DENOMINATOR)
        .ok_or(EscrowError::MathOverflow)?;

    require!(
        ctx.accounts.match_vault.amount >= pot,
        EscrowError::InsufficientVault
    );

    let match_id = m.match_id;
    let bump = m.bump;
    let seeds = &[MatchAccount::SEED, match_id.as_ref(), &[bump]];
    let signer = &[&seeds[..]];

    // Always pay rake to treasury first.
    pay(
        &ctx.accounts.token_program,
        &ctx.accounts.match_vault,
        &ctx.accounts.treasury_ata,
        &ctx.accounts.match_account,
        signer,
        rake,
    )?;

    let net = pot.checked_sub(rake).ok_or(EscrowError::MathOverflow)?;

    match result {
        MatchResult::CreatorWins => {
            pay(
                &ctx.accounts.token_program,
                &ctx.accounts.match_vault,
                &ctx.accounts.creator_ata,
                &ctx.accounts.match_account,
                signer,
                net,
            )?;
        }
        MatchResult::ChallengerWins => {
            pay(
                &ctx.accounts.token_program,
                &ctx.accounts.match_vault,
                &ctx.accounts.challenger_ata,
                &ctx.accounts.match_account,
                signer,
                net,
            )?;
        }
        MatchResult::Draw => {
            let half = net.checked_div(2).ok_or(EscrowError::MathOverflow)?;
            pay(
                &ctx.accounts.token_program,
                &ctx.accounts.match_vault,
                &ctx.accounts.creator_ata,
                &ctx.accounts.match_account,
                signer,
                half,
            )?;
            // remainder catches odd lamports if net is odd
            let remainder = net.checked_sub(half).ok_or(EscrowError::MathOverflow)?;
            pay(
                &ctx.accounts.token_program,
                &ctx.accounts.match_vault,
                &ctx.accounts.challenger_ata,
                &ctx.accounts.match_account,
                signer,
                remainder,
            )?;
        }
    }

    ctx.accounts.match_account.status = MatchStatus::Settled;

    emit!(MatchSettled {
        match_id,
        result,
        pot,
        rake,
    });

    Ok(())
}

fn pay<'info>(
    token_program: &Program<'info, Token>,
    from: &Account<'info, TokenAccount>,
    to: &Account<'info, TokenAccount>,
    authority: &Account<'info, MatchAccount>,
    signer: &[&[&[u8]]],
    amount: u64,
) -> Result<()> {
    if amount == 0 {
        return Ok(());
    }
    let cpi = CpiContext::new_with_signer(
        token_program.to_account_info(),
        Transfer {
            from: from.to_account_info(),
            to: to.to_account_info(),
            authority: authority.to_account_info(),
        },
        signer,
    );
    transfer(cpi, amount)
}

#[event]
pub struct MatchSettled {
    pub match_id: [u8; 16],
    pub result: MatchResult,
    pub pot: u64,
    pub rake: u64,
}
