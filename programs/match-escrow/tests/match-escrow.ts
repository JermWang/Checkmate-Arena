import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MatchEscrow } from "../target/types/match_escrow";
import {
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { randomBytes } from "crypto";
import { assert } from "chai";

describe("match-escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.MatchEscrow as Program<MatchEscrow>;

  const STAKE = new anchor.BN(1_000_000_000); // 1000 $CHESS @ 6 decimals
  const HOUSE_FEE_BPS = 200n;

  let mint: PublicKey;
  let creator: Keypair;
  let challenger: Keypair;
  let serverAuthority: Keypair;
  let treasury: Keypair;
  let creatorAta: PublicKey;
  let challengerAta: PublicKey;
  let treasuryAta: PublicKey;

  before(async () => {
    creator = Keypair.generate();
    challenger = Keypair.generate();
    serverAuthority = Keypair.generate();
    treasury = Keypair.generate();

    await airdrop(provider, creator.publicKey, 2);
    await airdrop(provider, challenger.publicKey, 2);
    await airdrop(provider, serverAuthority.publicKey, 2);

    mint = await createMint(
      provider.connection,
      creator,
      creator.publicKey,
      null,
      6
    );

    creatorAta = await createAssociatedTokenAccount(
      provider.connection,
      creator,
      mint,
      creator.publicKey
    );
    challengerAta = await createAssociatedTokenAccount(
      provider.connection,
      challenger,
      mint,
      challenger.publicKey
    );
    treasuryAta = await createAssociatedTokenAccount(
      provider.connection,
      creator,
      mint,
      treasury.publicKey
    );

    await mintTo(provider.connection, creator, mint, creatorAta, creator, 5_000_000_000n);
    await mintTo(provider.connection, creator, mint, challengerAta, creator, 5_000_000_000n);
  });

  it("happy path: create → accept → settle (creator wins) pays correct house fee + payout", async () => {
    const matchId = Array.from(randomBytes(16));
    const [matchPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("match"), Buffer.from(matchId)],
      program.programId
    );
    const matchVault = getAssociatedTokenAddressSync(mint, matchPda, true);

    await program.methods
      .createMatch(matchId, STAKE, false)
      .accounts({
        creator: creator.publicKey,
        serverAuthority: serverAuthority.publicKey,
        treasury: treasury.publicKey,
        mint,
        matchAccount: matchPda,
        matchVault,
        creatorAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([creator])
      .rpc();

    await program.methods
      .acceptMatch()
      .accounts({
        challenger: challenger.publicKey,
        mint,
        matchAccount: matchPda,
        matchVault,
        challengerAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([challenger])
      .rpc();

    const creatorBefore = (await getAccount(provider.connection, creatorAta)).amount;
    const treasuryBefore = (await getAccount(provider.connection, treasuryAta)).amount;

    await program.methods
      .settleMatch({ creatorWins: {} } as any)
      .accounts({
        serverAuthority: serverAuthority.publicKey,
        mint,
        matchAccount: matchPda,
        matchVault,
        creatorAta,
        challengerAta,
        treasuryAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([serverAuthority])
      .rpc();

    const pot = BigInt(STAKE.toString()) * 2n;
    const houseFee = (pot * HOUSE_FEE_BPS) / 10_000n;
    const net = pot - houseFee;

    const creatorAfter = (await getAccount(provider.connection, creatorAta)).amount;
    const treasuryAfter = (await getAccount(provider.connection, treasuryAta)).amount;

    assert.equal(creatorAfter - creatorBefore, net, "creator should receive pot net of rake");
    assert.equal(treasuryAfter - treasuryBefore, houseFee, "treasury should receive house fee");
  });

  it("rejects accept_match when challenger == creator", async () => {
    const matchId = Array.from(randomBytes(16));
    const [matchPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("match"), Buffer.from(matchId)],
      program.programId
    );
    const matchVault = getAssociatedTokenAddressSync(mint, matchPda, true);

    await program.methods
      .createMatch(matchId, STAKE, false)
      .accounts({
        creator: creator.publicKey,
        serverAuthority: serverAuthority.publicKey,
        treasury: treasury.publicKey,
        mint,
        matchAccount: matchPda,
        matchVault,
        creatorAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([creator])
      .rpc();

    try {
      await program.methods
        .acceptMatch()
        .accounts({
          challenger: creator.publicKey,
          mint,
          matchAccount: matchPda,
          matchVault,
          challengerAta: creatorAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([creator])
        .rpc();
      assert.fail("should have rejected self-match");
    } catch (e: any) {
      assert.include(e.toString().toLowerCase(), "selfmatch");
    }
  });

  it("cancel_match refunds creator", async () => {
    const matchId = Array.from(randomBytes(16));
    const [matchPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("match"), Buffer.from(matchId)],
      program.programId
    );
    const matchVault = getAssociatedTokenAddressSync(mint, matchPda, true);

    const before = (await getAccount(provider.connection, creatorAta)).amount;

    await program.methods
      .createMatch(matchId, STAKE, true)
      .accounts({
        creator: creator.publicKey,
        serverAuthority: serverAuthority.publicKey,
        treasury: treasury.publicKey,
        mint,
        matchAccount: matchPda,
        matchVault,
        creatorAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([creator])
      .rpc();

    await program.methods
      .cancelMatch()
      .accounts({
        creator: creator.publicKey,
        mint,
        matchAccount: matchPda,
        matchVault,
        creatorAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([creator])
      .rpc();

    const after = (await getAccount(provider.connection, creatorAta)).amount;
    assert.equal(after, before, "creator should be refunded to original balance");
  });
});

async function airdrop(
  provider: anchor.AnchorProvider,
  pubkey: PublicKey,
  sol: number
) {
  const sig = await provider.connection.requestAirdrop(
    pubkey,
    sol * anchor.web3.LAMPORTS_PER_SOL
  );
  await provider.connection.confirmTransaction(sig);
}
