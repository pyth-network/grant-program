export type TokenDispenser = {
  version: '0.1.0'
  name: 'token_dispenser'
  instructions: [
    {
      name: 'initialize'
      docs: [
        'This can only be called once and should be called right after the program is deployed.'
      ]
      accounts: [
        {
          name: 'payer'
          isMut: true
          isSigner: true
        },
        {
          name: 'config'
          isMut: true
          isSigner: false
        },
        {
          name: 'mint'
          isMut: false
          isSigner: false
          docs: ['Mint of the treasury']
        },
        {
          name: 'treasury'
          isMut: false
          isSigner: false
          docs: [
            'Treasury token account. This is an externally owned token account and',
            'the owner of this account will approve the config as a delegate using the',
            'solana CLI command `spl-token approve <treasury_account_address> <approve_amount> <config_address>`'
          ]
        },
        {
          name: 'systemProgram'
          isMut: false
          isSigner: false
        }
      ]
      args: [
        {
          name: 'merkleRoot'
          type: {
            array: ['u8', 32]
          }
        },
        {
          name: 'dispenserGuard'
          type: 'publicKey'
        }
      ]
    },
    {
      name: 'claim'
      docs: [
        "* Claim a claimant's tokens. This instructions needs to enforce :\n     * - The dispenser guard has signed the transaction - DONE\n     * - The claimant is claiming no more than once per ecosystem - DONE\n     * - The claimant has provided a valid proof of identity (is the owner of the wallet\n     *   entitled to the tokens)\n     * - The claimant has provided a valid proof of inclusion (this confirm that the claimant --\n     *   DONE\n     * - The claimant has not already claimed tokens -- DONE"
      ]
      accounts: [
        {
          name: 'claimant'
          isMut: true
          isSigner: true
        },
        {
          name: 'dispenserGuard'
          isMut: false
          isSigner: true
        },
        {
          name: 'config'
          isMut: false
          isSigner: false
        },
        {
          name: 'cart'
          isMut: true
          isSigner: false
        },
        {
          name: 'systemProgram'
          isMut: false
          isSigner: false
        },
        {
          name: 'sysvarInstruction'
          isMut: false
          isSigner: false
          docs: [
            "CHECK : Anchor wants me to write this comment because I'm using AccountInfo which doesn't check for ownership and doesn't deserialize the account automatically. But it's fine because I check the address and I load it using load_instruction_at_checked."
          ]
        }
      ]
      args: [
        {
          name: 'claimCertificates'
          type: {
            vec: {
              defined: 'ClaimCertificate'
            }
          }
        }
      ]
    },
    {
      name: 'checkout'
      accounts: [
        {
          name: 'claimant'
          isMut: true
          isSigner: true
        },
        {
          name: 'config'
          isMut: false
          isSigner: false
        },
        {
          name: 'mint'
          isMut: false
          isSigner: false
          docs: [
            'Mint of the treasury & claimant_fund token account.',
            'Needed if the `claimant_fund` token account needs to be initialized'
          ]
        },
        {
          name: 'treasury'
          isMut: true
          isSigner: false
        },
        {
          name: 'cart'
          isMut: true
          isSigner: false
        },
        {
          name: 'claimantFund'
          isMut: true
          isSigner: false
          docs: [
            "Claimant's associated token account for receiving their claim/token grant"
          ]
        },
        {
          name: 'systemProgram'
          isMut: false
          isSigner: false
        },
        {
          name: 'tokenProgram'
          isMut: false
          isSigner: false
        },
        {
          name: 'associatedTokenProgram'
          isMut: false
          isSigner: false
        }
      ]
      args: []
    }
  ]
  accounts: [
    {
      name: 'Config'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'bump'
            type: 'u8'
          },
          {
            name: 'merkleRoot'
            type: {
              array: ['u8', 32]
            }
          },
          {
            name: 'dispenserGuard'
            type: 'publicKey'
          },
          {
            name: 'mint'
            type: 'publicKey'
          },
          {
            name: 'treasury'
            type: 'publicKey'
          }
        ]
      }
    },
    {
      name: 'Receipt'
      type: {
        kind: 'struct'
        fields: []
      }
    },
    {
      name: 'Cart'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'amount'
            type: 'u64'
          },
          {
            name: 'set'
            type: {
              defined: 'ClaimedEcosystems'
            }
          }
        ]
      }
    }
  ]
  types: [
    {
      name: 'Ed25519InstructionHeader'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'numSignatures'
            type: 'u8'
          },
          {
            name: 'padding'
            type: 'u8'
          },
          {
            name: 'signatureOffset'
            type: 'u16'
          },
          {
            name: 'signatureInstructionIndex'
            type: 'u16'
          },
          {
            name: 'publicKeyOffset'
            type: 'u16'
          },
          {
            name: 'publicKeyInstructionIndex'
            type: 'u16'
          },
          {
            name: 'messageDataOffset'
            type: 'u16'
          },
          {
            name: 'messageDataSize'
            type: 'u16'
          },
          {
            name: 'messageInstructionIndex'
            type: 'u16'
          }
        ]
      }
    },
    {
      name: 'Secp256k1InstructionHeader'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'numSignatures'
            type: 'u8'
          },
          {
            name: 'signatureOffset'
            type: 'u16'
          },
          {
            name: 'signatureInstructionIndex'
            type: 'u8'
          },
          {
            name: 'ethAddressOffset'
            type: 'u16'
          },
          {
            name: 'ethAddressInstructionIndex'
            type: 'u8'
          },
          {
            name: 'messageDataOffset'
            type: 'u16'
          },
          {
            name: 'messageDataSize'
            type: 'u16'
          },
          {
            name: 'messageInstructionIndex'
            type: 'u8'
          }
        ]
      }
    },
    {
      name: 'ClaimInfo'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'identity'
            type: {
              defined: 'Identity'
            }
          },
          {
            name: 'amount'
            type: 'u64'
          }
        ]
      }
    },
    {
      name: 'ClaimCertificate'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'amount'
            type: 'u64'
          },
          {
            name: 'proofOfIdentity'
            type: {
              defined: 'IdentityCertificate'
            }
          },
          {
            name: 'proofOfInclusion'
            type: {
              vec: {
                array: ['u8', 32]
              }
            }
          }
        ]
      }
    },
    {
      name: 'ClaimedEcosystems'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'set'
            type: {
              array: ['bool', 6]
            }
          }
        ]
      }
    },
    {
      name: 'Identity'
      docs: [
        "* This is the identity that the claimant will use to claim tokens.\n * A claimant can claim tokens for 1 identity on each ecosystem.\n * Typically for a blockchain it is a public key in the blockchain's address space."
      ]
      type: {
        kind: 'enum'
        variants: [
          {
            name: 'Discord'
            fields: [
              {
                name: 'username'
                type: 'string'
              }
            ]
          },
          {
            name: 'Solana'
            fields: [
              {
                name: 'pubkey'
                type: {
                  array: ['u8', 32]
                }
              }
            ]
          },
          {
            name: 'Evm'
            fields: [
              {
                name: 'pubkey'
                type: {
                  array: ['u8', 20]
                }
              }
            ]
          },
          {
            name: 'Sui'
            fields: [
              {
                name: 'address'
                type: {
                  array: ['u8', 32]
                }
              }
            ]
          },
          {
            name: 'Aptos'
            fields: [
              {
                name: 'address'
                type: {
                  array: ['u8', 32]
                }
              }
            ]
          },
          {
            name: 'Cosmwasm'
            fields: [
              {
                name: 'address'
                type: 'string'
              }
            ]
          }
        ]
      }
    },
    {
      name: 'IdentityCertificate'
      type: {
        kind: 'enum'
        variants: [
          {
            name: 'Discord'
            fields: [
              {
                name: 'username'
                type: 'string'
              }
            ]
          },
          {
            name: 'Evm'
            fields: [
              {
                name: 'pubkey'
                type: {
                  array: ['u8', 20]
                }
              },
              {
                name: 'verification_instruction_index'
                type: 'u8'
              }
            ]
          },
          {
            name: 'Solana'
            fields: [
              {
                name: 'pubkey'
                type: {
                  array: ['u8', 32]
                }
              },
              {
                name: 'verification_instruction_index'
                type: 'u8'
              }
            ]
          },
          {
            name: 'Sui'
            fields: [
              {
                name: 'pubkey'
                type: {
                  array: ['u8', 32]
                }
              },
              {
                name: 'verification_instruction_index'
                type: 'u8'
              }
            ]
          },
          {
            name: 'Aptos'
            fields: [
              {
                name: 'pubkey'
                type: {
                  array: ['u8', 32]
                }
              },
              {
                name: 'verification_instruction_index'
                type: 'u8'
              }
            ]
          },
          {
            name: 'Cosmwasm'
            fields: [
              {
                name: 'chain_id'
                type: 'string'
              },
              {
                name: 'signature'
                type: {
                  array: ['u8', 64]
                }
              },
              {
                name: 'recovery_id'
                type: 'u8'
              },
              {
                name: 'pubkey'
                type: {
                  array: ['u8', 65]
                }
              },
              {
                name: 'message'
                type: 'bytes'
              }
            ]
          }
        ]
      }
    }
  ]
  errors: [
    {
      code: 6000
      name: 'ArithmeticOverflow'
    },
    {
      code: 6001
      name: 'MoreThanOneIdentityPerEcosystem'
    },
    {
      code: 6002
      name: 'AlreadyClaimed'
    },
    {
      code: 6003
      name: 'InvalidInclusionProof'
    },
    {
      code: 6004
      name: 'WrongPda'
    },
    {
      code: 6005
      name: 'NotImplemented'
    },
    {
      code: 6006
      name: 'InsufficientTreasuryFunds'
    },
    {
      code: 6007
      name: 'SignatureVerificationWrongProgram'
    },
    {
      code: 6008
      name: 'SignatureVerificationWrongAccounts'
    },
    {
      code: 6009
      name: 'SignatureVerificationWrongHeader'
    },
    {
      code: 6010
      name: 'SignatureVerificationWrongPayload'
    },
    {
      code: 6011
      name: 'SignatureVerificationWrongPayloadMetadata'
    },
    {
      code: 6012
      name: 'SignatureVerificationWrongSigner'
    },
    {
      code: 6013
      name: 'SignatureVerificationWrongClaimant'
    }
  ]
}
export const IDL: TokenDispenser = {
  version: '0.1.0',
  name: 'token_dispenser',
  instructions: [
    {
      name: 'initialize',
      docs: [
        'This can only be called once and should be called right after the program is deployed.',
      ],
      accounts: [
        {
          name: 'payer',
          isMut: true,
          isSigner: true,
        },
        {
          name: 'config',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'mint',
          isMut: false,
          isSigner: false,
          docs: ['Mint of the treasury'],
        },
        {
          name: 'treasury',
          isMut: false,
          isSigner: false,
          docs: [
            'Treasury token account. This is an externally owned token account and',
            'the owner of this account will approve the config as a delegate using the',
            'solana CLI command `spl-token approve <treasury_account_address> <approve_amount> <config_address>`',
          ],
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'merkleRoot',
          type: {
            array: ['u8', 32],
          },
        },
        {
          name: 'dispenserGuard',
          type: 'publicKey',
        },
      ],
    },
    {
      name: 'claim',
      docs: [
        "* Claim a claimant's tokens. This instructions needs to enforce :\n     * - The dispenser guard has signed the transaction - DONE\n     * - The claimant is claiming no more than once per ecosystem - DONE\n     * - The claimant has provided a valid proof of identity (is the owner of the wallet\n     *   entitled to the tokens)\n     * - The claimant has provided a valid proof of inclusion (this confirm that the claimant --\n     *   DONE\n     * - The claimant has not already claimed tokens -- DONE",
      ],
      accounts: [
        {
          name: 'claimant',
          isMut: true,
          isSigner: true,
        },
        {
          name: 'dispenserGuard',
          isMut: false,
          isSigner: true,
        },
        {
          name: 'config',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'cart',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'sysvarInstruction',
          isMut: false,
          isSigner: false,
          docs: [
            "CHECK : Anchor wants me to write this comment because I'm using AccountInfo which doesn't check for ownership and doesn't deserialize the account automatically. But it's fine because I check the address and I load it using load_instruction_at_checked.",
          ],
        },
      ],
      args: [
        {
          name: 'claimCertificates',
          type: {
            vec: {
              defined: 'ClaimCertificate',
            },
          },
        },
      ],
    },
    {
      name: 'checkout',
      accounts: [
        {
          name: 'claimant',
          isMut: true,
          isSigner: true,
        },
        {
          name: 'config',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'mint',
          isMut: false,
          isSigner: false,
          docs: [
            'Mint of the treasury & claimant_fund token account.',
            'Needed if the `claimant_fund` token account needs to be initialized',
          ],
        },
        {
          name: 'treasury',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'cart',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'claimantFund',
          isMut: true,
          isSigner: false,
          docs: [
            "Claimant's associated token account for receiving their claim/token grant",
          ],
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'associatedTokenProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: 'Config',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'bump',
            type: 'u8',
          },
          {
            name: 'merkleRoot',
            type: {
              array: ['u8', 32],
            },
          },
          {
            name: 'dispenserGuard',
            type: 'publicKey',
          },
          {
            name: 'mint',
            type: 'publicKey',
          },
          {
            name: 'treasury',
            type: 'publicKey',
          },
        ],
      },
    },
    {
      name: 'Receipt',
      type: {
        kind: 'struct',
        fields: [],
      },
    },
    {
      name: 'Cart',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'amount',
            type: 'u64',
          },
          {
            name: 'set',
            type: {
              defined: 'ClaimedEcosystems',
            },
          },
        ],
      },
    },
  ],
  types: [
    {
      name: 'Ed25519InstructionHeader',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'numSignatures',
            type: 'u8',
          },
          {
            name: 'padding',
            type: 'u8',
          },
          {
            name: 'signatureOffset',
            type: 'u16',
          },
          {
            name: 'signatureInstructionIndex',
            type: 'u16',
          },
          {
            name: 'publicKeyOffset',
            type: 'u16',
          },
          {
            name: 'publicKeyInstructionIndex',
            type: 'u16',
          },
          {
            name: 'messageDataOffset',
            type: 'u16',
          },
          {
            name: 'messageDataSize',
            type: 'u16',
          },
          {
            name: 'messageInstructionIndex',
            type: 'u16',
          },
        ],
      },
    },
    {
      name: 'Secp256k1InstructionHeader',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'numSignatures',
            type: 'u8',
          },
          {
            name: 'signatureOffset',
            type: 'u16',
          },
          {
            name: 'signatureInstructionIndex',
            type: 'u8',
          },
          {
            name: 'ethAddressOffset',
            type: 'u16',
          },
          {
            name: 'ethAddressInstructionIndex',
            type: 'u8',
          },
          {
            name: 'messageDataOffset',
            type: 'u16',
          },
          {
            name: 'messageDataSize',
            type: 'u16',
          },
          {
            name: 'messageInstructionIndex',
            type: 'u8',
          },
        ],
      },
    },
    {
      name: 'ClaimInfo',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'identity',
            type: {
              defined: 'Identity',
            },
          },
          {
            name: 'amount',
            type: 'u64',
          },
        ],
      },
    },
    {
      name: 'ClaimCertificate',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'amount',
            type: 'u64',
          },
          {
            name: 'proofOfIdentity',
            type: {
              defined: 'IdentityCertificate',
            },
          },
          {
            name: 'proofOfInclusion',
            type: {
              vec: {
                array: ['u8', 32],
              },
            },
          },
        ],
      },
    },
    {
      name: 'ClaimedEcosystems',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'set',
            type: {
              array: ['bool', 6],
            },
          },
        ],
      },
    },
    {
      name: 'Identity',
      docs: [
        "* This is the identity that the claimant will use to claim tokens.\n * A claimant can claim tokens for 1 identity on each ecosystem.\n * Typically for a blockchain it is a public key in the blockchain's address space.",
      ],
      type: {
        kind: 'enum',
        variants: [
          {
            name: 'Discord',
            fields: [
              {
                name: 'username',
                type: 'string',
              },
            ],
          },
          {
            name: 'Solana',
            fields: [
              {
                name: 'pubkey',
                type: {
                  array: ['u8', 32],
                },
              },
            ],
          },
          {
            name: 'Evm',
            fields: [
              {
                name: 'pubkey',
                type: {
                  array: ['u8', 20],
                },
              },
            ],
          },
          {
            name: 'Sui',
            fields: [
              {
                name: 'address',
                type: {
                  array: ['u8', 32],
                },
              },
            ],
          },
          {
            name: 'Aptos',
            fields: [
              {
                name: 'address',
                type: {
                  array: ['u8', 32],
                },
              },
            ],
          },
          {
            name: 'Cosmwasm',
            fields: [
              {
                name: 'address',
                type: 'string',
              },
            ],
          },
        ],
      },
    },
    {
      name: 'IdentityCertificate',
      type: {
        kind: 'enum',
        variants: [
          {
            name: 'Discord',
            fields: [
              {
                name: 'username',
                type: 'string',
              },
            ],
          },
          {
            name: 'Evm',
            fields: [
              {
                name: 'pubkey',
                type: {
                  array: ['u8', 20],
                },
              },
              {
                name: 'verification_instruction_index',
                type: 'u8',
              },
            ],
          },
          {
            name: 'Solana',
            fields: [
              {
                name: 'pubkey',
                type: {
                  array: ['u8', 32],
                },
              },
              {
                name: 'verification_instruction_index',
                type: 'u8',
              },
            ],
          },
          {
            name: 'Sui',
            fields: [
              {
                name: 'pubkey',
                type: {
                  array: ['u8', 32],
                },
              },
              {
                name: 'verification_instruction_index',
                type: 'u8',
              },
            ],
          },
          {
            name: 'Aptos',
            fields: [
              {
                name: 'pubkey',
                type: {
                  array: ['u8', 32],
                },
              },
              {
                name: 'verification_instruction_index',
                type: 'u8',
              },
            ],
          },
          {
            name: 'Cosmwasm',
            fields: [
              {
                name: 'chain_id',
                type: 'string',
              },
              {
                name: 'signature',
                type: {
                  array: ['u8', 64],
                },
              },
              {
                name: 'recovery_id',
                type: 'u8',
              },
              {
                name: 'pubkey',
                type: {
                  array: ['u8', 65],
                },
              },
              {
                name: 'message',
                type: 'bytes',
              },
            ],
          },
        ],
      },
    },
  ],
  errors: [
    {
      code: 6000,
      name: 'ArithmeticOverflow',
    },
    {
      code: 6001,
      name: 'MoreThanOneIdentityPerEcosystem',
    },
    {
      code: 6002,
      name: 'AlreadyClaimed',
    },
    {
      code: 6003,
      name: 'InvalidInclusionProof',
    },
    {
      code: 6004,
      name: 'WrongPda',
    },
    {
      code: 6005,
      name: 'NotImplemented',
    },
    {
      code: 6006,
      name: 'InsufficientTreasuryFunds',
    },
    {
      code: 6007,
      name: 'SignatureVerificationWrongProgram',
    },
    {
      code: 6008,
      name: 'SignatureVerificationWrongAccounts',
    },
    {
      code: 6009,
      name: 'SignatureVerificationWrongHeader',
    },
    {
      code: 6010,
      name: 'SignatureVerificationWrongPayload',
    },
    {
      code: 6011,
      name: 'SignatureVerificationWrongPayloadMetadata',
    },
    {
      code: 6012,
      name: 'SignatureVerificationWrongSigner',
    },
    {
      code: 6013,
      name: 'SignatureVerificationWrongClaimant',
    },
  ],
}