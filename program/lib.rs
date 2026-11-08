// NYC LIFE: One Day in New York - on-chain daily achievement program (Anchor).
// Paste this whole file into Solana Playground (beta.solpg.io) as src/lib.rs.
// Rules MUST match game/rules.js exactly (see PLAN.md section 3.5).
use anchor_lang::prelude::*;

// Playground replaces this with your real program ID on the first Build.
declare_id!("11111111111111111111111111111111");

const START_MONEY: i32 = 20;
const START_ENERGY: i32 = 60;
const START_HAPPINESS: i32 = 50;
const BALANCED_BONUS: i32 = 50;
const MAX_ACTION_ID: u8 = 5;

#[program]
pub mod nyc_life {
    use super::*;

    /// Creates the player's record PDA. Called once per wallet.
    pub fn init_player(ctx: Context<InitPlayer>) -> Result<()> {
        let stats = &mut ctx.accounts.player_stats;
        stats.authority = ctx.accounts.authority.key();
        stats.best_score = 0;
        stats.days_completed = 0;
        stats.last_score = 0;
        stats.last_actions = [0; 3];
        stats.last_played = 0;
        // Anchor >= 0.29. On older Anchor use: *ctx.bumps.get("player_stats").unwrap()
        stats.bump = ctx.bumps.player_stats;
        Ok(())
    }

    /// Submits the 3 actions of a day. The score is computed HERE, on-chain;
    /// the client never sends a score.
    pub fn submit_day(ctx: Context<SubmitDay>, actions: [u8; 3]) -> Result<()> {
        for a in actions.iter() {
            require!(*a <= MAX_ACTION_ID, NycError::InvalidAction);
        }

        let score = compute_score(&actions);

        let stats = &mut ctx.accounts.player_stats;
        stats.days_completed = stats
            .days_completed
            .checked_add(1)
            .ok_or(NycError::Overflow)?;
        stats.last_score = score;
        stats.last_actions = actions;
        stats.last_played = Clock::get()?.unix_timestamp;

        let is_new_best = score > stats.best_score;
        if is_new_best {
            stats.best_score = score;
        }

        emit!(DayCompleted {
            player: stats.authority,
            day_number: stats.days_completed,
            actions,
            score,
            best_score: stats.best_score,
            is_new_best,
        });

        msg!("NYC LIFE day {} score {}", stats.days_completed, score);
        Ok(())
    }
}

fn clamp(v: i32) -> i32 {
    if v < 0 {
        0
    } else if v > 100 {
        100
    } else {
        v
    }
}

fn compute_score(actions: &[u8; 3]) -> u32 {
    let mut m = START_MONEY;
    let mut e = START_ENERGY;
    let mut h = START_HAPPINESS;
    let mut visited = [false; 3];

    for a in actions.iter() {
        visited[(*a / 2) as usize] = true;
        match *a {
            0 => {
                e += 40;
                h += 5;
            }
            1 => {
                if m >= 5 { m -= 5; e += 10; h += 10; } else { h -= 5; }
            }
            2 => {
                if e >= 30 { m += 60; e -= 30; h -= 10; } else { m += 25; e -= 20; h -= 20; }
            }
            3 => {
                if e >= 50 { m += 100; e -= 50; h -= 25; } else { m += 40; e -= 40; h -= 30; }
            }
            4 => {
                if m >= 15 { m -= 15; e += 15; h += 20; } else { h -= 10; }
            }
            _ => {
                // 5: hang with friends
                if m >= 10 { m -= 10; h += 30; e -= 10; } else { h += 10; e -= 10; }
            }
        }
        e = clamp(e);
        h = clamp(h);
    }

    let bonus = if visited[0] && visited[1] && visited[2] { BALANCED_BONUS } else { 0 };
    let total = m + e + 2 * h + bonus;
    if total < 0 { 0 } else { total as u32 }
}

#[derive(Accounts)]
pub struct InitPlayer<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + PlayerStats::INIT_SPACE,
        seeds = [b"player", authority.key().as_ref()],
        bump
    )]
    pub player_stats: Account<'info, PlayerStats>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitDay<'info> {
    #[account(
        mut,
        seeds = [b"player", authority.key().as_ref()],
        bump = player_stats.bump,
        has_one = authority
    )]
    pub player_stats: Account<'info, PlayerStats>,
    pub authority: Signer<'info>,
}

// Layout (after 8-byte discriminator): authority 32 | best_score u32 | days_completed u32 |
// last_score u32 | last_actions [u8;3] | last_played i64 | bump u8  => 8 + 56 = 64 bytes.
#[account]
#[derive(InitSpace)]
pub struct PlayerStats {
    pub authority: Pubkey,
    pub best_score: u32,
    pub days_completed: u32,
    pub last_score: u32,
    pub last_actions: [u8; 3],
    pub last_played: i64,
    pub bump: u8,
}

#[event]
pub struct DayCompleted {
    pub player: Pubkey,
    pub day_number: u32,
    pub actions: [u8; 3],
    pub score: u32,
    pub best_score: u32,
    pub is_new_best: bool,
}

#[error_code]
pub enum NycError {
    #[msg("Action id must be between 0 and 5")]
    InvalidAction,
    #[msg("Counter overflow")]
    Overflow,
}
