export type Solstreams = {
  "version": "0.1.0",
  "name": "solstreams",
  "instructions": [
    {
      "name": "createEventStream",
      "docs": [
        "create_event_stream lets anyone create a stream with name `name`",
        "Input accounts are",
        "* signer - the signer of the transaction",
        "* stream - the stream account to be created",
        "* system_program - the system program"
      ],
      "accounts": [
        {
          "name": "signer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "stream",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        }
      ]
    },
    {
      "name": "createEvent",
      "docs": [
        "create_event lets the owner of the stream create an event on a stream",
        "Input accounts are",
        "* owner - the signer of the transaction",
        "* event_stream - the stream account to create the event on",
        "* event - the event account to be created",
        "* system_program - the system program"
      ],
      "accounts": [
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true,
          "docs": [
            "owner is the owner of the stream"
          ]
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true,
          "docs": [
            "user is the final payer of the",
            "event creation"
          ]
        },
        {
          "name": "eventStream",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "event",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "nonce",
          "type": "bytes"
        },
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "data",
          "type": "bytes"
        },
        {
          "name": "version",
          "type": "u16"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "event",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "epoch",
            "type": "u64"
          },
          {
            "name": "streamName",
            "type": "string"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "version",
            "type": "u16"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "data",
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "stream",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "owner",
            "type": "publicKey"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "WrongStreamOwner",
      "msg": "Wrong stream owner"
    }
  ]
};

export const IDL: Solstreams = {
  "version": "0.1.0",
  "name": "solstreams",
  "instructions": [
    {
      "name": "createEventStream",
      "docs": [
        "create_event_stream lets anyone create a stream with name `name`",
        "Input accounts are",
        "* signer - the signer of the transaction",
        "* stream - the stream account to be created",
        "* system_program - the system program"
      ],
      "accounts": [
        {
          "name": "signer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "stream",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        }
      ]
    },
    {
      "name": "createEvent",
      "docs": [
        "create_event lets the owner of the stream create an event on a stream",
        "Input accounts are",
        "* owner - the signer of the transaction",
        "* event_stream - the stream account to create the event on",
        "* event - the event account to be created",
        "* system_program - the system program"
      ],
      "accounts": [
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true,
          "docs": [
            "owner is the owner of the stream"
          ]
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true,
          "docs": [
            "user is the final payer of the",
            "event creation"
          ]
        },
        {
          "name": "eventStream",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "event",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "nonce",
          "type": "bytes"
        },
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "data",
          "type": "bytes"
        },
        {
          "name": "version",
          "type": "u16"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "event",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "epoch",
            "type": "u64"
          },
          {
            "name": "streamName",
            "type": "string"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "version",
            "type": "u16"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "data",
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "stream",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "owner",
            "type": "publicKey"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "WrongStreamOwner",
      "msg": "Wrong stream owner"
    }
  ]
};
