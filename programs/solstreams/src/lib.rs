use anchor_lang::prelude::*;
use std::mem::size_of;

declare_id!("STRMsoUj1u6oEhDaG6gtECiixy5fKm1sNAyALaUhSBo");

#[error_code]
pub enum EventError {
    #[msg("Invalid name")]
    InvalidName,
    #[msg("Invalid data")]
    InvalidData,
    #[msg("Invalid version")]
    InvalidVersion,
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
        if name.is_empty() {
            return Err(EventError::InvalidName.into());
        }
        let event_stream = &mut ctx.accounts.stream;
        event_stream.name = name;
        event_stream.bump = ctx.bumps.stream;
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
        version: u16,
    ) -> Result<()> {
        if name.is_empty() {
            return Err(EventError::InvalidName.into());
        }
        if data.is_empty() {
            return Err(EventError::InvalidData.into());
        }
        if version == 0 {
            return Err(EventError::InvalidVersion.into());
        }

        let event = &mut ctx.accounts.event;
        event.name = name;
        event.data = data;
        event.bump = ctx.bumps.event;
        event.stream_name = ctx.accounts.event_stream.name.clone();
        // use sysvar clock to set created
        let clock = Clock::get()?;
        event.created_at = clock.unix_timestamp;
        event.epoch = clock.epoch;
        event.version = version;

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
    // allow versioning of events. This can be useful
    // if you change your data schema and want to support
    // older schemas without being backwards compatible
    version: u16,
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
    /// owner is the owner of the stream
    #[account(mut)]
    pub owner: Signer<'info>,

    /// user is the final payer of the
    /// event creation
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut,
        // check that the owner field of Stream matches the
        // owner field of the CreateEvent instruction
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
        // the user is the final payer of the event
        payer=user,
        bump,
        space=size_of::<Event>(),
    )]
    pub event: Account<'info, Event>,

    pub system_program: Program<'info, System>,
}
