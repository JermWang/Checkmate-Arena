use anchor_lang::prelude::*;

#[error_code]
pub enum EscrowError {
    #[msg("Stake amount below minimum.")]
    StakeBelowMinimum,

    #[msg("Stake amount above maximum.")]
    StakeAboveMaximum,

    #[msg("Mint does not match expected $CHESS mint.")]
    WrongMint,

    #[msg("Match is not in Open status.")]
    NotOpen,

    #[msg("Match is not in Live status.")]
    NotLive,

    #[msg("Challenger cannot be the creator.")]
    SelfMatch,

    #[msg("Only creator may cancel.")]
    NotCreator,

    #[msg("Cannot cancel after challenger has joined.")]
    AlreadyAccepted,

    #[msg("Caller is not the configured server authority.")]
    NotServerAuthority,

    #[msg("Math overflow.")]
    MathOverflow,

    #[msg("Vault has insufficient balance.")]
    InsufficientVault,

    #[msg("Treasury account does not match match's treasury.")]
    WrongTreasury,
}
