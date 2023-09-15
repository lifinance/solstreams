use anchor_lang::prelude::*;
use std::mem::size_of;

declare_id!("strMZGgbP9ZSv61K14burRv5LnWmb1YDTuvjyJK5KVV");

#[error_code]
pub enum EventError {
    #[msg("Wrong stream owner")]
    WrongStreamOwner,
}

#[program]
pub mod solstreams {

    use super::*;

    /// create_event_stream lets anyone create a stream with name `name`
    /// Input accounts are
    /// * signer - the signer of the transaction
    /// * stream - the stream account to be created
    /// * system_program - the system program
    pub fn create_event_stream(ctx: Context<CreateEventStream>, name: String) -> Result<()> {
        let event_stream = &mut ctx.accounts.stream;
        event_stream.name = name;
        event_stream.bump = ctx.bumps["stream"];
        event_stream.owner = *ctx.accounts.signer.key;

        // use sysvar clock to set created
        let clock = Clock::get()?;
        event_stream.created_at = clock.unix_timestamp;

        Ok(())
    }

    /// create_event lets the owner of the stream create an event on a stream
    /// Input accounts are
    /// * owner - the signer of the transaction
    /// * event_stream - the stream account to create the event on
    /// * event - the event account to be created
    /// * system_program - the system program
    pub fn create_event(
        ctx: Context<CreateEvent>,
        _nonce: Vec<u8>,
        name: String,
        data: Vec<u8>,
    ) -> Result<()> {
        let event = &mut ctx.accounts.event;
        event.name = name;
        event.data = data;
        event.bump = ctx.bumps["event"];
        event.stream_name = ctx.accounts.event_stream.name.clone();
        // use sysvar clock to set created
        let clock = Clock::get()?;
        event.created_at = clock.unix_timestamp;
        event.epoch = clock.epoch;

        Ok(())
    }
}

#[account]
pub struct Event {
    // epoch is used for searching for events using memcmp
    epoch: u64,
    // stream_name is used for searching for events using memcmp
    stream_name: String,
    // name of the event
    name: String,
    // when the event was created. Immutable
    created_at: i64,
    // bump seed for the stream
    bump: u8,
    // a buffer of data
    data: Vec<u8>,
}

#[account]
pub struct Stream {
    // unique name of the stream
    name: String,
    // the creator of the stream. The owner is the only one who can create events on the stream
    owner: Pubkey,
    // bump seed for the stream
    // when the stream was created. Immutable
    created_at: i64,
    bump: u8,
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct CreateEventStream<'info> {
    // creator of the stream
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init,
        payer = signer,
        seeds = [
            b"solstream".as_ref(),
            b"stream".as_ref(),
            name.as_bytes(),
        ],
        bump,
        space = size_of::<Stream>(),
    )]
    pub stream: Account<'info, Stream>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(
    nonce: Vec<u8>,
)]
/// CreateEvent is used to create an event on a stream
pub struct CreateEvent<'info> {
    /// owner must match the owner of the stream
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut,
        has_one=owner @ EventError::WrongStreamOwner,
        seeds=[
            b"solstream".as_ref(),
            b"stream".as_ref(),
            event_stream.name.as_bytes(),
        ],
        bump=event_stream.bump,
    )]
    pub event_stream: Account<'info, Stream>,

    #[account(
        init,
        seeds=[
            b"solstream".as_ref(),
            b"events".as_ref(),
            event_stream.key().as_ref(),
            nonce.as_ref(),
        ],
        payer=owner,
        bump,
        space=size_of::<Event>(),
    )]
    pub event: Account<'info, Event>,

    pub system_program: Program<'info, System>,
}
