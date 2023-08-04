#![feature(prelude_import)]
#![allow(clippy::result_large_err)]
#[prelude_import]
use std::prelude::rust_2021::*;
#[macro_use]
extern crate std;
use {
    anchor_lang::{
        prelude::*,
        solana_program::{
            keccak::hashv, program::{invoke, invoke_signed},
            system_instruction,
            sysvar::instructions::{load_instruction_at_checked, ID as SYSVAR_IX_ID},
        },
        system_program,
    },
    anchor_spl::{
        associated_token::{get_associated_token_address, AssociatedToken},
        token::{Mint, Token, TokenAccount},
    },
    ecosystems::{
        check_message, cosmos::{CosmosBech32Address, CosmosMessage, CosmosPubkey},
        evm::EvmPrefixedMessage,
        secp256k1::{
            secp256k1_sha256_verify_signer, EvmPubkey, Secp256k1InstructionData,
            Secp256k1Signature,
        },
    },
    pythnet_sdk::{
        accumulators::merkle::{MerklePath, MerkleRoot, MerkleTree},
        hashers::Hasher,
    },
};
mod ecosystems {
    use {crate::ErrorCode, anchor_lang::prelude::{Pubkey, *}};
    pub mod cosmos {
        use {
            super::secp256k1::{
                SECP256K1_COMPRESSED_PUBKEY_LENGTH, SECP256K1_EVEN_PREFIX,
                SECP256K1_ODD_PREFIX,
            },
            crate::ErrorCode,
            anchor_lang::{
                prelude::*, solana_program::hash, AnchorDeserialize, AnchorSerialize,
            },
            base64::{
                engine::general_purpose::STANDARD as base64_standard_engine, Engine as _,
            },
            bech32::ToBase32, ripemd::Digest, serde::{Deserialize, Serialize},
        };
        pub const EXPECTED_COSMOS_MESSAGE_TYPE: &str = "sign/MsgSignData";
        /**
* An ADR036 message used in Cosmos. ADR036 is a standard for signing arbitrary data.
* Only the message payload is stored in this struct.
 */
        pub struct CosmosMessage(Vec<u8>);
        impl borsh::de::BorshDeserialize for CosmosMessage {
            fn deserialize(
                buf: &mut &[u8],
            ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
                Ok(Self(borsh::BorshDeserialize::deserialize(buf)?))
            }
        }
        impl borsh::ser::BorshSerialize for CosmosMessage {
            fn serialize<W: borsh::maybestd::io::Write>(
                &self,
                writer: &mut W,
            ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                borsh::BorshSerialize::serialize(&self.0, writer)?;
                Ok(())
            }
        }
        #[automatically_derived]
        impl ::core::clone::Clone for CosmosMessage {
            #[inline]
            fn clone(&self) -> CosmosMessage {
                CosmosMessage(::core::clone::Clone::clone(&self.0))
            }
        }
        impl CosmosMessage {
            pub fn parse(data: &[u8]) -> Result<Self> {
                let sign_doc: CosmosStdSignDoc = serde_json::from_slice(data)
                    .map_err(|_| ErrorCode::SignatureVerificationWrongMessageMetadata)?;
                if !(sign_doc.account_number == "0" && sign_doc.chain_id.is_empty()
                    && sign_doc.fee.amount.is_empty() && sign_doc.fee.gas == "0"
                    && sign_doc.memo.is_empty() && sign_doc.msgs.len() == 1
                    && sign_doc.sequence == "0")
                {
                    return Err(
                        ErrorCode::SignatureVerificationWrongMessageMetadata.into(),
                    );
                }
                if sign_doc.msgs[0].r#type != EXPECTED_COSMOS_MESSAGE_TYPE {
                    return Err(
                        ErrorCode::SignatureVerificationWrongMessageMetadata.into(),
                    );
                }
                Ok(
                    CosmosMessage(
                        base64_standard_engine
                            .decode(sign_doc.msgs[0].value.data.as_bytes())
                            .map_err(|_| {
                                ErrorCode::SignatureVerificationWrongMessageMetadata
                            })?,
                    ),
                )
            }
            pub fn get_payload(&self) -> &[u8] {
                self.0.as_slice()
            }
        }
        /**
* A Cosmos signed doc. It's basically a Cosmos transaction.
* The signer signs the hash of the signed doc serialized as JSON.
* For ADR036 (arbitrary messages), a lot of fields are zeroed.
 */
        pub struct CosmosStdSignDoc {
            account_number: String,
            chain_id: String,
            fee: CosmosStdFee,
            memo: String,
            msgs: Vec<CosmosStdMsg>,
            sequence: String,
        }
        #[doc(hidden)]
        #[allow(non_upper_case_globals, unused_attributes, unused_qualifications)]
        const _: () = {
            #[allow(unused_extern_crates, clippy::useless_attribute)]
            extern crate serde as _serde;
            #[automatically_derived]
            impl _serde::Serialize for CosmosStdSignDoc {
                fn serialize<__S>(
                    &self,
                    __serializer: __S,
                ) -> _serde::__private::Result<__S::Ok, __S::Error>
                where
                    __S: _serde::Serializer,
                {
                    let mut __serde_state = match _serde::Serializer::serialize_struct(
                        __serializer,
                        "CosmosStdSignDoc",
                        false as usize + 1 + 1 + 1 + 1 + 1 + 1,
                    ) {
                        _serde::__private::Ok(__val) => __val,
                        _serde::__private::Err(__err) => {
                            return _serde::__private::Err(__err);
                        }
                    };
                    match _serde::ser::SerializeStruct::serialize_field(
                        &mut __serde_state,
                        "account_number",
                        &self.account_number,
                    ) {
                        _serde::__private::Ok(__val) => __val,
                        _serde::__private::Err(__err) => {
                            return _serde::__private::Err(__err);
                        }
                    };
                    match _serde::ser::SerializeStruct::serialize_field(
                        &mut __serde_state,
                        "chain_id",
                        &self.chain_id,
                    ) {
                        _serde::__private::Ok(__val) => __val,
                        _serde::__private::Err(__err) => {
                            return _serde::__private::Err(__err);
                        }
                    };
                    match _serde::ser::SerializeStruct::serialize_field(
                        &mut __serde_state,
                        "fee",
                        &self.fee,
                    ) {
                        _serde::__private::Ok(__val) => __val,
                        _serde::__private::Err(__err) => {
                            return _serde::__private::Err(__err);
                        }
                    };
                    match _serde::ser::SerializeStruct::serialize_field(
                        &mut __serde_state,
                        "memo",
                        &self.memo,
                    ) {
                        _serde::__private::Ok(__val) => __val,
                        _serde::__private::Err(__err) => {
                            return _serde::__private::Err(__err);
                        }
                    };
                    match _serde::ser::SerializeStruct::serialize_field(
                        &mut __serde_state,
                        "msgs",
                        &self.msgs,
                    ) {
                        _serde::__private::Ok(__val) => __val,
                        _serde::__private::Err(__err) => {
                            return _serde::__private::Err(__err);
                        }
                    };
                    match _serde::ser::SerializeStruct::serialize_field(
                        &mut __serde_state,
                        "sequence",
                        &self.sequence,
                    ) {
                        _serde::__private::Ok(__val) => __val,
                        _serde::__private::Err(__err) => {
                            return _serde::__private::Err(__err);
                        }
                    };
                    _serde::ser::SerializeStruct::end(__serde_state)
                }
            }
        };
        #[doc(hidden)]
        #[allow(non_upper_case_globals, unused_attributes, unused_qualifications)]
        const _: () = {
            #[allow(unused_extern_crates, clippy::useless_attribute)]
            extern crate serde as _serde;
            #[automatically_derived]
            impl<'de> _serde::Deserialize<'de> for CosmosStdSignDoc {
                fn deserialize<__D>(
                    __deserializer: __D,
                ) -> _serde::__private::Result<Self, __D::Error>
                where
                    __D: _serde::Deserializer<'de>,
                {
                    #[allow(non_camel_case_types)]
                    #[doc(hidden)]
                    enum __Field {
                        __field0,
                        __field1,
                        __field2,
                        __field3,
                        __field4,
                        __field5,
                        __ignore,
                    }
                    #[doc(hidden)]
                    struct __FieldVisitor;
                    impl<'de> _serde::de::Visitor<'de> for __FieldVisitor {
                        type Value = __Field;
                        fn expecting(
                            &self,
                            __formatter: &mut _serde::__private::Formatter,
                        ) -> _serde::__private::fmt::Result {
                            _serde::__private::Formatter::write_str(
                                __formatter,
                                "field identifier",
                            )
                        }
                        fn visit_u64<__E>(
                            self,
                            __value: u64,
                        ) -> _serde::__private::Result<Self::Value, __E>
                        where
                            __E: _serde::de::Error,
                        {
                            match __value {
                                0u64 => _serde::__private::Ok(__Field::__field0),
                                1u64 => _serde::__private::Ok(__Field::__field1),
                                2u64 => _serde::__private::Ok(__Field::__field2),
                                3u64 => _serde::__private::Ok(__Field::__field3),
                                4u64 => _serde::__private::Ok(__Field::__field4),
                                5u64 => _serde::__private::Ok(__Field::__field5),
                                _ => _serde::__private::Ok(__Field::__ignore),
                            }
                        }
                        fn visit_str<__E>(
                            self,
                            __value: &str,
                        ) -> _serde::__private::Result<Self::Value, __E>
                        where
                            __E: _serde::de::Error,
                        {
                            match __value {
                                "account_number" => _serde::__private::Ok(__Field::__field0),
                                "chain_id" => _serde::__private::Ok(__Field::__field1),
                                "fee" => _serde::__private::Ok(__Field::__field2),
                                "memo" => _serde::__private::Ok(__Field::__field3),
                                "msgs" => _serde::__private::Ok(__Field::__field4),
                                "sequence" => _serde::__private::Ok(__Field::__field5),
                                _ => _serde::__private::Ok(__Field::__ignore),
                            }
                        }
                        fn visit_bytes<__E>(
                            self,
                            __value: &[u8],
                        ) -> _serde::__private::Result<Self::Value, __E>
                        where
                            __E: _serde::de::Error,
                        {
                            match __value {
                                b"account_number" => {
                                    _serde::__private::Ok(__Field::__field0)
                                }
                                b"chain_id" => _serde::__private::Ok(__Field::__field1),
                                b"fee" => _serde::__private::Ok(__Field::__field2),
                                b"memo" => _serde::__private::Ok(__Field::__field3),
                                b"msgs" => _serde::__private::Ok(__Field::__field4),
                                b"sequence" => _serde::__private::Ok(__Field::__field5),
                                _ => _serde::__private::Ok(__Field::__ignore),
                            }
                        }
                    }
                    impl<'de> _serde::Deserialize<'de> for __Field {
                        #[inline]
                        fn deserialize<__D>(
                            __deserializer: __D,
                        ) -> _serde::__private::Result<Self, __D::Error>
                        where
                            __D: _serde::Deserializer<'de>,
                        {
                            _serde::Deserializer::deserialize_identifier(
                                __deserializer,
                                __FieldVisitor,
                            )
                        }
                    }
                    #[doc(hidden)]
                    struct __Visitor<'de> {
                        marker: _serde::__private::PhantomData<CosmosStdSignDoc>,
                        lifetime: _serde::__private::PhantomData<&'de ()>,
                    }
                    impl<'de> _serde::de::Visitor<'de> for __Visitor<'de> {
                        type Value = CosmosStdSignDoc;
                        fn expecting(
                            &self,
                            __formatter: &mut _serde::__private::Formatter,
                        ) -> _serde::__private::fmt::Result {
                            _serde::__private::Formatter::write_str(
                                __formatter,
                                "struct CosmosStdSignDoc",
                            )
                        }
                        #[inline]
                        fn visit_seq<__A>(
                            self,
                            mut __seq: __A,
                        ) -> _serde::__private::Result<Self::Value, __A::Error>
                        where
                            __A: _serde::de::SeqAccess<'de>,
                        {
                            let __field0 = match match _serde::de::SeqAccess::next_element::<
                                String,
                            >(&mut __seq) {
                                _serde::__private::Ok(__val) => __val,
                                _serde::__private::Err(__err) => {
                                    return _serde::__private::Err(__err);
                                }
                            } {
                                _serde::__private::Some(__value) => __value,
                                _serde::__private::None => {
                                    return _serde::__private::Err(
                                        _serde::de::Error::invalid_length(
                                            0usize,
                                            &"struct CosmosStdSignDoc with 6 elements",
                                        ),
                                    );
                                }
                            };
                            let __field1 = match match _serde::de::SeqAccess::next_element::<
                                String,
                            >(&mut __seq) {
                                _serde::__private::Ok(__val) => __val,
                                _serde::__private::Err(__err) => {
                                    return _serde::__private::Err(__err);
                                }
                            } {
                                _serde::__private::Some(__value) => __value,
                                _serde::__private::None => {
                                    return _serde::__private::Err(
                                        _serde::de::Error::invalid_length(
                                            1usize,
                                            &"struct CosmosStdSignDoc with 6 elements",
                                        ),
                                    );
                                }
                            };
                            let __field2 = match match _serde::de::SeqAccess::next_element::<
                                CosmosStdFee,
                            >(&mut __seq) {
                                _serde::__private::Ok(__val) => __val,
                                _serde::__private::Err(__err) => {
                                    return _serde::__private::Err(__err);
                                }
                            } {
                                _serde::__private::Some(__value) => __value,
                                _serde::__private::None => {
                                    return _serde::__private::Err(
                                        _serde::de::Error::invalid_length(
                                            2usize,
                                            &"struct CosmosStdSignDoc with 6 elements",
                                        ),
                                    );
                                }
                            };
                            let __field3 = match match _serde::de::SeqAccess::next_element::<
                                String,
                            >(&mut __seq) {
                                _serde::__private::Ok(__val) => __val,
                                _serde::__private::Err(__err) => {
                                    return _serde::__private::Err(__err);
                                }
                            } {
                                _serde::__private::Some(__value) => __value,
                                _serde::__private::None => {
                                    return _serde::__private::Err(
                                        _serde::de::Error::invalid_length(
                                            3usize,
                                            &"struct CosmosStdSignDoc with 6 elements",
                                        ),
                                    );
                                }
                            };
                            let __field4 = match match _serde::de::SeqAccess::next_element::<
                                Vec<CosmosStdMsg>,
                            >(&mut __seq) {
                                _serde::__private::Ok(__val) => __val,
                                _serde::__private::Err(__err) => {
                                    return _serde::__private::Err(__err);
                                }
                            } {
                                _serde::__private::Some(__value) => __value,
                                _serde::__private::None => {
                                    return _serde::__private::Err(
                                        _serde::de::Error::invalid_length(
                                            4usize,
                                            &"struct CosmosStdSignDoc with 6 elements",
                                        ),
                                    );
                                }
                            };
                            let __field5 = match match _serde::de::SeqAccess::next_element::<
                                String,
                            >(&mut __seq) {
                                _serde::__private::Ok(__val) => __val,
                                _serde::__private::Err(__err) => {
                                    return _serde::__private::Err(__err);
                                }
                            } {
                                _serde::__private::Some(__value) => __value,
                                _serde::__private::None => {
                                    return _serde::__private::Err(
                                        _serde::de::Error::invalid_length(
                                            5usize,
                                            &"struct CosmosStdSignDoc with 6 elements",
                                        ),
                                    );
                                }
                            };
                            _serde::__private::Ok(CosmosStdSignDoc {
                                account_number: __field0,
                                chain_id: __field1,
                                fee: __field2,
                                memo: __field3,
                                msgs: __field4,
                                sequence: __field5,
                            })
                        }
                        #[inline]
                        fn visit_map<__A>(
                            self,
                            mut __map: __A,
                        ) -> _serde::__private::Result<Self::Value, __A::Error>
                        where
                            __A: _serde::de::MapAccess<'de>,
                        {
                            let mut __field0: _serde::__private::Option<String> = _serde::__private::None;
                            let mut __field1: _serde::__private::Option<String> = _serde::__private::None;
                            let mut __field2: _serde::__private::Option<CosmosStdFee> = _serde::__private::None;
                            let mut __field3: _serde::__private::Option<String> = _serde::__private::None;
                            let mut __field4: _serde::__private::Option<
                                Vec<CosmosStdMsg>,
                            > = _serde::__private::None;
                            let mut __field5: _serde::__private::Option<String> = _serde::__private::None;
                            while let _serde::__private::Some(__key)
                                = match _serde::de::MapAccess::next_key::<
                                    __Field,
                                >(&mut __map) {
                                    _serde::__private::Ok(__val) => __val,
                                    _serde::__private::Err(__err) => {
                                        return _serde::__private::Err(__err);
                                    }
                                } {
                                match __key {
                                    __Field::__field0 => {
                                        if _serde::__private::Option::is_some(&__field0) {
                                            return _serde::__private::Err(
                                                <__A::Error as _serde::de::Error>::duplicate_field(
                                                    "account_number",
                                                ),
                                            );
                                        }
                                        __field0 = _serde::__private::Some(
                                            match _serde::de::MapAccess::next_value::<
                                                String,
                                            >(&mut __map) {
                                                _serde::__private::Ok(__val) => __val,
                                                _serde::__private::Err(__err) => {
                                                    return _serde::__private::Err(__err);
                                                }
                                            },
                                        );
                                    }
                                    __Field::__field1 => {
                                        if _serde::__private::Option::is_some(&__field1) {
                                            return _serde::__private::Err(
                                                <__A::Error as _serde::de::Error>::duplicate_field(
                                                    "chain_id",
                                                ),
                                            );
                                        }
                                        __field1 = _serde::__private::Some(
                                            match _serde::de::MapAccess::next_value::<
                                                String,
                                            >(&mut __map) {
                                                _serde::__private::Ok(__val) => __val,
                                                _serde::__private::Err(__err) => {
                                                    return _serde::__private::Err(__err);
                                                }
                                            },
                                        );
                                    }
                                    __Field::__field2 => {
                                        if _serde::__private::Option::is_some(&__field2) {
                                            return _serde::__private::Err(
                                                <__A::Error as _serde::de::Error>::duplicate_field("fee"),
                                            );
                                        }
                                        __field2 = _serde::__private::Some(
                                            match _serde::de::MapAccess::next_value::<
                                                CosmosStdFee,
                                            >(&mut __map) {
                                                _serde::__private::Ok(__val) => __val,
                                                _serde::__private::Err(__err) => {
                                                    return _serde::__private::Err(__err);
                                                }
                                            },
                                        );
                                    }
                                    __Field::__field3 => {
                                        if _serde::__private::Option::is_some(&__field3) {
                                            return _serde::__private::Err(
                                                <__A::Error as _serde::de::Error>::duplicate_field("memo"),
                                            );
                                        }
                                        __field3 = _serde::__private::Some(
                                            match _serde::de::MapAccess::next_value::<
                                                String,
                                            >(&mut __map) {
                                                _serde::__private::Ok(__val) => __val,
                                                _serde::__private::Err(__err) => {
                                                    return _serde::__private::Err(__err);
                                                }
                                            },
                                        );
                                    }
                                    __Field::__field4 => {
                                        if _serde::__private::Option::is_some(&__field4) {
                                            return _serde::__private::Err(
                                                <__A::Error as _serde::de::Error>::duplicate_field("msgs"),
                                            );
                                        }
                                        __field4 = _serde::__private::Some(
                                            match _serde::de::MapAccess::next_value::<
                                                Vec<CosmosStdMsg>,
                                            >(&mut __map) {
                                                _serde::__private::Ok(__val) => __val,
                                                _serde::__private::Err(__err) => {
                                                    return _serde::__private::Err(__err);
                                                }
                                            },
                                        );
                                    }
                                    __Field::__field5 => {
                                        if _serde::__private::Option::is_some(&__field5) {
                                            return _serde::__private::Err(
                                                <__A::Error as _serde::de::Error>::duplicate_field(
                                                    "sequence",
                                                ),
                                            );
                                        }
                                        __field5 = _serde::__private::Some(
                                            match _serde::de::MapAccess::next_value::<
                                                String,
                                            >(&mut __map) {
                                                _serde::__private::Ok(__val) => __val,
                                                _serde::__private::Err(__err) => {
                                                    return _serde::__private::Err(__err);
                                                }
                                            },
                                        );
                                    }
                                    _ => {
                                        let _ = match _serde::de::MapAccess::next_value::<
                                            _serde::de::IgnoredAny,
                                        >(&mut __map) {
                                            _serde::__private::Ok(__val) => __val,
                                            _serde::__private::Err(__err) => {
                                                return _serde::__private::Err(__err);
                                            }
                                        };
                                    }
                                }
                            }
                            let __field0 = match __field0 {
                                _serde::__private::Some(__field0) => __field0,
                                _serde::__private::None => {
                                    match _serde::__private::de::missing_field(
                                        "account_number",
                                    ) {
                                        _serde::__private::Ok(__val) => __val,
                                        _serde::__private::Err(__err) => {
                                            return _serde::__private::Err(__err);
                                        }
                                    }
                                }
                            };
                            let __field1 = match __field1 {
                                _serde::__private::Some(__field1) => __field1,
                                _serde::__private::None => {
                                    match _serde::__private::de::missing_field("chain_id") {
                                        _serde::__private::Ok(__val) => __val,
                                        _serde::__private::Err(__err) => {
                                            return _serde::__private::Err(__err);
                                        }
                                    }
                                }
                            };
                            let __field2 = match __field2 {
                                _serde::__private::Some(__field2) => __field2,
                                _serde::__private::None => {
                                    match _serde::__private::de::missing_field("fee") {
                                        _serde::__private::Ok(__val) => __val,
                                        _serde::__private::Err(__err) => {
                                            return _serde::__private::Err(__err);
                                        }
                                    }
                                }
                            };
                            let __field3 = match __field3 {
                                _serde::__private::Some(__field3) => __field3,
                                _serde::__private::None => {
                                    match _serde::__private::de::missing_field("memo") {
                                        _serde::__private::Ok(__val) => __val,
                                        _serde::__private::Err(__err) => {
                                            return _serde::__private::Err(__err);
                                        }
                                    }
                                }
                            };
                            let __field4 = match __field4 {
                                _serde::__private::Some(__field4) => __field4,
                                _serde::__private::None => {
                                    match _serde::__private::de::missing_field("msgs") {
                                        _serde::__private::Ok(__val) => __val,
                                        _serde::__private::Err(__err) => {
                                            return _serde::__private::Err(__err);
                                        }
                                    }
                                }
                            };
                            let __field5 = match __field5 {
                                _serde::__private::Some(__field5) => __field5,
                                _serde::__private::None => {
                                    match _serde::__private::de::missing_field("sequence") {
                                        _serde::__private::Ok(__val) => __val,
                                        _serde::__private::Err(__err) => {
                                            return _serde::__private::Err(__err);
                                        }
                                    }
                                }
                            };
                            _serde::__private::Ok(CosmosStdSignDoc {
                                account_number: __field0,
                                chain_id: __field1,
                                fee: __field2,
                                memo: __field3,
                                msgs: __field4,
                                sequence: __field5,
                            })
                        }
                    }
                    #[doc(hidden)]
                    const FIELDS: &'static [&'static str] = &[
                        "account_number",
                        "chain_id",
                        "fee",
                        "memo",
                        "msgs",
                        "sequence",
                    ];
                    _serde::Deserializer::deserialize_struct(
                        __deserializer,
                        "CosmosStdSignDoc",
                        FIELDS,
                        __Visitor {
                            marker: _serde::__private::PhantomData::<CosmosStdSignDoc>,
                            lifetime: _serde::__private::PhantomData,
                        },
                    )
                }
            }
        };
        #[automatically_derived]
        impl ::core::fmt::Debug for CosmosStdSignDoc {
            fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
                let names: &'static _ = &[
                    "account_number",
                    "chain_id",
                    "fee",
                    "memo",
                    "msgs",
                    "sequence",
                ];
                let values: &[&dyn ::core::fmt::Debug] = &[
                    &&self.account_number,
                    &&self.chain_id,
                    &&self.fee,
                    &&self.memo,
                    &&self.msgs,
                    &&self.sequence,
                ];
                ::core::fmt::Formatter::debug_struct_fields_finish(
                    f,
                    "CosmosStdSignDoc",
                    names,
                    values,
                )
            }
        }
        /**
* A cosmos message, there can be more than one in a signed doc.
*/
        struct CosmosStdMsg {
            r#type: String,
            value: CosmosAdr036Value,
        }
        #[doc(hidden)]
        #[allow(non_upper_case_globals, unused_attributes, unused_qualifications)]
        const _: () = {
            #[allow(unused_extern_crates, clippy::useless_attribute)]
            extern crate serde as _serde;
            #[automatically_derived]
            impl _serde::Serialize for CosmosStdMsg {
                fn serialize<__S>(
                    &self,
                    __serializer: __S,
                ) -> _serde::__private::Result<__S::Ok, __S::Error>
                where
                    __S: _serde::Serializer,
                {
                    let mut __serde_state = match _serde::Serializer::serialize_struct(
                        __serializer,
                        "CosmosStdMsg",
                        false as usize + 1 + 1,
                    ) {
                        _serde::__private::Ok(__val) => __val,
                        _serde::__private::Err(__err) => {
                            return _serde::__private::Err(__err);
                        }
                    };
                    match _serde::ser::SerializeStruct::serialize_field(
                        &mut __serde_state,
                        "type",
                        &self.r#type,
                    ) {
                        _serde::__private::Ok(__val) => __val,
                        _serde::__private::Err(__err) => {
                            return _serde::__private::Err(__err);
                        }
                    };
                    match _serde::ser::SerializeStruct::serialize_field(
                        &mut __serde_state,
                        "value",
                        &self.value,
                    ) {
                        _serde::__private::Ok(__val) => __val,
                        _serde::__private::Err(__err) => {
                            return _serde::__private::Err(__err);
                        }
                    };
                    _serde::ser::SerializeStruct::end(__serde_state)
                }
            }
        };
        #[doc(hidden)]
        #[allow(non_upper_case_globals, unused_attributes, unused_qualifications)]
        const _: () = {
            #[allow(unused_extern_crates, clippy::useless_attribute)]
            extern crate serde as _serde;
            #[automatically_derived]
            impl<'de> _serde::Deserialize<'de> for CosmosStdMsg {
                fn deserialize<__D>(
                    __deserializer: __D,
                ) -> _serde::__private::Result<Self, __D::Error>
                where
                    __D: _serde::Deserializer<'de>,
                {
                    #[allow(non_camel_case_types)]
                    #[doc(hidden)]
                    enum __Field {
                        __field0,
                        __field1,
                        __ignore,
                    }
                    #[doc(hidden)]
                    struct __FieldVisitor;
                    impl<'de> _serde::de::Visitor<'de> for __FieldVisitor {
                        type Value = __Field;
                        fn expecting(
                            &self,
                            __formatter: &mut _serde::__private::Formatter,
                        ) -> _serde::__private::fmt::Result {
                            _serde::__private::Formatter::write_str(
                                __formatter,
                                "field identifier",
                            )
                        }
                        fn visit_u64<__E>(
                            self,
                            __value: u64,
                        ) -> _serde::__private::Result<Self::Value, __E>
                        where
                            __E: _serde::de::Error,
                        {
                            match __value {
                                0u64 => _serde::__private::Ok(__Field::__field0),
                                1u64 => _serde::__private::Ok(__Field::__field1),
                                _ => _serde::__private::Ok(__Field::__ignore),
                            }
                        }
                        fn visit_str<__E>(
                            self,
                            __value: &str,
                        ) -> _serde::__private::Result<Self::Value, __E>
                        where
                            __E: _serde::de::Error,
                        {
                            match __value {
                                "type" => _serde::__private::Ok(__Field::__field0),
                                "value" => _serde::__private::Ok(__Field::__field1),
                                _ => _serde::__private::Ok(__Field::__ignore),
                            }
                        }
                        fn visit_bytes<__E>(
                            self,
                            __value: &[u8],
                        ) -> _serde::__private::Result<Self::Value, __E>
                        where
                            __E: _serde::de::Error,
                        {
                            match __value {
                                b"type" => _serde::__private::Ok(__Field::__field0),
                                b"value" => _serde::__private::Ok(__Field::__field1),
                                _ => _serde::__private::Ok(__Field::__ignore),
                            }
                        }
                    }
                    impl<'de> _serde::Deserialize<'de> for __Field {
                        #[inline]
                        fn deserialize<__D>(
                            __deserializer: __D,
                        ) -> _serde::__private::Result<Self, __D::Error>
                        where
                            __D: _serde::Deserializer<'de>,
                        {
                            _serde::Deserializer::deserialize_identifier(
                                __deserializer,
                                __FieldVisitor,
                            )
                        }
                    }
                    #[doc(hidden)]
                    struct __Visitor<'de> {
                        marker: _serde::__private::PhantomData<CosmosStdMsg>,
                        lifetime: _serde::__private::PhantomData<&'de ()>,
                    }
                    impl<'de> _serde::de::Visitor<'de> for __Visitor<'de> {
                        type Value = CosmosStdMsg;
                        fn expecting(
                            &self,
                            __formatter: &mut _serde::__private::Formatter,
                        ) -> _serde::__private::fmt::Result {
                            _serde::__private::Formatter::write_str(
                                __formatter,
                                "struct CosmosStdMsg",
                            )
                        }
                        #[inline]
                        fn visit_seq<__A>(
                            self,
                            mut __seq: __A,
                        ) -> _serde::__private::Result<Self::Value, __A::Error>
                        where
                            __A: _serde::de::SeqAccess<'de>,
                        {
                            let __field0 = match match _serde::de::SeqAccess::next_element::<
                                String,
                            >(&mut __seq) {
                                _serde::__private::Ok(__val) => __val,
                                _serde::__private::Err(__err) => {
                                    return _serde::__private::Err(__err);
                                }
                            } {
                                _serde::__private::Some(__value) => __value,
                                _serde::__private::None => {
                                    return _serde::__private::Err(
                                        _serde::de::Error::invalid_length(
                                            0usize,
                                            &"struct CosmosStdMsg with 2 elements",
                                        ),
                                    );
                                }
                            };
                            let __field1 = match match _serde::de::SeqAccess::next_element::<
                                CosmosAdr036Value,
                            >(&mut __seq) {
                                _serde::__private::Ok(__val) => __val,
                                _serde::__private::Err(__err) => {
                                    return _serde::__private::Err(__err);
                                }
                            } {
                                _serde::__private::Some(__value) => __value,
                                _serde::__private::None => {
                                    return _serde::__private::Err(
                                        _serde::de::Error::invalid_length(
                                            1usize,
                                            &"struct CosmosStdMsg with 2 elements",
                                        ),
                                    );
                                }
                            };
                            _serde::__private::Ok(CosmosStdMsg {
                                r#type: __field0,
                                value: __field1,
                            })
                        }
                        #[inline]
                        fn visit_map<__A>(
                            self,
                            mut __map: __A,
                        ) -> _serde::__private::Result<Self::Value, __A::Error>
                        where
                            __A: _serde::de::MapAccess<'de>,
                        {
                            let mut __field0: _serde::__private::Option<String> = _serde::__private::None;
                            let mut __field1: _serde::__private::Option<
                                CosmosAdr036Value,
                            > = _serde::__private::None;
                            while let _serde::__private::Some(__key)
                                = match _serde::de::MapAccess::next_key::<
                                    __Field,
                                >(&mut __map) {
                                    _serde::__private::Ok(__val) => __val,
                                    _serde::__private::Err(__err) => {
                                        return _serde::__private::Err(__err);
                                    }
                                } {
                                match __key {
                                    __Field::__field0 => {
                                        if _serde::__private::Option::is_some(&__field0) {
                                            return _serde::__private::Err(
                                                <__A::Error as _serde::de::Error>::duplicate_field("type"),
                                            );
                                        }
                                        __field0 = _serde::__private::Some(
                                            match _serde::de::MapAccess::next_value::<
                                                String,
                                            >(&mut __map) {
                                                _serde::__private::Ok(__val) => __val,
                                                _serde::__private::Err(__err) => {
                                                    return _serde::__private::Err(__err);
                                                }
                                            },
                                        );
                                    }
                                    __Field::__field1 => {
                                        if _serde::__private::Option::is_some(&__field1) {
                                            return _serde::__private::Err(
                                                <__A::Error as _serde::de::Error>::duplicate_field("value"),
                                            );
                                        }
                                        __field1 = _serde::__private::Some(
                                            match _serde::de::MapAccess::next_value::<
                                                CosmosAdr036Value,
                                            >(&mut __map) {
                                                _serde::__private::Ok(__val) => __val,
                                                _serde::__private::Err(__err) => {
                                                    return _serde::__private::Err(__err);
                                                }
                                            },
                                        );
                                    }
                                    _ => {
                                        let _ = match _serde::de::MapAccess::next_value::<
                                            _serde::de::IgnoredAny,
                                        >(&mut __map) {
                                            _serde::__private::Ok(__val) => __val,
                                            _serde::__private::Err(__err) => {
                                                return _serde::__private::Err(__err);
                                            }
                                        };
                                    }
                                }
                            }
                            let __field0 = match __field0 {
                                _serde::__private::Some(__field0) => __field0,
                                _serde::__private::None => {
                                    match _serde::__private::de::missing_field("type") {
                                        _serde::__private::Ok(__val) => __val,
                                        _serde::__private::Err(__err) => {
                                            return _serde::__private::Err(__err);
                                        }
                                    }
                                }
                            };
                            let __field1 = match __field1 {
                                _serde::__private::Some(__field1) => __field1,
                                _serde::__private::None => {
                                    match _serde::__private::de::missing_field("value") {
                                        _serde::__private::Ok(__val) => __val,
                                        _serde::__private::Err(__err) => {
                                            return _serde::__private::Err(__err);
                                        }
                                    }
                                }
                            };
                            _serde::__private::Ok(CosmosStdMsg {
                                r#type: __field0,
                                value: __field1,
                            })
                        }
                    }
                    #[doc(hidden)]
                    const FIELDS: &'static [&'static str] = &["type", "value"];
                    _serde::Deserializer::deserialize_struct(
                        __deserializer,
                        "CosmosStdMsg",
                        FIELDS,
                        __Visitor {
                            marker: _serde::__private::PhantomData::<CosmosStdMsg>,
                            lifetime: _serde::__private::PhantomData,
                        },
                    )
                }
            }
        };
        #[automatically_derived]
        impl ::core::fmt::Debug for CosmosStdMsg {
            fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
                ::core::fmt::Formatter::debug_struct_field2_finish(
                    f,
                    "CosmosStdMsg",
                    "type",
                    &&self.r#type,
                    "value",
                    &&self.value,
                )
            }
        }
        /**
* The payload of a Cosmos ADR036 message.
*/
        struct CosmosAdr036Value {
            data: String,
            signer: String,
        }
        #[doc(hidden)]
        #[allow(non_upper_case_globals, unused_attributes, unused_qualifications)]
        const _: () = {
            #[allow(unused_extern_crates, clippy::useless_attribute)]
            extern crate serde as _serde;
            #[automatically_derived]
            impl _serde::Serialize for CosmosAdr036Value {
                fn serialize<__S>(
                    &self,
                    __serializer: __S,
                ) -> _serde::__private::Result<__S::Ok, __S::Error>
                where
                    __S: _serde::Serializer,
                {
                    let mut __serde_state = match _serde::Serializer::serialize_struct(
                        __serializer,
                        "CosmosAdr036Value",
                        false as usize + 1 + 1,
                    ) {
                        _serde::__private::Ok(__val) => __val,
                        _serde::__private::Err(__err) => {
                            return _serde::__private::Err(__err);
                        }
                    };
                    match _serde::ser::SerializeStruct::serialize_field(
                        &mut __serde_state,
                        "data",
                        &self.data,
                    ) {
                        _serde::__private::Ok(__val) => __val,
                        _serde::__private::Err(__err) => {
                            return _serde::__private::Err(__err);
                        }
                    };
                    match _serde::ser::SerializeStruct::serialize_field(
                        &mut __serde_state,
                        "signer",
                        &self.signer,
                    ) {
                        _serde::__private::Ok(__val) => __val,
                        _serde::__private::Err(__err) => {
                            return _serde::__private::Err(__err);
                        }
                    };
                    _serde::ser::SerializeStruct::end(__serde_state)
                }
            }
        };
        #[doc(hidden)]
        #[allow(non_upper_case_globals, unused_attributes, unused_qualifications)]
        const _: () = {
            #[allow(unused_extern_crates, clippy::useless_attribute)]
            extern crate serde as _serde;
            #[automatically_derived]
            impl<'de> _serde::Deserialize<'de> for CosmosAdr036Value {
                fn deserialize<__D>(
                    __deserializer: __D,
                ) -> _serde::__private::Result<Self, __D::Error>
                where
                    __D: _serde::Deserializer<'de>,
                {
                    #[allow(non_camel_case_types)]
                    #[doc(hidden)]
                    enum __Field {
                        __field0,
                        __field1,
                        __ignore,
                    }
                    #[doc(hidden)]
                    struct __FieldVisitor;
                    impl<'de> _serde::de::Visitor<'de> for __FieldVisitor {
                        type Value = __Field;
                        fn expecting(
                            &self,
                            __formatter: &mut _serde::__private::Formatter,
                        ) -> _serde::__private::fmt::Result {
                            _serde::__private::Formatter::write_str(
                                __formatter,
                                "field identifier",
                            )
                        }
                        fn visit_u64<__E>(
                            self,
                            __value: u64,
                        ) -> _serde::__private::Result<Self::Value, __E>
                        where
                            __E: _serde::de::Error,
                        {
                            match __value {
                                0u64 => _serde::__private::Ok(__Field::__field0),
                                1u64 => _serde::__private::Ok(__Field::__field1),
                                _ => _serde::__private::Ok(__Field::__ignore),
                            }
                        }
                        fn visit_str<__E>(
                            self,
                            __value: &str,
                        ) -> _serde::__private::Result<Self::Value, __E>
                        where
                            __E: _serde::de::Error,
                        {
                            match __value {
                                "data" => _serde::__private::Ok(__Field::__field0),
                                "signer" => _serde::__private::Ok(__Field::__field1),
                                _ => _serde::__private::Ok(__Field::__ignore),
                            }
                        }
                        fn visit_bytes<__E>(
                            self,
                            __value: &[u8],
                        ) -> _serde::__private::Result<Self::Value, __E>
                        where
                            __E: _serde::de::Error,
                        {
                            match __value {
                                b"data" => _serde::__private::Ok(__Field::__field0),
                                b"signer" => _serde::__private::Ok(__Field::__field1),
                                _ => _serde::__private::Ok(__Field::__ignore),
                            }
                        }
                    }
                    impl<'de> _serde::Deserialize<'de> for __Field {
                        #[inline]
                        fn deserialize<__D>(
                            __deserializer: __D,
                        ) -> _serde::__private::Result<Self, __D::Error>
                        where
                            __D: _serde::Deserializer<'de>,
                        {
                            _serde::Deserializer::deserialize_identifier(
                                __deserializer,
                                __FieldVisitor,
                            )
                        }
                    }
                    #[doc(hidden)]
                    struct __Visitor<'de> {
                        marker: _serde::__private::PhantomData<CosmosAdr036Value>,
                        lifetime: _serde::__private::PhantomData<&'de ()>,
                    }
                    impl<'de> _serde::de::Visitor<'de> for __Visitor<'de> {
                        type Value = CosmosAdr036Value;
                        fn expecting(
                            &self,
                            __formatter: &mut _serde::__private::Formatter,
                        ) -> _serde::__private::fmt::Result {
                            _serde::__private::Formatter::write_str(
                                __formatter,
                                "struct CosmosAdr036Value",
                            )
                        }
                        #[inline]
                        fn visit_seq<__A>(
                            self,
                            mut __seq: __A,
                        ) -> _serde::__private::Result<Self::Value, __A::Error>
                        where
                            __A: _serde::de::SeqAccess<'de>,
                        {
                            let __field0 = match match _serde::de::SeqAccess::next_element::<
                                String,
                            >(&mut __seq) {
                                _serde::__private::Ok(__val) => __val,
                                _serde::__private::Err(__err) => {
                                    return _serde::__private::Err(__err);
                                }
                            } {
                                _serde::__private::Some(__value) => __value,
                                _serde::__private::None => {
                                    return _serde::__private::Err(
                                        _serde::de::Error::invalid_length(
                                            0usize,
                                            &"struct CosmosAdr036Value with 2 elements",
                                        ),
                                    );
                                }
                            };
                            let __field1 = match match _serde::de::SeqAccess::next_element::<
                                String,
                            >(&mut __seq) {
                                _serde::__private::Ok(__val) => __val,
                                _serde::__private::Err(__err) => {
                                    return _serde::__private::Err(__err);
                                }
                            } {
                                _serde::__private::Some(__value) => __value,
                                _serde::__private::None => {
                                    return _serde::__private::Err(
                                        _serde::de::Error::invalid_length(
                                            1usize,
                                            &"struct CosmosAdr036Value with 2 elements",
                                        ),
                                    );
                                }
                            };
                            _serde::__private::Ok(CosmosAdr036Value {
                                data: __field0,
                                signer: __field1,
                            })
                        }
                        #[inline]
                        fn visit_map<__A>(
                            self,
                            mut __map: __A,
                        ) -> _serde::__private::Result<Self::Value, __A::Error>
                        where
                            __A: _serde::de::MapAccess<'de>,
                        {
                            let mut __field0: _serde::__private::Option<String> = _serde::__private::None;
                            let mut __field1: _serde::__private::Option<String> = _serde::__private::None;
                            while let _serde::__private::Some(__key)
                                = match _serde::de::MapAccess::next_key::<
                                    __Field,
                                >(&mut __map) {
                                    _serde::__private::Ok(__val) => __val,
                                    _serde::__private::Err(__err) => {
                                        return _serde::__private::Err(__err);
                                    }
                                } {
                                match __key {
                                    __Field::__field0 => {
                                        if _serde::__private::Option::is_some(&__field0) {
                                            return _serde::__private::Err(
                                                <__A::Error as _serde::de::Error>::duplicate_field("data"),
                                            );
                                        }
                                        __field0 = _serde::__private::Some(
                                            match _serde::de::MapAccess::next_value::<
                                                String,
                                            >(&mut __map) {
                                                _serde::__private::Ok(__val) => __val,
                                                _serde::__private::Err(__err) => {
                                                    return _serde::__private::Err(__err);
                                                }
                                            },
                                        );
                                    }
                                    __Field::__field1 => {
                                        if _serde::__private::Option::is_some(&__field1) {
                                            return _serde::__private::Err(
                                                <__A::Error as _serde::de::Error>::duplicate_field("signer"),
                                            );
                                        }
                                        __field1 = _serde::__private::Some(
                                            match _serde::de::MapAccess::next_value::<
                                                String,
                                            >(&mut __map) {
                                                _serde::__private::Ok(__val) => __val,
                                                _serde::__private::Err(__err) => {
                                                    return _serde::__private::Err(__err);
                                                }
                                            },
                                        );
                                    }
                                    _ => {
                                        let _ = match _serde::de::MapAccess::next_value::<
                                            _serde::de::IgnoredAny,
                                        >(&mut __map) {
                                            _serde::__private::Ok(__val) => __val,
                                            _serde::__private::Err(__err) => {
                                                return _serde::__private::Err(__err);
                                            }
                                        };
                                    }
                                }
                            }
                            let __field0 = match __field0 {
                                _serde::__private::Some(__field0) => __field0,
                                _serde::__private::None => {
                                    match _serde::__private::de::missing_field("data") {
                                        _serde::__private::Ok(__val) => __val,
                                        _serde::__private::Err(__err) => {
                                            return _serde::__private::Err(__err);
                                        }
                                    }
                                }
                            };
                            let __field1 = match __field1 {
                                _serde::__private::Some(__field1) => __field1,
                                _serde::__private::None => {
                                    match _serde::__private::de::missing_field("signer") {
                                        _serde::__private::Ok(__val) => __val,
                                        _serde::__private::Err(__err) => {
                                            return _serde::__private::Err(__err);
                                        }
                                    }
                                }
                            };
                            _serde::__private::Ok(CosmosAdr036Value {
                                data: __field0,
                                signer: __field1,
                            })
                        }
                    }
                    #[doc(hidden)]
                    const FIELDS: &'static [&'static str] = &["data", "signer"];
                    _serde::Deserializer::deserialize_struct(
                        __deserializer,
                        "CosmosAdr036Value",
                        FIELDS,
                        __Visitor {
                            marker: _serde::__private::PhantomData::<CosmosAdr036Value>,
                            lifetime: _serde::__private::PhantomData,
                        },
                    )
                }
            }
        };
        #[automatically_derived]
        impl ::core::fmt::Debug for CosmosAdr036Value {
            fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
                ::core::fmt::Formatter::debug_struct_field2_finish(
                    f,
                    "CosmosAdr036Value",
                    "data",
                    &&self.data,
                    "signer",
                    &&self.signer,
                )
            }
        }
        /**
* Fee information in a signed doc. for ADR036 this is zeroed.
*/
        struct CosmosStdFee {
            amount: Vec<CosmosCoin>,
            gas: String,
        }
        #[doc(hidden)]
        #[allow(non_upper_case_globals, unused_attributes, unused_qualifications)]
        const _: () = {
            #[allow(unused_extern_crates, clippy::useless_attribute)]
            extern crate serde as _serde;
            #[automatically_derived]
            impl _serde::Serialize for CosmosStdFee {
                fn serialize<__S>(
                    &self,
                    __serializer: __S,
                ) -> _serde::__private::Result<__S::Ok, __S::Error>
                where
                    __S: _serde::Serializer,
                {
                    let mut __serde_state = match _serde::Serializer::serialize_struct(
                        __serializer,
                        "CosmosStdFee",
                        false as usize + 1 + 1,
                    ) {
                        _serde::__private::Ok(__val) => __val,
                        _serde::__private::Err(__err) => {
                            return _serde::__private::Err(__err);
                        }
                    };
                    match _serde::ser::SerializeStruct::serialize_field(
                        &mut __serde_state,
                        "amount",
                        &self.amount,
                    ) {
                        _serde::__private::Ok(__val) => __val,
                        _serde::__private::Err(__err) => {
                            return _serde::__private::Err(__err);
                        }
                    };
                    match _serde::ser::SerializeStruct::serialize_field(
                        &mut __serde_state,
                        "gas",
                        &self.gas,
                    ) {
                        _serde::__private::Ok(__val) => __val,
                        _serde::__private::Err(__err) => {
                            return _serde::__private::Err(__err);
                        }
                    };
                    _serde::ser::SerializeStruct::end(__serde_state)
                }
            }
        };
        #[doc(hidden)]
        #[allow(non_upper_case_globals, unused_attributes, unused_qualifications)]
        const _: () = {
            #[allow(unused_extern_crates, clippy::useless_attribute)]
            extern crate serde as _serde;
            #[automatically_derived]
            impl<'de> _serde::Deserialize<'de> for CosmosStdFee {
                fn deserialize<__D>(
                    __deserializer: __D,
                ) -> _serde::__private::Result<Self, __D::Error>
                where
                    __D: _serde::Deserializer<'de>,
                {
                    #[allow(non_camel_case_types)]
                    #[doc(hidden)]
                    enum __Field {
                        __field0,
                        __field1,
                        __ignore,
                    }
                    #[doc(hidden)]
                    struct __FieldVisitor;
                    impl<'de> _serde::de::Visitor<'de> for __FieldVisitor {
                        type Value = __Field;
                        fn expecting(
                            &self,
                            __formatter: &mut _serde::__private::Formatter,
                        ) -> _serde::__private::fmt::Result {
                            _serde::__private::Formatter::write_str(
                                __formatter,
                                "field identifier",
                            )
                        }
                        fn visit_u64<__E>(
                            self,
                            __value: u64,
                        ) -> _serde::__private::Result<Self::Value, __E>
                        where
                            __E: _serde::de::Error,
                        {
                            match __value {
                                0u64 => _serde::__private::Ok(__Field::__field0),
                                1u64 => _serde::__private::Ok(__Field::__field1),
                                _ => _serde::__private::Ok(__Field::__ignore),
                            }
                        }
                        fn visit_str<__E>(
                            self,
                            __value: &str,
                        ) -> _serde::__private::Result<Self::Value, __E>
                        where
                            __E: _serde::de::Error,
                        {
                            match __value {
                                "amount" => _serde::__private::Ok(__Field::__field0),
                                "gas" => _serde::__private::Ok(__Field::__field1),
                                _ => _serde::__private::Ok(__Field::__ignore),
                            }
                        }
                        fn visit_bytes<__E>(
                            self,
                            __value: &[u8],
                        ) -> _serde::__private::Result<Self::Value, __E>
                        where
                            __E: _serde::de::Error,
                        {
                            match __value {
                                b"amount" => _serde::__private::Ok(__Field::__field0),
                                b"gas" => _serde::__private::Ok(__Field::__field1),
                                _ => _serde::__private::Ok(__Field::__ignore),
                            }
                        }
                    }
                    impl<'de> _serde::Deserialize<'de> for __Field {
                        #[inline]
                        fn deserialize<__D>(
                            __deserializer: __D,
                        ) -> _serde::__private::Result<Self, __D::Error>
                        where
                            __D: _serde::Deserializer<'de>,
                        {
                            _serde::Deserializer::deserialize_identifier(
                                __deserializer,
                                __FieldVisitor,
                            )
                        }
                    }
                    #[doc(hidden)]
                    struct __Visitor<'de> {
                        marker: _serde::__private::PhantomData<CosmosStdFee>,
                        lifetime: _serde::__private::PhantomData<&'de ()>,
                    }
                    impl<'de> _serde::de::Visitor<'de> for __Visitor<'de> {
                        type Value = CosmosStdFee;
                        fn expecting(
                            &self,
                            __formatter: &mut _serde::__private::Formatter,
                        ) -> _serde::__private::fmt::Result {
                            _serde::__private::Formatter::write_str(
                                __formatter,
                                "struct CosmosStdFee",
                            )
                        }
                        #[inline]
                        fn visit_seq<__A>(
                            self,
                            mut __seq: __A,
                        ) -> _serde::__private::Result<Self::Value, __A::Error>
                        where
                            __A: _serde::de::SeqAccess<'de>,
                        {
                            let __field0 = match match _serde::de::SeqAccess::next_element::<
                                Vec<CosmosCoin>,
                            >(&mut __seq) {
                                _serde::__private::Ok(__val) => __val,
                                _serde::__private::Err(__err) => {
                                    return _serde::__private::Err(__err);
                                }
                            } {
                                _serde::__private::Some(__value) => __value,
                                _serde::__private::None => {
                                    return _serde::__private::Err(
                                        _serde::de::Error::invalid_length(
                                            0usize,
                                            &"struct CosmosStdFee with 2 elements",
                                        ),
                                    );
                                }
                            };
                            let __field1 = match match _serde::de::SeqAccess::next_element::<
                                String,
                            >(&mut __seq) {
                                _serde::__private::Ok(__val) => __val,
                                _serde::__private::Err(__err) => {
                                    return _serde::__private::Err(__err);
                                }
                            } {
                                _serde::__private::Some(__value) => __value,
                                _serde::__private::None => {
                                    return _serde::__private::Err(
                                        _serde::de::Error::invalid_length(
                                            1usize,
                                            &"struct CosmosStdFee with 2 elements",
                                        ),
                                    );
                                }
                            };
                            _serde::__private::Ok(CosmosStdFee {
                                amount: __field0,
                                gas: __field1,
                            })
                        }
                        #[inline]
                        fn visit_map<__A>(
                            self,
                            mut __map: __A,
                        ) -> _serde::__private::Result<Self::Value, __A::Error>
                        where
                            __A: _serde::de::MapAccess<'de>,
                        {
                            let mut __field0: _serde::__private::Option<
                                Vec<CosmosCoin>,
                            > = _serde::__private::None;
                            let mut __field1: _serde::__private::Option<String> = _serde::__private::None;
                            while let _serde::__private::Some(__key)
                                = match _serde::de::MapAccess::next_key::<
                                    __Field,
                                >(&mut __map) {
                                    _serde::__private::Ok(__val) => __val,
                                    _serde::__private::Err(__err) => {
                                        return _serde::__private::Err(__err);
                                    }
                                } {
                                match __key {
                                    __Field::__field0 => {
                                        if _serde::__private::Option::is_some(&__field0) {
                                            return _serde::__private::Err(
                                                <__A::Error as _serde::de::Error>::duplicate_field("amount"),
                                            );
                                        }
                                        __field0 = _serde::__private::Some(
                                            match _serde::de::MapAccess::next_value::<
                                                Vec<CosmosCoin>,
                                            >(&mut __map) {
                                                _serde::__private::Ok(__val) => __val,
                                                _serde::__private::Err(__err) => {
                                                    return _serde::__private::Err(__err);
                                                }
                                            },
                                        );
                                    }
                                    __Field::__field1 => {
                                        if _serde::__private::Option::is_some(&__field1) {
                                            return _serde::__private::Err(
                                                <__A::Error as _serde::de::Error>::duplicate_field("gas"),
                                            );
                                        }
                                        __field1 = _serde::__private::Some(
                                            match _serde::de::MapAccess::next_value::<
                                                String,
                                            >(&mut __map) {
                                                _serde::__private::Ok(__val) => __val,
                                                _serde::__private::Err(__err) => {
                                                    return _serde::__private::Err(__err);
                                                }
                                            },
                                        );
                                    }
                                    _ => {
                                        let _ = match _serde::de::MapAccess::next_value::<
                                            _serde::de::IgnoredAny,
                                        >(&mut __map) {
                                            _serde::__private::Ok(__val) => __val,
                                            _serde::__private::Err(__err) => {
                                                return _serde::__private::Err(__err);
                                            }
                                        };
                                    }
                                }
                            }
                            let __field0 = match __field0 {
                                _serde::__private::Some(__field0) => __field0,
                                _serde::__private::None => {
                                    match _serde::__private::de::missing_field("amount") {
                                        _serde::__private::Ok(__val) => __val,
                                        _serde::__private::Err(__err) => {
                                            return _serde::__private::Err(__err);
                                        }
                                    }
                                }
                            };
                            let __field1 = match __field1 {
                                _serde::__private::Some(__field1) => __field1,
                                _serde::__private::None => {
                                    match _serde::__private::de::missing_field("gas") {
                                        _serde::__private::Ok(__val) => __val,
                                        _serde::__private::Err(__err) => {
                                            return _serde::__private::Err(__err);
                                        }
                                    }
                                }
                            };
                            _serde::__private::Ok(CosmosStdFee {
                                amount: __field0,
                                gas: __field1,
                            })
                        }
                    }
                    #[doc(hidden)]
                    const FIELDS: &'static [&'static str] = &["amount", "gas"];
                    _serde::Deserializer::deserialize_struct(
                        __deserializer,
                        "CosmosStdFee",
                        FIELDS,
                        __Visitor {
                            marker: _serde::__private::PhantomData::<CosmosStdFee>,
                            lifetime: _serde::__private::PhantomData,
                        },
                    )
                }
            }
        };
        #[automatically_derived]
        impl ::core::fmt::Debug for CosmosStdFee {
            fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
                ::core::fmt::Formatter::debug_struct_field2_finish(
                    f,
                    "CosmosStdFee",
                    "amount",
                    &&self.amount,
                    "gas",
                    &&self.gas,
                )
            }
        }
        /**
* A Cosmos coin used in the fee information.
*/
        struct CosmosCoin {
            amount: String,
            denom: String,
        }
        #[doc(hidden)]
        #[allow(non_upper_case_globals, unused_attributes, unused_qualifications)]
        const _: () = {
            #[allow(unused_extern_crates, clippy::useless_attribute)]
            extern crate serde as _serde;
            #[automatically_derived]
            impl _serde::Serialize for CosmosCoin {
                fn serialize<__S>(
                    &self,
                    __serializer: __S,
                ) -> _serde::__private::Result<__S::Ok, __S::Error>
                where
                    __S: _serde::Serializer,
                {
                    let mut __serde_state = match _serde::Serializer::serialize_struct(
                        __serializer,
                        "CosmosCoin",
                        false as usize + 1 + 1,
                    ) {
                        _serde::__private::Ok(__val) => __val,
                        _serde::__private::Err(__err) => {
                            return _serde::__private::Err(__err);
                        }
                    };
                    match _serde::ser::SerializeStruct::serialize_field(
                        &mut __serde_state,
                        "amount",
                        &self.amount,
                    ) {
                        _serde::__private::Ok(__val) => __val,
                        _serde::__private::Err(__err) => {
                            return _serde::__private::Err(__err);
                        }
                    };
                    match _serde::ser::SerializeStruct::serialize_field(
                        &mut __serde_state,
                        "denom",
                        &self.denom,
                    ) {
                        _serde::__private::Ok(__val) => __val,
                        _serde::__private::Err(__err) => {
                            return _serde::__private::Err(__err);
                        }
                    };
                    _serde::ser::SerializeStruct::end(__serde_state)
                }
            }
        };
        #[doc(hidden)]
        #[allow(non_upper_case_globals, unused_attributes, unused_qualifications)]
        const _: () = {
            #[allow(unused_extern_crates, clippy::useless_attribute)]
            extern crate serde as _serde;
            #[automatically_derived]
            impl<'de> _serde::Deserialize<'de> for CosmosCoin {
                fn deserialize<__D>(
                    __deserializer: __D,
                ) -> _serde::__private::Result<Self, __D::Error>
                where
                    __D: _serde::Deserializer<'de>,
                {
                    #[allow(non_camel_case_types)]
                    #[doc(hidden)]
                    enum __Field {
                        __field0,
                        __field1,
                        __ignore,
                    }
                    #[doc(hidden)]
                    struct __FieldVisitor;
                    impl<'de> _serde::de::Visitor<'de> for __FieldVisitor {
                        type Value = __Field;
                        fn expecting(
                            &self,
                            __formatter: &mut _serde::__private::Formatter,
                        ) -> _serde::__private::fmt::Result {
                            _serde::__private::Formatter::write_str(
                                __formatter,
                                "field identifier",
                            )
                        }
                        fn visit_u64<__E>(
                            self,
                            __value: u64,
                        ) -> _serde::__private::Result<Self::Value, __E>
                        where
                            __E: _serde::de::Error,
                        {
                            match __value {
                                0u64 => _serde::__private::Ok(__Field::__field0),
                                1u64 => _serde::__private::Ok(__Field::__field1),
                                _ => _serde::__private::Ok(__Field::__ignore),
                            }
                        }
                        fn visit_str<__E>(
                            self,
                            __value: &str,
                        ) -> _serde::__private::Result<Self::Value, __E>
                        where
                            __E: _serde::de::Error,
                        {
                            match __value {
                                "amount" => _serde::__private::Ok(__Field::__field0),
                                "denom" => _serde::__private::Ok(__Field::__field1),
                                _ => _serde::__private::Ok(__Field::__ignore),
                            }
                        }
                        fn visit_bytes<__E>(
                            self,
                            __value: &[u8],
                        ) -> _serde::__private::Result<Self::Value, __E>
                        where
                            __E: _serde::de::Error,
                        {
                            match __value {
                                b"amount" => _serde::__private::Ok(__Field::__field0),
                                b"denom" => _serde::__private::Ok(__Field::__field1),
                                _ => _serde::__private::Ok(__Field::__ignore),
                            }
                        }
                    }
                    impl<'de> _serde::Deserialize<'de> for __Field {
                        #[inline]
                        fn deserialize<__D>(
                            __deserializer: __D,
                        ) -> _serde::__private::Result<Self, __D::Error>
                        where
                            __D: _serde::Deserializer<'de>,
                        {
                            _serde::Deserializer::deserialize_identifier(
                                __deserializer,
                                __FieldVisitor,
                            )
                        }
                    }
                    #[doc(hidden)]
                    struct __Visitor<'de> {
                        marker: _serde::__private::PhantomData<CosmosCoin>,
                        lifetime: _serde::__private::PhantomData<&'de ()>,
                    }
                    impl<'de> _serde::de::Visitor<'de> for __Visitor<'de> {
                        type Value = CosmosCoin;
                        fn expecting(
                            &self,
                            __formatter: &mut _serde::__private::Formatter,
                        ) -> _serde::__private::fmt::Result {
                            _serde::__private::Formatter::write_str(
                                __formatter,
                                "struct CosmosCoin",
                            )
                        }
                        #[inline]
                        fn visit_seq<__A>(
                            self,
                            mut __seq: __A,
                        ) -> _serde::__private::Result<Self::Value, __A::Error>
                        where
                            __A: _serde::de::SeqAccess<'de>,
                        {
                            let __field0 = match match _serde::de::SeqAccess::next_element::<
                                String,
                            >(&mut __seq) {
                                _serde::__private::Ok(__val) => __val,
                                _serde::__private::Err(__err) => {
                                    return _serde::__private::Err(__err);
                                }
                            } {
                                _serde::__private::Some(__value) => __value,
                                _serde::__private::None => {
                                    return _serde::__private::Err(
                                        _serde::de::Error::invalid_length(
                                            0usize,
                                            &"struct CosmosCoin with 2 elements",
                                        ),
                                    );
                                }
                            };
                            let __field1 = match match _serde::de::SeqAccess::next_element::<
                                String,
                            >(&mut __seq) {
                                _serde::__private::Ok(__val) => __val,
                                _serde::__private::Err(__err) => {
                                    return _serde::__private::Err(__err);
                                }
                            } {
                                _serde::__private::Some(__value) => __value,
                                _serde::__private::None => {
                                    return _serde::__private::Err(
                                        _serde::de::Error::invalid_length(
                                            1usize,
                                            &"struct CosmosCoin with 2 elements",
                                        ),
                                    );
                                }
                            };
                            _serde::__private::Ok(CosmosCoin {
                                amount: __field0,
                                denom: __field1,
                            })
                        }
                        #[inline]
                        fn visit_map<__A>(
                            self,
                            mut __map: __A,
                        ) -> _serde::__private::Result<Self::Value, __A::Error>
                        where
                            __A: _serde::de::MapAccess<'de>,
                        {
                            let mut __field0: _serde::__private::Option<String> = _serde::__private::None;
                            let mut __field1: _serde::__private::Option<String> = _serde::__private::None;
                            while let _serde::__private::Some(__key)
                                = match _serde::de::MapAccess::next_key::<
                                    __Field,
                                >(&mut __map) {
                                    _serde::__private::Ok(__val) => __val,
                                    _serde::__private::Err(__err) => {
                                        return _serde::__private::Err(__err);
                                    }
                                } {
                                match __key {
                                    __Field::__field0 => {
                                        if _serde::__private::Option::is_some(&__field0) {
                                            return _serde::__private::Err(
                                                <__A::Error as _serde::de::Error>::duplicate_field("amount"),
                                            );
                                        }
                                        __field0 = _serde::__private::Some(
                                            match _serde::de::MapAccess::next_value::<
                                                String,
                                            >(&mut __map) {
                                                _serde::__private::Ok(__val) => __val,
                                                _serde::__private::Err(__err) => {
                                                    return _serde::__private::Err(__err);
                                                }
                                            },
                                        );
                                    }
                                    __Field::__field1 => {
                                        if _serde::__private::Option::is_some(&__field1) {
                                            return _serde::__private::Err(
                                                <__A::Error as _serde::de::Error>::duplicate_field("denom"),
                                            );
                                        }
                                        __field1 = _serde::__private::Some(
                                            match _serde::de::MapAccess::next_value::<
                                                String,
                                            >(&mut __map) {
                                                _serde::__private::Ok(__val) => __val,
                                                _serde::__private::Err(__err) => {
                                                    return _serde::__private::Err(__err);
                                                }
                                            },
                                        );
                                    }
                                    _ => {
                                        let _ = match _serde::de::MapAccess::next_value::<
                                            _serde::de::IgnoredAny,
                                        >(&mut __map) {
                                            _serde::__private::Ok(__val) => __val,
                                            _serde::__private::Err(__err) => {
                                                return _serde::__private::Err(__err);
                                            }
                                        };
                                    }
                                }
                            }
                            let __field0 = match __field0 {
                                _serde::__private::Some(__field0) => __field0,
                                _serde::__private::None => {
                                    match _serde::__private::de::missing_field("amount") {
                                        _serde::__private::Ok(__val) => __val,
                                        _serde::__private::Err(__err) => {
                                            return _serde::__private::Err(__err);
                                        }
                                    }
                                }
                            };
                            let __field1 = match __field1 {
                                _serde::__private::Some(__field1) => __field1,
                                _serde::__private::None => {
                                    match _serde::__private::de::missing_field("denom") {
                                        _serde::__private::Ok(__val) => __val,
                                        _serde::__private::Err(__err) => {
                                            return _serde::__private::Err(__err);
                                        }
                                    }
                                }
                            };
                            _serde::__private::Ok(CosmosCoin {
                                amount: __field0,
                                denom: __field1,
                            })
                        }
                    }
                    #[doc(hidden)]
                    const FIELDS: &'static [&'static str] = &["amount", "denom"];
                    _serde::Deserializer::deserialize_struct(
                        __deserializer,
                        "CosmosCoin",
                        FIELDS,
                        __Visitor {
                            marker: _serde::__private::PhantomData::<CosmosCoin>,
                            lifetime: _serde::__private::PhantomData,
                        },
                    )
                }
            }
        };
        #[automatically_derived]
        impl ::core::fmt::Debug for CosmosCoin {
            fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
                ::core::fmt::Formatter::debug_struct_field2_finish(
                    f,
                    "CosmosCoin",
                    "amount",
                    &&self.amount,
                    "denom",
                    &&self.denom,
                )
            }
        }
        /**
 * A Secp256k1 pubkey used in Cosmos.
 */
        pub struct CosmosPubkey(pub [u8; Self::LEN]);
        impl borsh::de::BorshDeserialize for CosmosPubkey {
            fn deserialize(
                buf: &mut &[u8],
            ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
                Ok(Self(borsh::BorshDeserialize::deserialize(buf)?))
            }
        }
        impl borsh::ser::BorshSerialize for CosmosPubkey {
            fn serialize<W: borsh::maybestd::io::Write>(
                &self,
                writer: &mut W,
            ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                borsh::BorshSerialize::serialize(&self.0, writer)?;
                Ok(())
            }
        }
        #[automatically_derived]
        impl ::core::clone::Clone for CosmosPubkey {
            #[inline]
            fn clone(&self) -> CosmosPubkey {
                let _: ::core::clone::AssertParamIsClone<[u8; Self::LEN]>;
                *self
            }
        }
        #[automatically_derived]
        impl ::core::marker::Copy for CosmosPubkey {}
        #[automatically_derived]
        impl ::core::marker::StructuralPartialEq for CosmosPubkey {}
        #[automatically_derived]
        impl ::core::cmp::PartialEq for CosmosPubkey {
            #[inline]
            fn eq(&self, other: &CosmosPubkey) -> bool {
                self.0 == other.0
            }
        }
        impl CosmosPubkey {
            pub const LEN: usize = 65;
        }
        pub struct CosmosBech32Address(pub String);
        impl borsh::de::BorshDeserialize for CosmosBech32Address {
            fn deserialize(
                buf: &mut &[u8],
            ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
                Ok(Self(borsh::BorshDeserialize::deserialize(buf)?))
            }
        }
        impl borsh::ser::BorshSerialize for CosmosBech32Address {
            fn serialize<W: borsh::maybestd::io::Write>(
                &self,
                writer: &mut W,
            ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                borsh::BorshSerialize::serialize(&self.0, writer)?;
                Ok(())
            }
        }
        #[automatically_derived]
        impl ::core::clone::Clone for CosmosBech32Address {
            #[inline]
            fn clone(&self) -> CosmosBech32Address {
                CosmosBech32Address(::core::clone::Clone::clone(&self.0))
            }
        }
        impl CosmosPubkey {
            /** Cosmos public addresses are different than the public key.
     * This one way algorithm converts the public key to the public address.
     * Note that the claimant needs to submit the public key to the program
     * to verify the signature.
     */
            pub fn into_bech32(self, chain_id: &str) -> CosmosBech32Address {
                let mut compressed: [u8; SECP256K1_COMPRESSED_PUBKEY_LENGTH] = [0; SECP256K1_COMPRESSED_PUBKEY_LENGTH];
                compressed[1..]
                    .copy_from_slice(&self.0[1..SECP256K1_COMPRESSED_PUBKEY_LENGTH]);
                compressed[0] = if self.0[Self::LEN - 1] % 2 == 0 {
                    SECP256K1_EVEN_PREFIX
                } else {
                    SECP256K1_ODD_PREFIX
                };
                let hash1 = hash::hashv(&[&compressed]);
                let mut hasher: ripemd::Ripemd160 = ripemd::Ripemd160::new();
                hasher.update(hash1);
                let hash2 = hasher.finalize();
                CosmosBech32Address(
                    bech32::encode(chain_id, hash2.to_base32(), bech32::Variant::Bech32)
                        .unwrap(),
                )
            }
        }
    }
    pub mod evm {
        use {
            crate::ErrorCode,
            anchor_lang::{prelude::*, AnchorDeserialize, AnchorSerialize},
            std::str,
        };
        pub const EVM_MESSAGE_PREFIX: &str = "\x19Ethereum Signed Message:\n";
        /**
 * An EIP-191 prefixed message.
 * When a browser wallet signs a message, it prepends the message with a prefix and the length of a message.
 * This struct represents the prefixed message and helps with creating and verifying it.
 */
        pub struct EvmPrefixedMessage(Vec<u8>);
        impl borsh::de::BorshDeserialize for EvmPrefixedMessage {
            fn deserialize(
                buf: &mut &[u8],
            ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
                Ok(Self(borsh::BorshDeserialize::deserialize(buf)?))
            }
        }
        impl borsh::ser::BorshSerialize for EvmPrefixedMessage {
            fn serialize<W: borsh::maybestd::io::Write>(
                &self,
                writer: &mut W,
            ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                borsh::BorshSerialize::serialize(&self.0, writer)?;
                Ok(())
            }
        }
        #[automatically_derived]
        impl ::core::clone::Clone for EvmPrefixedMessage {
            #[inline]
            fn clone(&self) -> EvmPrefixedMessage {
                EvmPrefixedMessage(::core::clone::Clone::clone(&self.0))
            }
        }
        impl EvmPrefixedMessage {
            pub fn parse(data: &[u8]) -> Result<Self> {
                if data.starts_with(EVM_MESSAGE_PREFIX.as_bytes()) {
                    let length_with_message_length_prefix = data
                        .len()
                        .saturating_sub(EVM_MESSAGE_PREFIX.len());
                    let length = get_message_length(length_with_message_length_prefix)?;
                    if data[EVM_MESSAGE_PREFIX.len()..]
                        .starts_with(length.to_string().as_bytes())
                    {
                        return Ok(
                            Self(
                                data[EVM_MESSAGE_PREFIX.len()
                                        + length_with_message_length_prefix
                                            .saturating_sub(length)..]
                                    .to_vec(),
                            ),
                        );
                    }
                }
                Err(ErrorCode::SignatureVerificationWrongMessageMetadata.into())
            }
            pub fn get_payload(&self) -> &[u8] {
                self.0.as_slice()
            }
        }
        pub fn get_message_length(l: usize) -> Result<usize> {
            let mut number_of_digits = 0;
            let mut upperbound = 1;
            while l >= upperbound + number_of_digits {
                if l == upperbound + number_of_digits {
                    return Err(
                        ErrorCode::SignatureVerificationWrongMessageMetadata.into(),
                    );
                }
                number_of_digits += 1;
                upperbound *= 10;
            }
            Ok(l.saturating_sub(number_of_digits))
        }
    }
    pub mod secp256k1 {
        use {
            super::cosmos::CosmosPubkey, crate::ErrorCode,
            anchor_lang::{
                prelude::*,
                solana_program::{
                    hash, instruction::Instruction,
                    secp256k1_program::ID as SECP256K1_ID,
                    secp256k1_recover::secp256k1_recover,
                },
                AnchorDeserialize, AnchorSerialize,
            },
        };
        use crate::ProgramError::BorshIoError;
        pub const SECP256K1_FULL_PREFIX: u8 = 0x04;
        pub const SECP256K1_ODD_PREFIX: u8 = 0x03;
        pub const SECP256K1_EVEN_PREFIX: u8 = 0x02;
        pub const SECP256K1_COMPRESSED_PUBKEY_LENGTH: usize = 33;
        pub struct EvmPubkey(pub [u8; Self::LEN]);
        impl borsh::de::BorshDeserialize for EvmPubkey {
            fn deserialize(
                buf: &mut &[u8],
            ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
                Ok(Self(borsh::BorshDeserialize::deserialize(buf)?))
            }
        }
        impl borsh::ser::BorshSerialize for EvmPubkey {
            fn serialize<W: borsh::maybestd::io::Write>(
                &self,
                writer: &mut W,
            ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                borsh::BorshSerialize::serialize(&self.0, writer)?;
                Ok(())
            }
        }
        #[automatically_derived]
        impl ::core::clone::Clone for EvmPubkey {
            #[inline]
            fn clone(&self) -> EvmPubkey {
                let _: ::core::clone::AssertParamIsClone<[u8; Self::LEN]>;
                *self
            }
        }
        #[automatically_derived]
        impl ::core::marker::Copy for EvmPubkey {}
        #[automatically_derived]
        impl ::core::marker::StructuralPartialEq for EvmPubkey {}
        #[automatically_derived]
        impl ::core::cmp::PartialEq for EvmPubkey {
            #[inline]
            fn eq(&self, other: &EvmPubkey) -> bool {
                self.0 == other.0
            }
        }
        impl EvmPubkey {
            pub const LEN: usize = 20;
        }
        pub struct Secp256k1Signature(pub [u8; Secp256k1Signature::LEN]);
        impl borsh::de::BorshDeserialize for Secp256k1Signature {
            fn deserialize(
                buf: &mut &[u8],
            ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
                Ok(Self(borsh::BorshDeserialize::deserialize(buf)?))
            }
        }
        impl borsh::ser::BorshSerialize for Secp256k1Signature {
            fn serialize<W: borsh::maybestd::io::Write>(
                &self,
                writer: &mut W,
            ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                borsh::BorshSerialize::serialize(&self.0, writer)?;
                Ok(())
            }
        }
        #[automatically_derived]
        impl ::core::clone::Clone for Secp256k1Signature {
            #[inline]
            fn clone(&self) -> Secp256k1Signature {
                Secp256k1Signature(::core::clone::Clone::clone(&self.0))
            }
        }
        impl Secp256k1Signature {
            pub const LEN: usize = 64;
        }
        pub struct Secp256k1InstructionHeader {
            pub num_signatures: u8,
            pub signature_offset: u16,
            pub signature_instruction_index: u8,
            pub eth_address_offset: u16,
            pub eth_address_instruction_index: u8,
            pub message_data_offset: u16,
            pub message_data_size: u16,
            pub message_instruction_index: u8,
        }
        impl borsh::de::BorshDeserialize for Secp256k1InstructionHeader
        where
            u8: borsh::BorshDeserialize,
            u16: borsh::BorshDeserialize,
            u8: borsh::BorshDeserialize,
            u16: borsh::BorshDeserialize,
            u8: borsh::BorshDeserialize,
            u16: borsh::BorshDeserialize,
            u16: borsh::BorshDeserialize,
            u8: borsh::BorshDeserialize,
        {
            fn deserialize(
                buf: &mut &[u8],
            ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
                Ok(Self {
                    num_signatures: borsh::BorshDeserialize::deserialize(buf)?,
                    signature_offset: borsh::BorshDeserialize::deserialize(buf)?,
                    signature_instruction_index: borsh::BorshDeserialize::deserialize(
                        buf,
                    )?,
                    eth_address_offset: borsh::BorshDeserialize::deserialize(buf)?,
                    eth_address_instruction_index: borsh::BorshDeserialize::deserialize(
                        buf,
                    )?,
                    message_data_offset: borsh::BorshDeserialize::deserialize(buf)?,
                    message_data_size: borsh::BorshDeserialize::deserialize(buf)?,
                    message_instruction_index: borsh::BorshDeserialize::deserialize(buf)?,
                })
            }
        }
        impl borsh::ser::BorshSerialize for Secp256k1InstructionHeader
        where
            u8: borsh::ser::BorshSerialize,
            u16: borsh::ser::BorshSerialize,
            u8: borsh::ser::BorshSerialize,
            u16: borsh::ser::BorshSerialize,
            u8: borsh::ser::BorshSerialize,
            u16: borsh::ser::BorshSerialize,
            u16: borsh::ser::BorshSerialize,
            u8: borsh::ser::BorshSerialize,
        {
            fn serialize<W: borsh::maybestd::io::Write>(
                &self,
                writer: &mut W,
            ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                borsh::BorshSerialize::serialize(&self.num_signatures, writer)?;
                borsh::BorshSerialize::serialize(&self.signature_offset, writer)?;
                borsh::BorshSerialize::serialize(
                    &self.signature_instruction_index,
                    writer,
                )?;
                borsh::BorshSerialize::serialize(&self.eth_address_offset, writer)?;
                borsh::BorshSerialize::serialize(
                    &self.eth_address_instruction_index,
                    writer,
                )?;
                borsh::BorshSerialize::serialize(&self.message_data_offset, writer)?;
                borsh::BorshSerialize::serialize(&self.message_data_size, writer)?;
                borsh::BorshSerialize::serialize(
                    &self.message_instruction_index,
                    writer,
                )?;
                Ok(())
            }
        }
        #[automatically_derived]
        impl ::core::clone::Clone for Secp256k1InstructionHeader {
            #[inline]
            fn clone(&self) -> Secp256k1InstructionHeader {
                Secp256k1InstructionHeader {
                    num_signatures: ::core::clone::Clone::clone(&self.num_signatures),
                    signature_offset: ::core::clone::Clone::clone(
                        &self.signature_offset,
                    ),
                    signature_instruction_index: ::core::clone::Clone::clone(
                        &self.signature_instruction_index,
                    ),
                    eth_address_offset: ::core::clone::Clone::clone(
                        &self.eth_address_offset,
                    ),
                    eth_address_instruction_index: ::core::clone::Clone::clone(
                        &self.eth_address_instruction_index,
                    ),
                    message_data_offset: ::core::clone::Clone::clone(
                        &self.message_data_offset,
                    ),
                    message_data_size: ::core::clone::Clone::clone(
                        &self.message_data_size,
                    ),
                    message_instruction_index: ::core::clone::Clone::clone(
                        &self.message_instruction_index,
                    ),
                }
            }
        }
        #[automatically_derived]
        impl ::core::marker::StructuralPartialEq for Secp256k1InstructionHeader {}
        #[automatically_derived]
        impl ::core::cmp::PartialEq for Secp256k1InstructionHeader {
            #[inline]
            fn eq(&self, other: &Secp256k1InstructionHeader) -> bool {
                self.num_signatures == other.num_signatures
                    && self.signature_offset == other.signature_offset
                    && self.signature_instruction_index
                        == other.signature_instruction_index
                    && self.eth_address_offset == other.eth_address_offset
                    && self.eth_address_instruction_index
                        == other.eth_address_instruction_index
                    && self.message_data_offset == other.message_data_offset
                    && self.message_data_size == other.message_data_size
                    && self.message_instruction_index == other.message_instruction_index
            }
        }
        #[automatically_derived]
        impl ::core::marker::StructuralEq for Secp256k1InstructionHeader {}
        #[automatically_derived]
        impl ::core::cmp::Eq for Secp256k1InstructionHeader {
            #[inline]
            #[doc(hidden)]
            #[no_coverage]
            fn assert_receiver_is_total_eq(&self) -> () {
                let _: ::core::cmp::AssertParamIsEq<u8>;
                let _: ::core::cmp::AssertParamIsEq<u16>;
            }
        }
        #[automatically_derived]
        impl ::core::fmt::Debug for Secp256k1InstructionHeader {
            fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
                let names: &'static _ = &[
                    "num_signatures",
                    "signature_offset",
                    "signature_instruction_index",
                    "eth_address_offset",
                    "eth_address_instruction_index",
                    "message_data_offset",
                    "message_data_size",
                    "message_instruction_index",
                ];
                let values: &[&dyn ::core::fmt::Debug] = &[
                    &&self.num_signatures,
                    &&self.signature_offset,
                    &&self.signature_instruction_index,
                    &&self.eth_address_offset,
                    &&self.eth_address_instruction_index,
                    &&self.message_data_offset,
                    &&self.message_data_size,
                    &&self.message_instruction_index,
                ];
                ::core::fmt::Formatter::debug_struct_fields_finish(
                    f,
                    "Secp256k1InstructionHeader",
                    names,
                    values,
                )
            }
        }
        impl Secp256k1InstructionHeader {
            pub const LEN: u16 = 1 + 2 + 1 + 2 + 1 + 2 + 2 + 1;
        }
        /// The layout of a Secp256k1 signature verification instruction on Solana
        pub struct Secp256k1InstructionData {
            pub header: Secp256k1InstructionHeader,
            pub signature: Secp256k1Signature,
            pub recovery_id: u8,
            pub eth_address: EvmPubkey,
            pub message: Vec<u8>,
        }
        impl Secp256k1InstructionHeader {
            pub fn expected_header(message_length: u16, instruction_index: u8) -> Self {
                Secp256k1InstructionHeader {
                    num_signatures: 1,
                    signature_offset: Secp256k1InstructionHeader::LEN,
                    signature_instruction_index: instruction_index,
                    eth_address_offset: Secp256k1InstructionHeader::LEN
                        + Secp256k1Signature::LEN as u16 + 1,
                    eth_address_instruction_index: instruction_index,
                    message_data_offset: Secp256k1InstructionHeader::LEN
                        + Secp256k1Signature::LEN as u16 + 1 + EvmPubkey::LEN as u16,
                    message_data_size: message_length,
                    message_instruction_index: instruction_index,
                }
            }
        }
        impl Secp256k1InstructionData {
            pub fn from_instruction_and_check_signer(
                instruction: &Instruction,
                pubkey: &EvmPubkey,
                verification_instruction_index: &u8,
            ) -> Result<Vec<u8>> {
                if instruction.program_id != SECP256K1_ID {
                    return Err(ErrorCode::SignatureVerificationWrongProgram.into());
                }
                if !instruction.accounts.is_empty() {
                    return Err(ErrorCode::SignatureVerificationWrongAccounts.into());
                }
                let result = Self::try_from_slice(&instruction.data)?;
                if (result.header.message_instruction_index
                    != *verification_instruction_index)
                    || (result.header
                        != Secp256k1InstructionHeader::expected_header(
                            result.header.message_data_size,
                            result.header.message_instruction_index,
                        ))
                {
                    return Err(ErrorCode::SignatureVerificationWrongHeader.into());
                }
                if result.eth_address != *pubkey {
                    return Err(ErrorCode::SignatureVerificationWrongSigner.into());
                }
                Ok(result.message)
            }
        }
        impl AnchorDeserialize for Secp256k1InstructionData {
            fn deserialize(
                buf: &mut &[u8],
            ) -> std::result::Result<Secp256k1InstructionData, std::io::Error> {
                let header = Secp256k1InstructionHeader::deserialize(buf)?;
                let signature = Secp256k1Signature::deserialize(buf)?;
                let recovery_id = u8::deserialize(buf)?;
                let eth_address = EvmPubkey::deserialize(buf)?;
                let mut message: Vec<u8> = ::alloc::vec::Vec::new();
                message.extend_from_slice(&buf[..header.message_data_size as usize]);
                *buf = &buf[header.message_data_size as usize..];
                Ok(Secp256k1InstructionData {
                    header,
                    eth_address,
                    signature,
                    recovery_id,
                    message,
                })
            }
        }
        impl AnchorSerialize for Secp256k1InstructionData {
            fn serialize<W: std::io::Write>(
                &self,
                writer: &mut W,
            ) -> std::result::Result<(), std::io::Error> {
                self.header.serialize(writer)?;
                self.signature.serialize(writer)?;
                self.recovery_id.serialize(writer)?;
                self.eth_address.serialize(writer)?;
                writer.write_all(&self.message)?;
                Ok(())
            }
        }
        /** Cosmos uses a different signing algorith than Evm for signing
 * messages. Instead of using Keccak256, Cosmos uses SHA256. This prevents
 * us from using the Secp256k1 instruction struct for Cosmos.
 */
        pub fn secp256k1_sha256_verify_signer(
            signature: &Secp256k1Signature,
            recovery_id: &u8,
            pubkey: &CosmosPubkey,
            message: &Vec<u8>,
        ) -> Result<()> {
            let recovered_key = secp256k1_recover(
                    &hash::hashv(&[message]).to_bytes(),
                    *recovery_id,
                    &signature.0,
                )
                .map_err(|_| ErrorCode::SignatureVerificationWrongSigner)?;
            if !(recovered_key.0 == pubkey.0[1..]
                && pubkey.0[0] == SECP256K1_FULL_PREFIX)
            {
                return Err(ErrorCode::SignatureVerificationWrongSigner.into());
            }
            Ok(())
        }
    }
    /**
 * Ecosystem agnostic authorization message that the identity on the leaf needs to sign.
 * */
    pub const AUTHORIZATION_MESSAGE: [&str; 3] = [
        "Pyth Grant Program ID:\n",
        "\nI irrevocably authorize Solana wallet\n",
        "\nto withdraw my token allocation.\n",
    ];
    /**
 * Check a message matches the expected authorization message.
 */
    pub fn check_message(message: &[u8], claimant: &Pubkey) -> Result<()> {
        if message != get_expected_message(claimant).as_bytes() {
            return Err(ErrorCode::SignatureVerificationWrongMessage.into());
        }
        Ok(())
    }
    /**
 * Get the expected authorization message given the claimant authorized to receive the claim.
 */
    pub fn get_expected_message(claimant: &Pubkey) -> String {
        AUTHORIZATION_MESSAGE[0].to_string() + &crate::ID.to_string()
            + AUTHORIZATION_MESSAGE[1] + claimant.to_string().as_str()
            + AUTHORIZATION_MESSAGE[2]
    }
}
/// The static program ID
pub static ID: anchor_lang::solana_program::pubkey::Pubkey = anchor_lang::solana_program::pubkey::Pubkey::new_from_array([
    218u8,
    7u8,
    92u8,
    178u8,
    255u8,
    94u8,
    198u8,
    129u8,
    118u8,
    19u8,
    222u8,
    83u8,
    11u8,
    105u8,
    42u8,
    135u8,
    53u8,
    71u8,
    119u8,
    105u8,
    218u8,
    71u8,
    67u8,
    12u8,
    189u8,
    129u8,
    84u8,
    51u8,
    92u8,
    74u8,
    131u8,
    39u8,
]);
/// Confirms that a given pubkey is equivalent to the program ID
pub fn check_id(id: &anchor_lang::solana_program::pubkey::Pubkey) -> bool {
    id == &ID
}
/// Returns the program ID
pub fn id() -> anchor_lang::solana_program::pubkey::Pubkey {
    ID
}
const CONFIG_SEED: &[u8] = b"config";
const RECEIPT_SEED: &[u8] = b"receipt";
const CART_SEED: &[u8] = b"cart";
use self::token_dispenser::*;
/// # Safety
#[no_mangle]
pub unsafe extern "C" fn entrypoint(input: *mut u8) -> u64 {
    let (program_id, accounts, instruction_data) = unsafe {
        ::solana_program::entrypoint::deserialize(input)
    };
    match entry(&program_id, &accounts, &instruction_data) {
        Ok(()) => ::solana_program::entrypoint::SUCCESS,
        Err(error) => error.into(),
    }
}
/// The Anchor codegen exposes a programming model where a user defines
/// a set of methods inside of a `#[program]` module in a way similar
/// to writing RPC request handlers. The macro then generates a bunch of
/// code wrapping these user defined methods into something that can be
/// executed on Solana.
///
/// These methods fall into one categorie for now.
///
/// Global methods - regular methods inside of the `#[program]`.
///
/// Care must be taken by the codegen to prevent collisions between
/// methods in these different namespaces. For this reason, Anchor uses
/// a variant of sighash to perform method dispatch, rather than
/// something like a simple enum variant discriminator.
///
/// The execution flow of the generated code can be roughly outlined:
///
/// * Start program via the entrypoint.
/// * Strip method identifier off the first 8 bytes of the instruction
///   data and invoke the identified method. The method identifier
///   is a variant of sighash. See docs.rs for `anchor_lang` for details.
/// * If the method identifier is an IDL identifier, execute the IDL
///   instructions, which are a special set of hardcoded instructions
///   baked into every Anchor program. Then exit.
/// * Otherwise, the method identifier is for a user defined
///   instruction, i.e., one of the methods in the user defined
///   `#[program]` module. Perform method dispatch, i.e., execute the
///   big match statement mapping method identifier to method handler
///   wrapper.
/// * Run the method handler wrapper. This wraps the code the user
///   actually wrote, deserializing the accounts, constructing the
///   context, invoking the user's code, and finally running the exit
///   routine, which typically persists account changes.
///
/// The `entry` function here, defines the standard entry to a Solana
/// program, where execution begins.
pub fn entry(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> anchor_lang::solana_program::entrypoint::ProgramResult {
    try_entry(program_id, accounts, data)
        .map_err(|e| {
            e.log();
            e.into()
        })
}
fn try_entry(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> anchor_lang::Result<()> {
    if *program_id != ID {
        return Err(anchor_lang::error::ErrorCode::DeclaredProgramIdMismatch.into());
    }
    if data.len() < 8 {
        return Err(anchor_lang::error::ErrorCode::InstructionMissing.into());
    }
    dispatch(program_id, accounts, data)
}
/// Module representing the program.
pub mod program {
    use super::*;
    /// Type representing the program.
    pub struct TokenDispenser;
    #[automatically_derived]
    impl ::core::clone::Clone for TokenDispenser {
        #[inline]
        fn clone(&self) -> TokenDispenser {
            TokenDispenser
        }
    }
    impl anchor_lang::Id for TokenDispenser {
        fn id() -> Pubkey {
            ID
        }
    }
}
/// Performs method dispatch.
///
/// Each method in an anchor program is uniquely defined by a namespace
/// and a rust identifier (i.e., the name given to the method). These
/// two pieces can be combined to creater a method identifier,
/// specifically, Anchor uses
///
/// Sha256("<namespace>:<rust-identifier>")[..8],
///
/// where the namespace can be one type. "global" for a
/// regular instruction.
///
/// With this 8 byte identifier, Anchor performs method dispatch,
/// matching the given 8 byte identifier to the associated method
/// handler, which leads to user defined code being eventually invoked.
fn dispatch(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> anchor_lang::Result<()> {
    let mut ix_data: &[u8] = data;
    let sighash: [u8; 8] = {
        let mut sighash: [u8; 8] = [0; 8];
        sighash.copy_from_slice(&ix_data[..8]);
        ix_data = &ix_data[8..];
        sighash
    };
    use anchor_lang::Discriminator;
    match sighash {
        instruction::Initialize::DISCRIMINATOR => {
            __private::__global::initialize(program_id, accounts, ix_data)
        }
        instruction::Claim::DISCRIMINATOR => {
            __private::__global::claim(program_id, accounts, ix_data)
        }
        instruction::Checkout::DISCRIMINATOR => {
            __private::__global::checkout(program_id, accounts, ix_data)
        }
        anchor_lang::idl::IDL_IX_TAG_LE => {
            if true {
                __private::__idl::__idl_dispatch(program_id, accounts, &ix_data)
            } else {
                Err(anchor_lang::error::ErrorCode::IdlInstructionStub.into())
            }
        }
        _ => Err(anchor_lang::error::ErrorCode::InstructionFallbackNotFound.into()),
    }
}
/// Create a private module to not clutter the program's namespace.
/// Defines an entrypoint for each individual instruction handler
/// wrapper.
mod __private {
    use super::*;
    /// __idl mod defines handlers for injected Anchor IDL instructions.
    pub mod __idl {
        use super::*;
        #[inline(never)]
        #[cfg(not(feature = "no-idl"))]
        pub fn __idl_dispatch(
            program_id: &Pubkey,
            accounts: &[AccountInfo],
            idl_ix_data: &[u8],
        ) -> anchor_lang::Result<()> {
            let mut accounts = accounts;
            let mut data: &[u8] = idl_ix_data;
            let ix = anchor_lang::idl::IdlInstruction::deserialize(&mut data)
                .map_err(|_| {
                    anchor_lang::error::ErrorCode::InstructionDidNotDeserialize
                })?;
            match ix {
                anchor_lang::idl::IdlInstruction::Create { data_len } => {
                    let mut bumps = std::collections::BTreeMap::new();
                    let mut reallocs = std::collections::BTreeSet::new();
                    let mut accounts = IdlCreateAccounts::try_accounts(
                        program_id,
                        &mut accounts,
                        &[],
                        &mut bumps,
                        &mut reallocs,
                    )?;
                    __idl_create_account(program_id, &mut accounts, data_len)?;
                    accounts.exit(program_id)?;
                }
                anchor_lang::idl::IdlInstruction::Resize { data_len } => {
                    let mut bumps = std::collections::BTreeMap::new();
                    let mut reallocs = std::collections::BTreeSet::new();
                    let mut accounts = IdlResizeAccount::try_accounts(
                        program_id,
                        &mut accounts,
                        &[],
                        &mut bumps,
                        &mut reallocs,
                    )?;
                    __idl_resize_account(program_id, &mut accounts, data_len)?;
                    accounts.exit(program_id)?;
                }
                anchor_lang::idl::IdlInstruction::Close => {
                    let mut bumps = std::collections::BTreeMap::new();
                    let mut reallocs = std::collections::BTreeSet::new();
                    let mut accounts = IdlCloseAccount::try_accounts(
                        program_id,
                        &mut accounts,
                        &[],
                        &mut bumps,
                        &mut reallocs,
                    )?;
                    __idl_close_account(program_id, &mut accounts)?;
                    accounts.exit(program_id)?;
                }
                anchor_lang::idl::IdlInstruction::CreateBuffer => {
                    let mut bumps = std::collections::BTreeMap::new();
                    let mut reallocs = std::collections::BTreeSet::new();
                    let mut accounts = IdlCreateBuffer::try_accounts(
                        program_id,
                        &mut accounts,
                        &[],
                        &mut bumps,
                        &mut reallocs,
                    )?;
                    __idl_create_buffer(program_id, &mut accounts)?;
                    accounts.exit(program_id)?;
                }
                anchor_lang::idl::IdlInstruction::Write { data } => {
                    let mut bumps = std::collections::BTreeMap::new();
                    let mut reallocs = std::collections::BTreeSet::new();
                    let mut accounts = IdlAccounts::try_accounts(
                        program_id,
                        &mut accounts,
                        &[],
                        &mut bumps,
                        &mut reallocs,
                    )?;
                    __idl_write(program_id, &mut accounts, data)?;
                    accounts.exit(program_id)?;
                }
                anchor_lang::idl::IdlInstruction::SetAuthority { new_authority } => {
                    let mut bumps = std::collections::BTreeMap::new();
                    let mut reallocs = std::collections::BTreeSet::new();
                    let mut accounts = IdlAccounts::try_accounts(
                        program_id,
                        &mut accounts,
                        &[],
                        &mut bumps,
                        &mut reallocs,
                    )?;
                    __idl_set_authority(program_id, &mut accounts, new_authority)?;
                    accounts.exit(program_id)?;
                }
                anchor_lang::idl::IdlInstruction::SetBuffer => {
                    let mut bumps = std::collections::BTreeMap::new();
                    let mut reallocs = std::collections::BTreeSet::new();
                    let mut accounts = IdlSetBuffer::try_accounts(
                        program_id,
                        &mut accounts,
                        &[],
                        &mut bumps,
                        &mut reallocs,
                    )?;
                    __idl_set_buffer(program_id, &mut accounts)?;
                    accounts.exit(program_id)?;
                }
            }
            Ok(())
        }
        use anchor_lang::idl::ERASED_AUTHORITY;
        pub struct IdlAccount {
            pub authority: Pubkey,
            pub data_len: u32,
        }
        #[automatically_derived]
        impl ::core::fmt::Debug for IdlAccount {
            fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
                ::core::fmt::Formatter::debug_struct_field2_finish(
                    f,
                    "IdlAccount",
                    "authority",
                    &&self.authority,
                    "data_len",
                    &&self.data_len,
                )
            }
        }
        impl borsh::ser::BorshSerialize for IdlAccount
        where
            Pubkey: borsh::ser::BorshSerialize,
            u32: borsh::ser::BorshSerialize,
        {
            fn serialize<W: borsh::maybestd::io::Write>(
                &self,
                writer: &mut W,
            ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                borsh::BorshSerialize::serialize(&self.authority, writer)?;
                borsh::BorshSerialize::serialize(&self.data_len, writer)?;
                Ok(())
            }
        }
        impl borsh::de::BorshDeserialize for IdlAccount
        where
            Pubkey: borsh::BorshDeserialize,
            u32: borsh::BorshDeserialize,
        {
            fn deserialize(
                buf: &mut &[u8],
            ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
                Ok(Self {
                    authority: borsh::BorshDeserialize::deserialize(buf)?,
                    data_len: borsh::BorshDeserialize::deserialize(buf)?,
                })
            }
        }
        #[automatically_derived]
        impl ::core::clone::Clone for IdlAccount {
            #[inline]
            fn clone(&self) -> IdlAccount {
                IdlAccount {
                    authority: ::core::clone::Clone::clone(&self.authority),
                    data_len: ::core::clone::Clone::clone(&self.data_len),
                }
            }
        }
        #[automatically_derived]
        impl anchor_lang::AccountSerialize for IdlAccount {
            fn try_serialize<W: std::io::Write>(
                &self,
                writer: &mut W,
            ) -> anchor_lang::Result<()> {
                if writer.write_all(&[24, 70, 98, 191, 58, 144, 123, 158]).is_err() {
                    return Err(
                        anchor_lang::error::ErrorCode::AccountDidNotSerialize.into(),
                    );
                }
                if AnchorSerialize::serialize(self, writer).is_err() {
                    return Err(
                        anchor_lang::error::ErrorCode::AccountDidNotSerialize.into(),
                    );
                }
                Ok(())
            }
        }
        #[automatically_derived]
        impl anchor_lang::AccountDeserialize for IdlAccount {
            fn try_deserialize(buf: &mut &[u8]) -> anchor_lang::Result<Self> {
                if buf.len() < [24, 70, 98, 191, 58, 144, 123, 158].len() {
                    return Err(
                        anchor_lang::error::ErrorCode::AccountDiscriminatorNotFound
                            .into(),
                    );
                }
                let given_disc = &buf[..8];
                if &[24, 70, 98, 191, 58, 144, 123, 158] != given_disc {
                    return Err(
                        anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                                error_name: anchor_lang::error::ErrorCode::AccountDiscriminatorMismatch
                                    .name(),
                                error_code_number: anchor_lang::error::ErrorCode::AccountDiscriminatorMismatch
                                    .into(),
                                error_msg: anchor_lang::error::ErrorCode::AccountDiscriminatorMismatch
                                    .to_string(),
                                error_origin: Some(
                                    anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                        filename: "programs/token-dispenser/src/lib.rs",
                                        line: 66u32,
                                    }),
                                ),
                                compared_values: None,
                            })
                            .with_account_name("IdlAccount"),
                    );
                }
                Self::try_deserialize_unchecked(buf)
            }
            fn try_deserialize_unchecked(buf: &mut &[u8]) -> anchor_lang::Result<Self> {
                let mut data: &[u8] = &buf[8..];
                AnchorDeserialize::deserialize(&mut data)
                    .map_err(|_| {
                        anchor_lang::error::ErrorCode::AccountDidNotDeserialize.into()
                    })
            }
        }
        #[automatically_derived]
        impl anchor_lang::Discriminator for IdlAccount {
            const DISCRIMINATOR: [u8; 8] = [24, 70, 98, 191, 58, 144, 123, 158];
        }
        impl IdlAccount {
            pub fn address(program_id: &Pubkey) -> Pubkey {
                let program_signer = Pubkey::find_program_address(&[], program_id).0;
                Pubkey::create_with_seed(&program_signer, IdlAccount::seed(), program_id)
                    .expect("Seed is always valid")
            }
            pub fn seed() -> &'static str {
                "anchor:idl"
            }
        }
        impl anchor_lang::Owner for IdlAccount {
            fn owner() -> Pubkey {
                crate::ID
            }
        }
        pub struct IdlCreateAccounts<'info> {
            #[account(signer)]
            pub from: AccountInfo<'info>,
            #[account(mut)]
            pub to: AccountInfo<'info>,
            #[account(seeds = [], bump)]
            pub base: AccountInfo<'info>,
            pub system_program: Program<'info, System>,
            #[account(executable)]
            pub program: AccountInfo<'info>,
        }
        #[automatically_derived]
        impl<'info> anchor_lang::Accounts<'info> for IdlCreateAccounts<'info>
        where
            'info: 'info,
        {
            #[inline(never)]
            fn try_accounts(
                program_id: &anchor_lang::solana_program::pubkey::Pubkey,
                accounts: &mut &[anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >],
                ix_data: &[u8],
                __bumps: &mut std::collections::BTreeMap<String, u8>,
                __reallocs: &mut std::collections::BTreeSet<
                    anchor_lang::solana_program::pubkey::Pubkey,
                >,
            ) -> anchor_lang::Result<Self> {
                let from: AccountInfo = anchor_lang::Accounts::try_accounts(
                        program_id,
                        accounts,
                        ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("from"))?;
                let to: AccountInfo = anchor_lang::Accounts::try_accounts(
                        program_id,
                        accounts,
                        ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("to"))?;
                let base: AccountInfo = anchor_lang::Accounts::try_accounts(
                        program_id,
                        accounts,
                        ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("base"))?;
                let system_program: anchor_lang::accounts::program::Program<System> = anchor_lang::Accounts::try_accounts(
                        program_id,
                        accounts,
                        ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("system_program"))?;
                let program: AccountInfo = anchor_lang::Accounts::try_accounts(
                        program_id,
                        accounts,
                        ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("program"))?;
                if !from.is_signer {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintSigner,
                            )
                            .with_account_name("from"),
                    );
                }
                if !to.to_account_info().is_writable {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintMut,
                            )
                            .with_account_name("to"),
                    );
                }
                let (__pda_address, __bump) = Pubkey::find_program_address(
                    &[],
                    &program_id,
                );
                __bumps.insert("base".to_string(), __bump);
                if base.key() != __pda_address {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintSeeds,
                            )
                            .with_account_name("base")
                            .with_pubkeys((base.key(), __pda_address)),
                    );
                }
                if !program.to_account_info().executable {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintExecutable,
                            )
                            .with_account_name("program"),
                    );
                }
                Ok(IdlCreateAccounts {
                    from,
                    to,
                    base,
                    system_program,
                    program,
                })
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountInfos<'info> for IdlCreateAccounts<'info>
        where
            'info: 'info,
        {
            fn to_account_infos(
                &self,
            ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                let mut account_infos = ::alloc::vec::Vec::new();
                account_infos.extend(self.from.to_account_infos());
                account_infos.extend(self.to.to_account_infos());
                account_infos.extend(self.base.to_account_infos());
                account_infos.extend(self.system_program.to_account_infos());
                account_infos.extend(self.program.to_account_infos());
                account_infos
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountMetas for IdlCreateAccounts<'info> {
            fn to_account_metas(
                &self,
                is_signer: Option<bool>,
            ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                let mut account_metas = ::alloc::vec::Vec::new();
                account_metas.extend(self.from.to_account_metas(Some(true)));
                account_metas.extend(self.to.to_account_metas(None));
                account_metas.extend(self.base.to_account_metas(None));
                account_metas.extend(self.system_program.to_account_metas(None));
                account_metas.extend(self.program.to_account_metas(None));
                account_metas
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::AccountsExit<'info> for IdlCreateAccounts<'info>
        where
            'info: 'info,
        {
            fn exit(
                &self,
                program_id: &anchor_lang::solana_program::pubkey::Pubkey,
            ) -> anchor_lang::Result<()> {
                anchor_lang::AccountsExit::exit(&self.to, program_id)
                    .map_err(|e| e.with_account_name("to"))?;
                Ok(())
            }
        }
        /// An internal, Anchor generated module. This is used (as an
        /// implementation detail), to generate a struct for a given
        /// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
        /// instead of an `AccountInfo`. This is useful for clients that want
        /// to generate a list of accounts, without explicitly knowing the
        /// order all the fields should be in.
        ///
        /// To access the struct in this module, one should use the sibling
        /// `accounts` module (also generated), which re-exports this.
        pub(crate) mod __client_accounts_idl_create_accounts {
            use super::*;
            use anchor_lang::prelude::borsh;
            /// Generated client accounts for [`IdlCreateAccounts`].
            pub struct IdlCreateAccounts {
                pub from: anchor_lang::solana_program::pubkey::Pubkey,
                pub to: anchor_lang::solana_program::pubkey::Pubkey,
                pub base: anchor_lang::solana_program::pubkey::Pubkey,
                pub system_program: anchor_lang::solana_program::pubkey::Pubkey,
                pub program: anchor_lang::solana_program::pubkey::Pubkey,
            }
            impl borsh::ser::BorshSerialize for IdlCreateAccounts
            where
                anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
                anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
                anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
                anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
                anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            {
                fn serialize<W: borsh::maybestd::io::Write>(
                    &self,
                    writer: &mut W,
                ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                    borsh::BorshSerialize::serialize(&self.from, writer)?;
                    borsh::BorshSerialize::serialize(&self.to, writer)?;
                    borsh::BorshSerialize::serialize(&self.base, writer)?;
                    borsh::BorshSerialize::serialize(&self.system_program, writer)?;
                    borsh::BorshSerialize::serialize(&self.program, writer)?;
                    Ok(())
                }
            }
            #[automatically_derived]
            impl anchor_lang::ToAccountMetas for IdlCreateAccounts {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                self.from,
                                true,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                self.to,
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                self.base,
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                self.system_program,
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                self.program,
                                false,
                            ),
                        );
                    account_metas
                }
            }
        }
        /// An internal, Anchor generated module. This is used (as an
        /// implementation detail), to generate a CPI struct for a given
        /// `#[derive(Accounts)]` implementation, where each field is an
        /// AccountInfo.
        ///
        /// To access the struct in this module, one should use the sibling
        /// [`cpi::accounts`] module (also generated), which re-exports this.
        pub(crate) mod __cpi_client_accounts_idl_create_accounts {
            use super::*;
            /// Generated CPI struct of the accounts for [`IdlCreateAccounts`].
            pub struct IdlCreateAccounts<'info> {
                pub from: anchor_lang::solana_program::account_info::AccountInfo<'info>,
                pub to: anchor_lang::solana_program::account_info::AccountInfo<'info>,
                pub base: anchor_lang::solana_program::account_info::AccountInfo<'info>,
                pub system_program: anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >,
                pub program: anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >,
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountMetas for IdlCreateAccounts<'info> {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                anchor_lang::Key::key(&self.from),
                                true,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                anchor_lang::Key::key(&self.to),
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                anchor_lang::Key::key(&self.base),
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                anchor_lang::Key::key(&self.system_program),
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                anchor_lang::Key::key(&self.program),
                                false,
                            ),
                        );
                    account_metas
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountInfos<'info> for IdlCreateAccounts<'info> {
                fn to_account_infos(
                    &self,
                ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                    let mut account_infos = ::alloc::vec::Vec::new();
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(&self.from),
                        );
                    account_infos
                        .extend(anchor_lang::ToAccountInfos::to_account_infos(&self.to));
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(&self.base),
                        );
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(
                                &self.system_program,
                            ),
                        );
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(&self.program),
                        );
                    account_infos
                }
            }
        }
        pub struct IdlAccounts<'info> {
            #[account(mut, has_one = authority)]
            pub idl: Account<'info, IdlAccount>,
            #[account(constraint = authority.key!= &ERASED_AUTHORITY)]
            pub authority: Signer<'info>,
        }
        #[automatically_derived]
        impl<'info> anchor_lang::Accounts<'info> for IdlAccounts<'info>
        where
            'info: 'info,
        {
            #[inline(never)]
            fn try_accounts(
                program_id: &anchor_lang::solana_program::pubkey::Pubkey,
                accounts: &mut &[anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >],
                ix_data: &[u8],
                __bumps: &mut std::collections::BTreeMap<String, u8>,
                __reallocs: &mut std::collections::BTreeSet<
                    anchor_lang::solana_program::pubkey::Pubkey,
                >,
            ) -> anchor_lang::Result<Self> {
                let idl: anchor_lang::accounts::account::Account<IdlAccount> = anchor_lang::Accounts::try_accounts(
                        program_id,
                        accounts,
                        ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("idl"))?;
                let authority: Signer = anchor_lang::Accounts::try_accounts(
                        program_id,
                        accounts,
                        ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("authority"))?;
                if !idl.to_account_info().is_writable {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintMut,
                            )
                            .with_account_name("idl"),
                    );
                }
                {
                    let my_key = idl.authority;
                    let target_key = authority.key();
                    if my_key != target_key {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintHasOne,
                                )
                                .with_account_name("idl")
                                .with_pubkeys((my_key, target_key)),
                        );
                    }
                }
                if !(authority.key != &ERASED_AUTHORITY) {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintRaw,
                            )
                            .with_account_name("authority"),
                    );
                }
                Ok(IdlAccounts { idl, authority })
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountInfos<'info> for IdlAccounts<'info>
        where
            'info: 'info,
        {
            fn to_account_infos(
                &self,
            ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                let mut account_infos = ::alloc::vec::Vec::new();
                account_infos.extend(self.idl.to_account_infos());
                account_infos.extend(self.authority.to_account_infos());
                account_infos
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountMetas for IdlAccounts<'info> {
            fn to_account_metas(
                &self,
                is_signer: Option<bool>,
            ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                let mut account_metas = ::alloc::vec::Vec::new();
                account_metas.extend(self.idl.to_account_metas(None));
                account_metas.extend(self.authority.to_account_metas(None));
                account_metas
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::AccountsExit<'info> for IdlAccounts<'info>
        where
            'info: 'info,
        {
            fn exit(
                &self,
                program_id: &anchor_lang::solana_program::pubkey::Pubkey,
            ) -> anchor_lang::Result<()> {
                anchor_lang::AccountsExit::exit(&self.idl, program_id)
                    .map_err(|e| e.with_account_name("idl"))?;
                Ok(())
            }
        }
        /// An internal, Anchor generated module. This is used (as an
        /// implementation detail), to generate a struct for a given
        /// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
        /// instead of an `AccountInfo`. This is useful for clients that want
        /// to generate a list of accounts, without explicitly knowing the
        /// order all the fields should be in.
        ///
        /// To access the struct in this module, one should use the sibling
        /// `accounts` module (also generated), which re-exports this.
        pub(crate) mod __client_accounts_idl_accounts {
            use super::*;
            use anchor_lang::prelude::borsh;
            /// Generated client accounts for [`IdlAccounts`].
            pub struct IdlAccounts {
                pub idl: anchor_lang::solana_program::pubkey::Pubkey,
                pub authority: anchor_lang::solana_program::pubkey::Pubkey,
            }
            impl borsh::ser::BorshSerialize for IdlAccounts
            where
                anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
                anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            {
                fn serialize<W: borsh::maybestd::io::Write>(
                    &self,
                    writer: &mut W,
                ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                    borsh::BorshSerialize::serialize(&self.idl, writer)?;
                    borsh::BorshSerialize::serialize(&self.authority, writer)?;
                    Ok(())
                }
            }
            #[automatically_derived]
            impl anchor_lang::ToAccountMetas for IdlAccounts {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                self.idl,
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                self.authority,
                                true,
                            ),
                        );
                    account_metas
                }
            }
        }
        /// An internal, Anchor generated module. This is used (as an
        /// implementation detail), to generate a CPI struct for a given
        /// `#[derive(Accounts)]` implementation, where each field is an
        /// AccountInfo.
        ///
        /// To access the struct in this module, one should use the sibling
        /// [`cpi::accounts`] module (also generated), which re-exports this.
        pub(crate) mod __cpi_client_accounts_idl_accounts {
            use super::*;
            /// Generated CPI struct of the accounts for [`IdlAccounts`].
            pub struct IdlAccounts<'info> {
                pub idl: anchor_lang::solana_program::account_info::AccountInfo<'info>,
                pub authority: anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >,
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountMetas for IdlAccounts<'info> {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                anchor_lang::Key::key(&self.idl),
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                anchor_lang::Key::key(&self.authority),
                                true,
                            ),
                        );
                    account_metas
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountInfos<'info> for IdlAccounts<'info> {
                fn to_account_infos(
                    &self,
                ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                    let mut account_infos = ::alloc::vec::Vec::new();
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(&self.idl),
                        );
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(
                                &self.authority,
                            ),
                        );
                    account_infos
                }
            }
        }
        pub struct IdlResizeAccount<'info> {
            #[account(mut, has_one = authority)]
            pub idl: Account<'info, IdlAccount>,
            #[account(mut, constraint = authority.key!= &ERASED_AUTHORITY)]
            pub authority: Signer<'info>,
            pub system_program: Program<'info, System>,
        }
        #[automatically_derived]
        impl<'info> anchor_lang::Accounts<'info> for IdlResizeAccount<'info>
        where
            'info: 'info,
        {
            #[inline(never)]
            fn try_accounts(
                program_id: &anchor_lang::solana_program::pubkey::Pubkey,
                accounts: &mut &[anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >],
                ix_data: &[u8],
                __bumps: &mut std::collections::BTreeMap<String, u8>,
                __reallocs: &mut std::collections::BTreeSet<
                    anchor_lang::solana_program::pubkey::Pubkey,
                >,
            ) -> anchor_lang::Result<Self> {
                let idl: anchor_lang::accounts::account::Account<IdlAccount> = anchor_lang::Accounts::try_accounts(
                        program_id,
                        accounts,
                        ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("idl"))?;
                let authority: Signer = anchor_lang::Accounts::try_accounts(
                        program_id,
                        accounts,
                        ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("authority"))?;
                let system_program: anchor_lang::accounts::program::Program<System> = anchor_lang::Accounts::try_accounts(
                        program_id,
                        accounts,
                        ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("system_program"))?;
                if !idl.to_account_info().is_writable {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintMut,
                            )
                            .with_account_name("idl"),
                    );
                }
                {
                    let my_key = idl.authority;
                    let target_key = authority.key();
                    if my_key != target_key {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintHasOne,
                                )
                                .with_account_name("idl")
                                .with_pubkeys((my_key, target_key)),
                        );
                    }
                }
                if !authority.to_account_info().is_writable {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintMut,
                            )
                            .with_account_name("authority"),
                    );
                }
                if !(authority.key != &ERASED_AUTHORITY) {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintRaw,
                            )
                            .with_account_name("authority"),
                    );
                }
                Ok(IdlResizeAccount {
                    idl,
                    authority,
                    system_program,
                })
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountInfos<'info> for IdlResizeAccount<'info>
        where
            'info: 'info,
        {
            fn to_account_infos(
                &self,
            ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                let mut account_infos = ::alloc::vec::Vec::new();
                account_infos.extend(self.idl.to_account_infos());
                account_infos.extend(self.authority.to_account_infos());
                account_infos.extend(self.system_program.to_account_infos());
                account_infos
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountMetas for IdlResizeAccount<'info> {
            fn to_account_metas(
                &self,
                is_signer: Option<bool>,
            ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                let mut account_metas = ::alloc::vec::Vec::new();
                account_metas.extend(self.idl.to_account_metas(None));
                account_metas.extend(self.authority.to_account_metas(None));
                account_metas.extend(self.system_program.to_account_metas(None));
                account_metas
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::AccountsExit<'info> for IdlResizeAccount<'info>
        where
            'info: 'info,
        {
            fn exit(
                &self,
                program_id: &anchor_lang::solana_program::pubkey::Pubkey,
            ) -> anchor_lang::Result<()> {
                anchor_lang::AccountsExit::exit(&self.idl, program_id)
                    .map_err(|e| e.with_account_name("idl"))?;
                anchor_lang::AccountsExit::exit(&self.authority, program_id)
                    .map_err(|e| e.with_account_name("authority"))?;
                Ok(())
            }
        }
        /// An internal, Anchor generated module. This is used (as an
        /// implementation detail), to generate a struct for a given
        /// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
        /// instead of an `AccountInfo`. This is useful for clients that want
        /// to generate a list of accounts, without explicitly knowing the
        /// order all the fields should be in.
        ///
        /// To access the struct in this module, one should use the sibling
        /// `accounts` module (also generated), which re-exports this.
        pub(crate) mod __client_accounts_idl_resize_account {
            use super::*;
            use anchor_lang::prelude::borsh;
            /// Generated client accounts for [`IdlResizeAccount`].
            pub struct IdlResizeAccount {
                pub idl: anchor_lang::solana_program::pubkey::Pubkey,
                pub authority: anchor_lang::solana_program::pubkey::Pubkey,
                pub system_program: anchor_lang::solana_program::pubkey::Pubkey,
            }
            impl borsh::ser::BorshSerialize for IdlResizeAccount
            where
                anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
                anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
                anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            {
                fn serialize<W: borsh::maybestd::io::Write>(
                    &self,
                    writer: &mut W,
                ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                    borsh::BorshSerialize::serialize(&self.idl, writer)?;
                    borsh::BorshSerialize::serialize(&self.authority, writer)?;
                    borsh::BorshSerialize::serialize(&self.system_program, writer)?;
                    Ok(())
                }
            }
            #[automatically_derived]
            impl anchor_lang::ToAccountMetas for IdlResizeAccount {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                self.idl,
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                self.authority,
                                true,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                self.system_program,
                                false,
                            ),
                        );
                    account_metas
                }
            }
        }
        /// An internal, Anchor generated module. This is used (as an
        /// implementation detail), to generate a CPI struct for a given
        /// `#[derive(Accounts)]` implementation, where each field is an
        /// AccountInfo.
        ///
        /// To access the struct in this module, one should use the sibling
        /// [`cpi::accounts`] module (also generated), which re-exports this.
        pub(crate) mod __cpi_client_accounts_idl_resize_account {
            use super::*;
            /// Generated CPI struct of the accounts for [`IdlResizeAccount`].
            pub struct IdlResizeAccount<'info> {
                pub idl: anchor_lang::solana_program::account_info::AccountInfo<'info>,
                pub authority: anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >,
                pub system_program: anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >,
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountMetas for IdlResizeAccount<'info> {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                anchor_lang::Key::key(&self.idl),
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                anchor_lang::Key::key(&self.authority),
                                true,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                anchor_lang::Key::key(&self.system_program),
                                false,
                            ),
                        );
                    account_metas
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountInfos<'info> for IdlResizeAccount<'info> {
                fn to_account_infos(
                    &self,
                ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                    let mut account_infos = ::alloc::vec::Vec::new();
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(&self.idl),
                        );
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(
                                &self.authority,
                            ),
                        );
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(
                                &self.system_program,
                            ),
                        );
                    account_infos
                }
            }
        }
        pub struct IdlCreateBuffer<'info> {
            #[account(zero)]
            pub buffer: Account<'info, IdlAccount>,
            #[account(constraint = authority.key!= &ERASED_AUTHORITY)]
            pub authority: Signer<'info>,
        }
        #[automatically_derived]
        impl<'info> anchor_lang::Accounts<'info> for IdlCreateBuffer<'info>
        where
            'info: 'info,
        {
            #[inline(never)]
            fn try_accounts(
                program_id: &anchor_lang::solana_program::pubkey::Pubkey,
                accounts: &mut &[anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >],
                ix_data: &[u8],
                __bumps: &mut std::collections::BTreeMap<String, u8>,
                __reallocs: &mut std::collections::BTreeSet<
                    anchor_lang::solana_program::pubkey::Pubkey,
                >,
            ) -> anchor_lang::Result<Self> {
                if accounts.is_empty() {
                    return Err(
                        anchor_lang::error::ErrorCode::AccountNotEnoughKeys.into(),
                    );
                }
                let buffer = &accounts[0];
                *accounts = &accounts[1..];
                let authority: Signer = anchor_lang::Accounts::try_accounts(
                        program_id,
                        accounts,
                        ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("authority"))?;
                let __anchor_rent = Rent::get()?;
                let buffer: anchor_lang::accounts::account::Account<IdlAccount> = {
                    let mut __data: &[u8] = &buffer.try_borrow_data()?;
                    let mut __disc_bytes = [0u8; 8];
                    __disc_bytes.copy_from_slice(&__data[..8]);
                    let __discriminator = u64::from_le_bytes(__disc_bytes);
                    if __discriminator != 0 {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintZero,
                                )
                                .with_account_name("buffer"),
                        );
                    }
                    match anchor_lang::accounts::account::Account::try_from_unchecked(
                        &buffer,
                    ) {
                        Ok(val) => val,
                        Err(e) => return Err(e.with_account_name("buffer")),
                    }
                };
                if !buffer.to_account_info().is_writable {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintMut,
                            )
                            .with_account_name("buffer"),
                    );
                }
                if !__anchor_rent
                    .is_exempt(
                        buffer.to_account_info().lamports(),
                        buffer.to_account_info().try_data_len()?,
                    )
                {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintRentExempt,
                            )
                            .with_account_name("buffer"),
                    );
                }
                if !(authority.key != &ERASED_AUTHORITY) {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintRaw,
                            )
                            .with_account_name("authority"),
                    );
                }
                Ok(IdlCreateBuffer {
                    buffer,
                    authority,
                })
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountInfos<'info> for IdlCreateBuffer<'info>
        where
            'info: 'info,
        {
            fn to_account_infos(
                &self,
            ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                let mut account_infos = ::alloc::vec::Vec::new();
                account_infos.extend(self.buffer.to_account_infos());
                account_infos.extend(self.authority.to_account_infos());
                account_infos
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountMetas for IdlCreateBuffer<'info> {
            fn to_account_metas(
                &self,
                is_signer: Option<bool>,
            ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                let mut account_metas = ::alloc::vec::Vec::new();
                account_metas.extend(self.buffer.to_account_metas(None));
                account_metas.extend(self.authority.to_account_metas(None));
                account_metas
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::AccountsExit<'info> for IdlCreateBuffer<'info>
        where
            'info: 'info,
        {
            fn exit(
                &self,
                program_id: &anchor_lang::solana_program::pubkey::Pubkey,
            ) -> anchor_lang::Result<()> {
                anchor_lang::AccountsExit::exit(&self.buffer, program_id)
                    .map_err(|e| e.with_account_name("buffer"))?;
                Ok(())
            }
        }
        /// An internal, Anchor generated module. This is used (as an
        /// implementation detail), to generate a struct for a given
        /// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
        /// instead of an `AccountInfo`. This is useful for clients that want
        /// to generate a list of accounts, without explicitly knowing the
        /// order all the fields should be in.
        ///
        /// To access the struct in this module, one should use the sibling
        /// `accounts` module (also generated), which re-exports this.
        pub(crate) mod __client_accounts_idl_create_buffer {
            use super::*;
            use anchor_lang::prelude::borsh;
            /// Generated client accounts for [`IdlCreateBuffer`].
            pub struct IdlCreateBuffer {
                pub buffer: anchor_lang::solana_program::pubkey::Pubkey,
                pub authority: anchor_lang::solana_program::pubkey::Pubkey,
            }
            impl borsh::ser::BorshSerialize for IdlCreateBuffer
            where
                anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
                anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            {
                fn serialize<W: borsh::maybestd::io::Write>(
                    &self,
                    writer: &mut W,
                ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                    borsh::BorshSerialize::serialize(&self.buffer, writer)?;
                    borsh::BorshSerialize::serialize(&self.authority, writer)?;
                    Ok(())
                }
            }
            #[automatically_derived]
            impl anchor_lang::ToAccountMetas for IdlCreateBuffer {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                self.buffer,
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                self.authority,
                                true,
                            ),
                        );
                    account_metas
                }
            }
        }
        /// An internal, Anchor generated module. This is used (as an
        /// implementation detail), to generate a CPI struct for a given
        /// `#[derive(Accounts)]` implementation, where each field is an
        /// AccountInfo.
        ///
        /// To access the struct in this module, one should use the sibling
        /// [`cpi::accounts`] module (also generated), which re-exports this.
        pub(crate) mod __cpi_client_accounts_idl_create_buffer {
            use super::*;
            /// Generated CPI struct of the accounts for [`IdlCreateBuffer`].
            pub struct IdlCreateBuffer<'info> {
                pub buffer: anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >,
                pub authority: anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >,
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountMetas for IdlCreateBuffer<'info> {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                anchor_lang::Key::key(&self.buffer),
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                anchor_lang::Key::key(&self.authority),
                                true,
                            ),
                        );
                    account_metas
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountInfos<'info> for IdlCreateBuffer<'info> {
                fn to_account_infos(
                    &self,
                ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                    let mut account_infos = ::alloc::vec::Vec::new();
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(&self.buffer),
                        );
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(
                                &self.authority,
                            ),
                        );
                    account_infos
                }
            }
        }
        pub struct IdlSetBuffer<'info> {
            #[account(mut, constraint = buffer.authority = = idl.authority)]
            pub buffer: Account<'info, IdlAccount>,
            #[account(mut, has_one = authority)]
            pub idl: Account<'info, IdlAccount>,
            #[account(constraint = authority.key!= &ERASED_AUTHORITY)]
            pub authority: Signer<'info>,
        }
        #[automatically_derived]
        impl<'info> anchor_lang::Accounts<'info> for IdlSetBuffer<'info>
        where
            'info: 'info,
        {
            #[inline(never)]
            fn try_accounts(
                program_id: &anchor_lang::solana_program::pubkey::Pubkey,
                accounts: &mut &[anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >],
                ix_data: &[u8],
                __bumps: &mut std::collections::BTreeMap<String, u8>,
                __reallocs: &mut std::collections::BTreeSet<
                    anchor_lang::solana_program::pubkey::Pubkey,
                >,
            ) -> anchor_lang::Result<Self> {
                let buffer: anchor_lang::accounts::account::Account<IdlAccount> = anchor_lang::Accounts::try_accounts(
                        program_id,
                        accounts,
                        ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("buffer"))?;
                let idl: anchor_lang::accounts::account::Account<IdlAccount> = anchor_lang::Accounts::try_accounts(
                        program_id,
                        accounts,
                        ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("idl"))?;
                let authority: Signer = anchor_lang::Accounts::try_accounts(
                        program_id,
                        accounts,
                        ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("authority"))?;
                if !buffer.to_account_info().is_writable {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintMut,
                            )
                            .with_account_name("buffer"),
                    );
                }
                if !(buffer.authority == idl.authority) {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintRaw,
                            )
                            .with_account_name("buffer"),
                    );
                }
                if !idl.to_account_info().is_writable {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintMut,
                            )
                            .with_account_name("idl"),
                    );
                }
                {
                    let my_key = idl.authority;
                    let target_key = authority.key();
                    if my_key != target_key {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintHasOne,
                                )
                                .with_account_name("idl")
                                .with_pubkeys((my_key, target_key)),
                        );
                    }
                }
                if !(authority.key != &ERASED_AUTHORITY) {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintRaw,
                            )
                            .with_account_name("authority"),
                    );
                }
                Ok(IdlSetBuffer {
                    buffer,
                    idl,
                    authority,
                })
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountInfos<'info> for IdlSetBuffer<'info>
        where
            'info: 'info,
        {
            fn to_account_infos(
                &self,
            ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                let mut account_infos = ::alloc::vec::Vec::new();
                account_infos.extend(self.buffer.to_account_infos());
                account_infos.extend(self.idl.to_account_infos());
                account_infos.extend(self.authority.to_account_infos());
                account_infos
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountMetas for IdlSetBuffer<'info> {
            fn to_account_metas(
                &self,
                is_signer: Option<bool>,
            ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                let mut account_metas = ::alloc::vec::Vec::new();
                account_metas.extend(self.buffer.to_account_metas(None));
                account_metas.extend(self.idl.to_account_metas(None));
                account_metas.extend(self.authority.to_account_metas(None));
                account_metas
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::AccountsExit<'info> for IdlSetBuffer<'info>
        where
            'info: 'info,
        {
            fn exit(
                &self,
                program_id: &anchor_lang::solana_program::pubkey::Pubkey,
            ) -> anchor_lang::Result<()> {
                anchor_lang::AccountsExit::exit(&self.buffer, program_id)
                    .map_err(|e| e.with_account_name("buffer"))?;
                anchor_lang::AccountsExit::exit(&self.idl, program_id)
                    .map_err(|e| e.with_account_name("idl"))?;
                Ok(())
            }
        }
        /// An internal, Anchor generated module. This is used (as an
        /// implementation detail), to generate a struct for a given
        /// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
        /// instead of an `AccountInfo`. This is useful for clients that want
        /// to generate a list of accounts, without explicitly knowing the
        /// order all the fields should be in.
        ///
        /// To access the struct in this module, one should use the sibling
        /// `accounts` module (also generated), which re-exports this.
        pub(crate) mod __client_accounts_idl_set_buffer {
            use super::*;
            use anchor_lang::prelude::borsh;
            /// Generated client accounts for [`IdlSetBuffer`].
            pub struct IdlSetBuffer {
                pub buffer: anchor_lang::solana_program::pubkey::Pubkey,
                pub idl: anchor_lang::solana_program::pubkey::Pubkey,
                pub authority: anchor_lang::solana_program::pubkey::Pubkey,
            }
            impl borsh::ser::BorshSerialize for IdlSetBuffer
            where
                anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
                anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
                anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            {
                fn serialize<W: borsh::maybestd::io::Write>(
                    &self,
                    writer: &mut W,
                ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                    borsh::BorshSerialize::serialize(&self.buffer, writer)?;
                    borsh::BorshSerialize::serialize(&self.idl, writer)?;
                    borsh::BorshSerialize::serialize(&self.authority, writer)?;
                    Ok(())
                }
            }
            #[automatically_derived]
            impl anchor_lang::ToAccountMetas for IdlSetBuffer {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                self.buffer,
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                self.idl,
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                self.authority,
                                true,
                            ),
                        );
                    account_metas
                }
            }
        }
        /// An internal, Anchor generated module. This is used (as an
        /// implementation detail), to generate a CPI struct for a given
        /// `#[derive(Accounts)]` implementation, where each field is an
        /// AccountInfo.
        ///
        /// To access the struct in this module, one should use the sibling
        /// [`cpi::accounts`] module (also generated), which re-exports this.
        pub(crate) mod __cpi_client_accounts_idl_set_buffer {
            use super::*;
            /// Generated CPI struct of the accounts for [`IdlSetBuffer`].
            pub struct IdlSetBuffer<'info> {
                pub buffer: anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >,
                pub idl: anchor_lang::solana_program::account_info::AccountInfo<'info>,
                pub authority: anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >,
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountMetas for IdlSetBuffer<'info> {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                anchor_lang::Key::key(&self.buffer),
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                anchor_lang::Key::key(&self.idl),
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                anchor_lang::Key::key(&self.authority),
                                true,
                            ),
                        );
                    account_metas
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountInfos<'info> for IdlSetBuffer<'info> {
                fn to_account_infos(
                    &self,
                ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                    let mut account_infos = ::alloc::vec::Vec::new();
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(&self.buffer),
                        );
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(&self.idl),
                        );
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(
                                &self.authority,
                            ),
                        );
                    account_infos
                }
            }
        }
        pub struct IdlCloseAccount<'info> {
            #[account(mut, has_one = authority, close = sol_destination)]
            pub account: Account<'info, IdlAccount>,
            #[account(constraint = authority.key!= &ERASED_AUTHORITY)]
            pub authority: Signer<'info>,
            #[account(mut)]
            pub sol_destination: AccountInfo<'info>,
        }
        #[automatically_derived]
        impl<'info> anchor_lang::Accounts<'info> for IdlCloseAccount<'info>
        where
            'info: 'info,
        {
            #[inline(never)]
            fn try_accounts(
                program_id: &anchor_lang::solana_program::pubkey::Pubkey,
                accounts: &mut &[anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >],
                ix_data: &[u8],
                __bumps: &mut std::collections::BTreeMap<String, u8>,
                __reallocs: &mut std::collections::BTreeSet<
                    anchor_lang::solana_program::pubkey::Pubkey,
                >,
            ) -> anchor_lang::Result<Self> {
                let account: anchor_lang::accounts::account::Account<IdlAccount> = anchor_lang::Accounts::try_accounts(
                        program_id,
                        accounts,
                        ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("account"))?;
                let authority: Signer = anchor_lang::Accounts::try_accounts(
                        program_id,
                        accounts,
                        ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("authority"))?;
                let sol_destination: AccountInfo = anchor_lang::Accounts::try_accounts(
                        program_id,
                        accounts,
                        ix_data,
                        __bumps,
                        __reallocs,
                    )
                    .map_err(|e| e.with_account_name("sol_destination"))?;
                if !account.to_account_info().is_writable {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintMut,
                            )
                            .with_account_name("account"),
                    );
                }
                {
                    let my_key = account.authority;
                    let target_key = authority.key();
                    if my_key != target_key {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintHasOne,
                                )
                                .with_account_name("account")
                                .with_pubkeys((my_key, target_key)),
                        );
                    }
                }
                {
                    if account.key() == sol_destination.key() {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintClose,
                                )
                                .with_account_name("account"),
                        );
                    }
                }
                if !(authority.key != &ERASED_AUTHORITY) {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintRaw,
                            )
                            .with_account_name("authority"),
                    );
                }
                if !sol_destination.to_account_info().is_writable {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintMut,
                            )
                            .with_account_name("sol_destination"),
                    );
                }
                Ok(IdlCloseAccount {
                    account,
                    authority,
                    sol_destination,
                })
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountInfos<'info> for IdlCloseAccount<'info>
        where
            'info: 'info,
        {
            fn to_account_infos(
                &self,
            ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                let mut account_infos = ::alloc::vec::Vec::new();
                account_infos.extend(self.account.to_account_infos());
                account_infos.extend(self.authority.to_account_infos());
                account_infos.extend(self.sol_destination.to_account_infos());
                account_infos
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountMetas for IdlCloseAccount<'info> {
            fn to_account_metas(
                &self,
                is_signer: Option<bool>,
            ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                let mut account_metas = ::alloc::vec::Vec::new();
                account_metas.extend(self.account.to_account_metas(None));
                account_metas.extend(self.authority.to_account_metas(None));
                account_metas.extend(self.sol_destination.to_account_metas(None));
                account_metas
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::AccountsExit<'info> for IdlCloseAccount<'info>
        where
            'info: 'info,
        {
            fn exit(
                &self,
                program_id: &anchor_lang::solana_program::pubkey::Pubkey,
            ) -> anchor_lang::Result<()> {
                {
                    let sol_destination = &self.sol_destination;
                    anchor_lang::AccountsClose::close(
                            &self.account,
                            sol_destination.to_account_info(),
                        )
                        .map_err(|e| e.with_account_name("account"))?;
                }
                anchor_lang::AccountsExit::exit(&self.sol_destination, program_id)
                    .map_err(|e| e.with_account_name("sol_destination"))?;
                Ok(())
            }
        }
        /// An internal, Anchor generated module. This is used (as an
        /// implementation detail), to generate a struct for a given
        /// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
        /// instead of an `AccountInfo`. This is useful for clients that want
        /// to generate a list of accounts, without explicitly knowing the
        /// order all the fields should be in.
        ///
        /// To access the struct in this module, one should use the sibling
        /// `accounts` module (also generated), which re-exports this.
        pub(crate) mod __client_accounts_idl_close_account {
            use super::*;
            use anchor_lang::prelude::borsh;
            /// Generated client accounts for [`IdlCloseAccount`].
            pub struct IdlCloseAccount {
                pub account: anchor_lang::solana_program::pubkey::Pubkey,
                pub authority: anchor_lang::solana_program::pubkey::Pubkey,
                pub sol_destination: anchor_lang::solana_program::pubkey::Pubkey,
            }
            impl borsh::ser::BorshSerialize for IdlCloseAccount
            where
                anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
                anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
                anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            {
                fn serialize<W: borsh::maybestd::io::Write>(
                    &self,
                    writer: &mut W,
                ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                    borsh::BorshSerialize::serialize(&self.account, writer)?;
                    borsh::BorshSerialize::serialize(&self.authority, writer)?;
                    borsh::BorshSerialize::serialize(&self.sol_destination, writer)?;
                    Ok(())
                }
            }
            #[automatically_derived]
            impl anchor_lang::ToAccountMetas for IdlCloseAccount {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                self.account,
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                self.authority,
                                true,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                self.sol_destination,
                                false,
                            ),
                        );
                    account_metas
                }
            }
        }
        /// An internal, Anchor generated module. This is used (as an
        /// implementation detail), to generate a CPI struct for a given
        /// `#[derive(Accounts)]` implementation, where each field is an
        /// AccountInfo.
        ///
        /// To access the struct in this module, one should use the sibling
        /// [`cpi::accounts`] module (also generated), which re-exports this.
        pub(crate) mod __cpi_client_accounts_idl_close_account {
            use super::*;
            /// Generated CPI struct of the accounts for [`IdlCloseAccount`].
            pub struct IdlCloseAccount<'info> {
                pub account: anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >,
                pub authority: anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >,
                pub sol_destination: anchor_lang::solana_program::account_info::AccountInfo<
                    'info,
                >,
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountMetas for IdlCloseAccount<'info> {
                fn to_account_metas(
                    &self,
                    is_signer: Option<bool>,
                ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                    let mut account_metas = ::alloc::vec::Vec::new();
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                anchor_lang::Key::key(&self.account),
                                false,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                                anchor_lang::Key::key(&self.authority),
                                true,
                            ),
                        );
                    account_metas
                        .push(
                            anchor_lang::solana_program::instruction::AccountMeta::new(
                                anchor_lang::Key::key(&self.sol_destination),
                                false,
                            ),
                        );
                    account_metas
                }
            }
            #[automatically_derived]
            impl<'info> anchor_lang::ToAccountInfos<'info> for IdlCloseAccount<'info> {
                fn to_account_infos(
                    &self,
                ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                    let mut account_infos = ::alloc::vec::Vec::new();
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(&self.account),
                        );
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(
                                &self.authority,
                            ),
                        );
                    account_infos
                        .extend(
                            anchor_lang::ToAccountInfos::to_account_infos(
                                &self.sol_destination,
                            ),
                        );
                    account_infos
                }
            }
        }
        use std::cell::{Ref, RefMut};
        pub trait IdlTrailingData<'info> {
            fn trailing_data(self) -> Ref<'info, [u8]>;
            fn trailing_data_mut(self) -> RefMut<'info, [u8]>;
        }
        impl<'a, 'info: 'a> IdlTrailingData<'a> for &'a Account<'info, IdlAccount> {
            fn trailing_data(self) -> Ref<'a, [u8]> {
                let info: &AccountInfo<'info> = self.as_ref();
                Ref::map(info.try_borrow_data().unwrap(), |d| &d[44..])
            }
            fn trailing_data_mut(self) -> RefMut<'a, [u8]> {
                let info: &AccountInfo<'info> = self.as_ref();
                RefMut::map(info.try_borrow_mut_data().unwrap(), |d| &mut d[44..])
            }
        }
        #[inline(never)]
        pub fn __idl_create_account(
            program_id: &Pubkey,
            accounts: &mut IdlCreateAccounts,
            data_len: u64,
        ) -> anchor_lang::Result<()> {
            ::solana_program::log::sol_log("Instruction: IdlCreateAccount");
            if program_id != accounts.program.key {
                return Err(
                    anchor_lang::error::ErrorCode::IdlInstructionInvalidProgram.into(),
                );
            }
            let from = accounts.from.key;
            let (base, nonce) = Pubkey::find_program_address(&[], program_id);
            let seed = IdlAccount::seed();
            let owner = accounts.program.key;
            let to = Pubkey::create_with_seed(&base, seed, owner).unwrap();
            let space = std::cmp::min(8 + 32 + 4 + data_len as usize, 10_000);
            let rent = Rent::get()?;
            let lamports = rent.minimum_balance(space);
            let seeds = &[&[nonce][..]];
            let ix = anchor_lang::solana_program::system_instruction::create_account_with_seed(
                from,
                &to,
                &base,
                seed,
                lamports,
                space as u64,
                owner,
            );
            anchor_lang::solana_program::program::invoke_signed(
                &ix,
                &[
                    accounts.from.clone(),
                    accounts.to.clone(),
                    accounts.base.clone(),
                    accounts.system_program.to_account_info().clone(),
                ],
                &[seeds],
            )?;
            let mut idl_account = {
                let mut account_data = accounts.to.try_borrow_data()?;
                let mut account_data_slice: &[u8] = &account_data;
                IdlAccount::try_deserialize_unchecked(&mut account_data_slice)?
            };
            idl_account.authority = *accounts.from.key;
            let mut data = accounts.to.try_borrow_mut_data()?;
            let dst: &mut [u8] = &mut data;
            let mut cursor = std::io::Cursor::new(dst);
            idl_account.try_serialize(&mut cursor)?;
            Ok(())
        }
        #[inline(never)]
        pub fn __idl_resize_account(
            program_id: &Pubkey,
            accounts: &mut IdlResizeAccount,
            data_len: u64,
        ) -> anchor_lang::Result<()> {
            ::solana_program::log::sol_log("Instruction: IdlResizeAccount");
            let data_len: usize = data_len as usize;
            if accounts.idl.data_len != 0 {
                return Err(anchor_lang::error::ErrorCode::IdlAccountNotEmpty.into());
            }
            let new_account_space = accounts
                .idl
                .to_account_info()
                .data_len()
                .checked_add(
                    std::cmp::min(
                        data_len
                            .checked_sub(accounts.idl.to_account_info().data_len())
                            .expect(
                                "data_len should always be >= the current account space",
                            ),
                        10_000,
                    ),
                )
                .unwrap();
            if new_account_space > accounts.idl.to_account_info().data_len() {
                let sysvar_rent = Rent::get()?;
                let new_rent_minimum = sysvar_rent.minimum_balance(new_account_space);
                anchor_lang::system_program::transfer(
                    anchor_lang::context::CpiContext::new(
                        accounts.system_program.to_account_info(),
                        anchor_lang::system_program::Transfer {
                            from: accounts.authority.to_account_info(),
                            to: accounts.idl.to_account_info().clone(),
                        },
                    ),
                    new_rent_minimum
                        .checked_sub(accounts.idl.to_account_info().lamports())
                        .unwrap(),
                )?;
                accounts.idl.to_account_info().realloc(new_account_space, false)?;
            }
            Ok(())
        }
        #[inline(never)]
        pub fn __idl_close_account(
            program_id: &Pubkey,
            accounts: &mut IdlCloseAccount,
        ) -> anchor_lang::Result<()> {
            ::solana_program::log::sol_log("Instruction: IdlCloseAccount");
            Ok(())
        }
        #[inline(never)]
        pub fn __idl_create_buffer(
            program_id: &Pubkey,
            accounts: &mut IdlCreateBuffer,
        ) -> anchor_lang::Result<()> {
            ::solana_program::log::sol_log("Instruction: IdlCreateBuffer");
            let mut buffer = &mut accounts.buffer;
            buffer.authority = *accounts.authority.key;
            Ok(())
        }
        #[inline(never)]
        pub fn __idl_write(
            program_id: &Pubkey,
            accounts: &mut IdlAccounts,
            idl_data: Vec<u8>,
        ) -> anchor_lang::Result<()> {
            ::solana_program::log::sol_log("Instruction: IdlWrite");
            let prev_len: usize = ::std::convert::TryInto::<
                usize,
            >::try_into(accounts.idl.data_len)
                .unwrap();
            let new_len: usize = prev_len + idl_data.len();
            accounts
                .idl
                .data_len = accounts
                .idl
                .data_len
                .checked_add(
                    ::std::convert::TryInto::<u32>::try_into(idl_data.len()).unwrap(),
                )
                .unwrap();
            use IdlTrailingData;
            let mut idl_bytes = accounts.idl.trailing_data_mut();
            let idl_expansion = &mut idl_bytes[prev_len..new_len];
            if idl_expansion.len() != idl_data.len() {
                return Err(
                    anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                            error_name: anchor_lang::error::ErrorCode::RequireEqViolated
                                .name(),
                            error_code_number: anchor_lang::error::ErrorCode::RequireEqViolated
                                .into(),
                            error_msg: anchor_lang::error::ErrorCode::RequireEqViolated
                                .to_string(),
                            error_origin: Some(
                                anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                    filename: "programs/token-dispenser/src/lib.rs",
                                    line: 66u32,
                                }),
                            ),
                            compared_values: None,
                        })
                        .with_values((idl_expansion.len(), idl_data.len())),
                );
            }
            idl_expansion.copy_from_slice(&idl_data[..]);
            Ok(())
        }
        #[inline(never)]
        pub fn __idl_set_authority(
            program_id: &Pubkey,
            accounts: &mut IdlAccounts,
            new_authority: Pubkey,
        ) -> anchor_lang::Result<()> {
            ::solana_program::log::sol_log("Instruction: IdlSetAuthority");
            accounts.idl.authority = new_authority;
            Ok(())
        }
        #[inline(never)]
        pub fn __idl_set_buffer(
            program_id: &Pubkey,
            accounts: &mut IdlSetBuffer,
        ) -> anchor_lang::Result<()> {
            ::solana_program::log::sol_log("Instruction: IdlSetBuffer");
            accounts.idl.data_len = accounts.buffer.data_len;
            use IdlTrailingData;
            let buffer_len = ::std::convert::TryInto::<
                usize,
            >::try_into(accounts.buffer.data_len)
                .unwrap();
            let mut target = accounts.idl.trailing_data_mut();
            let source = &accounts.buffer.trailing_data()[..buffer_len];
            if target.len() < buffer_len {
                return Err(
                    anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                            error_name: anchor_lang::error::ErrorCode::RequireGteViolated
                                .name(),
                            error_code_number: anchor_lang::error::ErrorCode::RequireGteViolated
                                .into(),
                            error_msg: anchor_lang::error::ErrorCode::RequireGteViolated
                                .to_string(),
                            error_origin: Some(
                                anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                    filename: "programs/token-dispenser/src/lib.rs",
                                    line: 66u32,
                                }),
                            ),
                            compared_values: None,
                        })
                        .with_values((target.len(), buffer_len)),
                );
            }
            target[..buffer_len].copy_from_slice(source);
            Ok(())
        }
    }
    /// __global mod defines wrapped handlers for global instructions.
    pub mod __global {
        use super::*;
        #[inline(never)]
        pub fn initialize(
            program_id: &Pubkey,
            accounts: &[AccountInfo],
            ix_data: &[u8],
        ) -> anchor_lang::Result<()> {
            ::solana_program::log::sol_log("Instruction: Initialize");
            let ix = instruction::Initialize::deserialize(&mut &ix_data[..])
                .map_err(|_| {
                    anchor_lang::error::ErrorCode::InstructionDidNotDeserialize
                })?;
            let instruction::Initialize { merkle_root, dispenser_guard } = ix;
            let mut __bumps = std::collections::BTreeMap::new();
            let mut __reallocs = std::collections::BTreeSet::new();
            let mut remaining_accounts: &[AccountInfo] = accounts;
            let mut accounts = Initialize::try_accounts(
                program_id,
                &mut remaining_accounts,
                ix_data,
                &mut __bumps,
                &mut __reallocs,
            )?;
            let result = token_dispenser::initialize(
                anchor_lang::context::Context::new(
                    program_id,
                    &mut accounts,
                    remaining_accounts,
                    __bumps,
                ),
                merkle_root,
                dispenser_guard,
            )?;
            accounts.exit(program_id)
        }
        #[inline(never)]
        pub fn claim(
            program_id: &Pubkey,
            accounts: &[AccountInfo],
            ix_data: &[u8],
        ) -> anchor_lang::Result<()> {
            ::solana_program::log::sol_log("Instruction: Claim");
            let ix = instruction::Claim::deserialize(&mut &ix_data[..])
                .map_err(|_| {
                    anchor_lang::error::ErrorCode::InstructionDidNotDeserialize
                })?;
            let instruction::Claim { claim_certificates } = ix;
            let mut __bumps = std::collections::BTreeMap::new();
            let mut __reallocs = std::collections::BTreeSet::new();
            let mut remaining_accounts: &[AccountInfo] = accounts;
            let mut accounts = Claim::try_accounts(
                program_id,
                &mut remaining_accounts,
                ix_data,
                &mut __bumps,
                &mut __reallocs,
            )?;
            let result = token_dispenser::claim(
                anchor_lang::context::Context::new(
                    program_id,
                    &mut accounts,
                    remaining_accounts,
                    __bumps,
                ),
                claim_certificates,
            )?;
            accounts.exit(program_id)
        }
        #[inline(never)]
        pub fn checkout(
            program_id: &Pubkey,
            accounts: &[AccountInfo],
            ix_data: &[u8],
        ) -> anchor_lang::Result<()> {
            ::solana_program::log::sol_log("Instruction: Checkout");
            let ix = instruction::Checkout::deserialize(&mut &ix_data[..])
                .map_err(|_| {
                    anchor_lang::error::ErrorCode::InstructionDidNotDeserialize
                })?;
            let instruction::Checkout = ix;
            let mut __bumps = std::collections::BTreeMap::new();
            let mut __reallocs = std::collections::BTreeSet::new();
            let mut remaining_accounts: &[AccountInfo] = accounts;
            let mut accounts = Checkout::try_accounts(
                program_id,
                &mut remaining_accounts,
                ix_data,
                &mut __bumps,
                &mut __reallocs,
            )?;
            let result = token_dispenser::checkout(
                anchor_lang::context::Context::new(
                    program_id,
                    &mut accounts,
                    remaining_accounts,
                    __bumps,
                ),
            )?;
            accounts.exit(program_id)
        }
    }
}
pub mod token_dispenser {
    use {super::*, anchor_spl::token};
    /// This can only be called once and should be called right after the program is deployed.
    pub fn initialize(
        ctx: Context<Initialize>,
        merkle_root: MerkleRoot<SolanaHasher>,
        dispenser_guard: Pubkey,
    ) -> Result<()> {
        if dispenser_guard == Pubkey::default() {
            return Err(
                anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                        error_name: anchor_lang::error::ErrorCode::RequireKeysNeqViolated
                            .name(),
                        error_code_number: anchor_lang::error::ErrorCode::RequireKeysNeqViolated
                            .into(),
                        error_msg: anchor_lang::error::ErrorCode::RequireKeysNeqViolated
                            .to_string(),
                        error_origin: Some(
                            anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                filename: "programs/token-dispenser/src/lib.rs",
                                line: 79u32,
                            }),
                        ),
                        compared_values: None,
                    })
                    .with_pubkeys((dispenser_guard, Pubkey::default())),
            );
        }
        let config = &mut ctx.accounts.config;
        config.bump = *ctx.bumps.get("config").unwrap();
        config.merkle_root = merkle_root;
        config.dispenser_guard = dispenser_guard;
        config.mint = ctx.accounts.mint.key();
        config.treasury = ctx.accounts.treasury.key();
        Ok(())
    }
    /**
     * Claim a claimant's tokens. This instructions needs to enforce :
     * - The dispenser guard has signed the transaction - DONE
     * - The claimant is claiming no more than once per ecosystem - DONE
     * - The claimant has provided a valid proof of identity (is the owner of the wallet
     *   entitled to the tokens)
     * - The claimant has provided a valid proof of inclusion (this confirm that the claimant --
     *   DONE
     * - The claimant has not already claimed tokens -- DONE
     */
    pub fn claim(
        ctx: Context<Claim>,
        claim_certificates: Vec<ClaimCertificate>,
    ) -> Result<()> {
        let config = &ctx.accounts.config;
        let cart = &mut ctx.accounts.cart;
        for (index, claim_certificate) in claim_certificates.iter().enumerate() {
            let claim_info = claim_certificate
                .checked_into_claim_info(
                    &ctx.accounts.sysvar_instruction,
                    ctx.accounts.claimant.key,
                )?;
            let leaf_vector = claim_info.try_to_vec()?;
            if !config
                .merkle_root
                .check(claim_certificate.proof_of_inclusion.clone(), &leaf_vector)
            {
                return Err(ErrorCode::InvalidInclusionProof.into());
            }
            checked_create_claim_receipt(
                index,
                &leaf_vector,
                ctx.accounts.claimant.key,
                ctx.remaining_accounts,
            )?;
            cart
                .amount = cart
                .amount
                .checked_add(claim_info.amount)
                .ok_or(ErrorCode::ArithmeticOverflow)?;
            if cart.set.contains(&claim_info.identity) {
                return Err(ErrorCode::MoreThanOneIdentityPerEcosystem.into());
            }
            cart.set.insert(&claim_info.identity);
        }
        Ok(())
    }
    pub fn checkout(ctx: Context<Checkout>) -> Result<()> {
        let cart = &mut ctx.accounts.cart;
        let claimant_fund = &ctx.accounts.claimant_fund;
        let treasury = &mut ctx.accounts.treasury;
        let config = &ctx.accounts.config;
        if treasury.amount < cart.amount {
            return Err(
                anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                        error_name: ErrorCode::InsufficientTreasuryFunds.name(),
                        error_code_number: ErrorCode::InsufficientTreasuryFunds.into(),
                        error_msg: ErrorCode::InsufficientTreasuryFunds.to_string(),
                        error_origin: Some(
                            anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                filename: "programs/token-dispenser/src/lib.rs",
                                line: 147u32,
                            }),
                        ),
                        compared_values: None,
                    })
                    .with_values((treasury.amount, cart.amount)),
            );
        }
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: treasury.to_account_info(),
                    to: claimant_fund.to_account_info(),
                    authority: config.to_account_info(),
                },
                &[&[CONFIG_SEED, &[config.bump]]],
            ),
            cart.amount,
        )?;
        cart.amount = 0;
        Ok(())
    }
}
/// An Anchor generated module containing the program's set of
/// instructions, where each method handler in the `#[program]` mod is
/// associated with a struct defining the input arguments to the
/// method. These should be used directly, when one wants to serialize
/// Anchor instruction data, for example, when speciying
/// instructions on a client.
pub mod instruction {
    use super::*;
    /// Instruction.
    pub struct Initialize {
        pub merkle_root: MerkleRoot<SolanaHasher>,
        pub dispenser_guard: Pubkey,
    }
    impl borsh::ser::BorshSerialize for Initialize
    where
        MerkleRoot<SolanaHasher>: borsh::ser::BorshSerialize,
        Pubkey: borsh::ser::BorshSerialize,
    {
        fn serialize<W: borsh::maybestd::io::Write>(
            &self,
            writer: &mut W,
        ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
            borsh::BorshSerialize::serialize(&self.merkle_root, writer)?;
            borsh::BorshSerialize::serialize(&self.dispenser_guard, writer)?;
            Ok(())
        }
    }
    impl borsh::de::BorshDeserialize for Initialize
    where
        MerkleRoot<SolanaHasher>: borsh::BorshDeserialize,
        Pubkey: borsh::BorshDeserialize,
    {
        fn deserialize(
            buf: &mut &[u8],
        ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
            Ok(Self {
                merkle_root: borsh::BorshDeserialize::deserialize(buf)?,
                dispenser_guard: borsh::BorshDeserialize::deserialize(buf)?,
            })
        }
    }
    impl anchor_lang::Discriminator for Initialize {
        const DISCRIMINATOR: [u8; 8] = [175, 175, 109, 31, 13, 152, 155, 237];
    }
    impl anchor_lang::InstructionData for Initialize {}
    impl anchor_lang::Owner for Initialize {
        fn owner() -> Pubkey {
            ID
        }
    }
    /// Instruction.
    pub struct Claim {
        pub claim_certificates: Vec<ClaimCertificate>,
    }
    impl borsh::ser::BorshSerialize for Claim
    where
        Vec<ClaimCertificate>: borsh::ser::BorshSerialize,
    {
        fn serialize<W: borsh::maybestd::io::Write>(
            &self,
            writer: &mut W,
        ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
            borsh::BorshSerialize::serialize(&self.claim_certificates, writer)?;
            Ok(())
        }
    }
    impl borsh::de::BorshDeserialize for Claim
    where
        Vec<ClaimCertificate>: borsh::BorshDeserialize,
    {
        fn deserialize(
            buf: &mut &[u8],
        ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
            Ok(Self {
                claim_certificates: borsh::BorshDeserialize::deserialize(buf)?,
            })
        }
    }
    impl anchor_lang::Discriminator for Claim {
        const DISCRIMINATOR: [u8; 8] = [62, 198, 214, 193, 213, 159, 108, 210];
    }
    impl anchor_lang::InstructionData for Claim {}
    impl anchor_lang::Owner for Claim {
        fn owner() -> Pubkey {
            ID
        }
    }
    /// Instruction.
    pub struct Checkout;
    impl borsh::ser::BorshSerialize for Checkout {
        fn serialize<W: borsh::maybestd::io::Write>(
            &self,
            writer: &mut W,
        ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
            Ok(())
        }
    }
    impl borsh::de::BorshDeserialize for Checkout {
        fn deserialize(
            buf: &mut &[u8],
        ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
            Ok(Self {})
        }
    }
    impl anchor_lang::Discriminator for Checkout {
        const DISCRIMINATOR: [u8; 8] = [7, 91, 236, 227, 107, 242, 64, 61];
    }
    impl anchor_lang::InstructionData for Checkout {}
    impl anchor_lang::Owner for Checkout {
        fn owner() -> Pubkey {
            ID
        }
    }
}
/// An Anchor generated module, providing a set of structs
/// mirroring the structs deriving `Accounts`, where each field is
/// a `Pubkey`. This is useful for specifying accounts for a client.
pub mod accounts {
    pub use crate::__client_accounts_claim::*;
    pub use crate::__client_accounts_checkout::*;
    pub use crate::__client_accounts_initialize::*;
}
pub struct Initialize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(init, payer = payer, space = Config::LEN, seeds = [CONFIG_SEED], bump)]
    pub config: Account<'info, Config>,
    /// Mint of the treasury
    pub mint: Account<'info, Mint>,
    /// Treasury token account. This is an externally owned token account and
    /// the owner of this account will approve the config as a delegate using the
    /// solana CLI command `spl-token approve <treasury_account_address> <approve_amount> <config_address>`
    #[account(token::mint = mint)]
    pub treasury: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
}
#[automatically_derived]
impl<'info> anchor_lang::Accounts<'info> for Initialize<'info>
where
    'info: 'info,
{
    #[inline(never)]
    fn try_accounts(
        program_id: &anchor_lang::solana_program::pubkey::Pubkey,
        accounts: &mut &[anchor_lang::solana_program::account_info::AccountInfo<'info>],
        ix_data: &[u8],
        __bumps: &mut std::collections::BTreeMap<String, u8>,
        __reallocs: &mut std::collections::BTreeSet<
            anchor_lang::solana_program::pubkey::Pubkey,
        >,
    ) -> anchor_lang::Result<Self> {
        let payer: Signer = anchor_lang::Accounts::try_accounts(
                program_id,
                accounts,
                ix_data,
                __bumps,
                __reallocs,
            )
            .map_err(|e| e.with_account_name("payer"))?;
        if accounts.is_empty() {
            return Err(anchor_lang::error::ErrorCode::AccountNotEnoughKeys.into());
        }
        let config = &accounts[0];
        *accounts = &accounts[1..];
        let mint: anchor_lang::accounts::account::Account<Mint> = anchor_lang::Accounts::try_accounts(
                program_id,
                accounts,
                ix_data,
                __bumps,
                __reallocs,
            )
            .map_err(|e| e.with_account_name("mint"))?;
        let treasury: anchor_lang::accounts::account::Account<TokenAccount> = anchor_lang::Accounts::try_accounts(
                program_id,
                accounts,
                ix_data,
                __bumps,
                __reallocs,
            )
            .map_err(|e| e.with_account_name("treasury"))?;
        let system_program: anchor_lang::accounts::program::Program<System> = anchor_lang::Accounts::try_accounts(
                program_id,
                accounts,
                ix_data,
                __bumps,
                __reallocs,
            )
            .map_err(|e| e.with_account_name("system_program"))?;
        let __anchor_rent = Rent::get()?;
        let (__pda_address, __bump) = Pubkey::find_program_address(
            &[CONFIG_SEED],
            program_id,
        );
        __bumps.insert("config".to_string(), __bump);
        if config.key() != __pda_address {
            return Err(
                anchor_lang::error::Error::from(
                        anchor_lang::error::ErrorCode::ConstraintSeeds,
                    )
                    .with_account_name("config")
                    .with_pubkeys((config.key(), __pda_address)),
            );
        }
        let config = {
            let actual_field = config.to_account_info();
            let actual_owner = actual_field.owner;
            let space = Config::LEN;
            let pa: anchor_lang::accounts::account::Account<Config> = if !false
                || actual_owner == &anchor_lang::solana_program::system_program::ID
            {
                let __current_lamports = config.lamports();
                if __current_lamports == 0 {
                    let space = space;
                    let lamports = __anchor_rent.minimum_balance(space);
                    let cpi_accounts = anchor_lang::system_program::CreateAccount {
                        from: payer.to_account_info(),
                        to: config.to_account_info(),
                    };
                    let cpi_context = anchor_lang::context::CpiContext::new(
                        system_program.to_account_info(),
                        cpi_accounts,
                    );
                    anchor_lang::system_program::create_account(
                        cpi_context.with_signer(&[&[CONFIG_SEED, &[__bump][..]][..]]),
                        lamports,
                        space as u64,
                        program_id,
                    )?;
                } else {
                    if payer.key() == config.key() {
                        return Err(
                            anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                                    error_name: anchor_lang::error::ErrorCode::TryingToInitPayerAsProgramAccount
                                        .name(),
                                    error_code_number: anchor_lang::error::ErrorCode::TryingToInitPayerAsProgramAccount
                                        .into(),
                                    error_msg: anchor_lang::error::ErrorCode::TryingToInitPayerAsProgramAccount
                                        .to_string(),
                                    error_origin: Some(
                                        anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                            filename: "programs/token-dispenser/src/lib.rs",
                                            line: 173u32,
                                        }),
                                    ),
                                    compared_values: None,
                                })
                                .with_pubkeys((payer.key(), config.key())),
                        );
                    }
                    let required_lamports = __anchor_rent
                        .minimum_balance(space)
                        .max(1)
                        .saturating_sub(__current_lamports);
                    if required_lamports > 0 {
                        let cpi_accounts = anchor_lang::system_program::Transfer {
                            from: payer.to_account_info(),
                            to: config.to_account_info(),
                        };
                        let cpi_context = anchor_lang::context::CpiContext::new(
                            system_program.to_account_info(),
                            cpi_accounts,
                        );
                        anchor_lang::system_program::transfer(
                            cpi_context,
                            required_lamports,
                        )?;
                    }
                    let cpi_accounts = anchor_lang::system_program::Allocate {
                        account_to_allocate: config.to_account_info(),
                    };
                    let cpi_context = anchor_lang::context::CpiContext::new(
                        system_program.to_account_info(),
                        cpi_accounts,
                    );
                    anchor_lang::system_program::allocate(
                        cpi_context.with_signer(&[&[CONFIG_SEED, &[__bump][..]][..]]),
                        space as u64,
                    )?;
                    let cpi_accounts = anchor_lang::system_program::Assign {
                        account_to_assign: config.to_account_info(),
                    };
                    let cpi_context = anchor_lang::context::CpiContext::new(
                        system_program.to_account_info(),
                        cpi_accounts,
                    );
                    anchor_lang::system_program::assign(
                        cpi_context.with_signer(&[&[CONFIG_SEED, &[__bump][..]][..]]),
                        program_id,
                    )?;
                }
                match anchor_lang::accounts::account::Account::try_from_unchecked(
                    &config,
                ) {
                    Ok(val) => val,
                    Err(e) => return Err(e.with_account_name("config")),
                }
            } else {
                match anchor_lang::accounts::account::Account::try_from(&config) {
                    Ok(val) => val,
                    Err(e) => return Err(e.with_account_name("config")),
                }
            };
            if false {
                if space != actual_field.data_len() {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintSpace,
                            )
                            .with_account_name("config")
                            .with_values((space, actual_field.data_len())),
                    );
                }
                if actual_owner != program_id {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintOwner,
                            )
                            .with_account_name("config")
                            .with_pubkeys((*actual_owner, *program_id)),
                    );
                }
                {
                    let required_lamports = __anchor_rent.minimum_balance(space);
                    if pa.to_account_info().lamports() < required_lamports {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintRentExempt,
                                )
                                .with_account_name("config"),
                        );
                    }
                }
            }
            pa
        };
        if !config.to_account_info().is_writable {
            return Err(
                anchor_lang::error::Error::from(
                        anchor_lang::error::ErrorCode::ConstraintMut,
                    )
                    .with_account_name("config"),
            );
        }
        if !__anchor_rent
            .is_exempt(
                config.to_account_info().lamports(),
                config.to_account_info().try_data_len()?,
            )
        {
            return Err(
                anchor_lang::error::Error::from(
                        anchor_lang::error::ErrorCode::ConstraintRentExempt,
                    )
                    .with_account_name("config"),
            );
        }
        if !payer.to_account_info().is_writable {
            return Err(
                anchor_lang::error::Error::from(
                        anchor_lang::error::ErrorCode::ConstraintMut,
                    )
                    .with_account_name("payer"),
            );
        }
        {
            if treasury.mint != mint.key() {
                return Err(anchor_lang::error::ErrorCode::ConstraintTokenMint.into());
            }
        }
        Ok(Initialize {
            payer,
            config,
            mint,
            treasury,
            system_program,
        })
    }
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountInfos<'info> for Initialize<'info>
where
    'info: 'info,
{
    fn to_account_infos(
        &self,
    ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
        let mut account_infos = ::alloc::vec::Vec::new();
        account_infos.extend(self.payer.to_account_infos());
        account_infos.extend(self.config.to_account_infos());
        account_infos.extend(self.mint.to_account_infos());
        account_infos.extend(self.treasury.to_account_infos());
        account_infos.extend(self.system_program.to_account_infos());
        account_infos
    }
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountMetas for Initialize<'info> {
    fn to_account_metas(
        &self,
        is_signer: Option<bool>,
    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
        let mut account_metas = ::alloc::vec::Vec::new();
        account_metas.extend(self.payer.to_account_metas(None));
        account_metas.extend(self.config.to_account_metas(None));
        account_metas.extend(self.mint.to_account_metas(None));
        account_metas.extend(self.treasury.to_account_metas(None));
        account_metas.extend(self.system_program.to_account_metas(None));
        account_metas
    }
}
#[automatically_derived]
impl<'info> anchor_lang::AccountsExit<'info> for Initialize<'info>
where
    'info: 'info,
{
    fn exit(
        &self,
        program_id: &anchor_lang::solana_program::pubkey::Pubkey,
    ) -> anchor_lang::Result<()> {
        anchor_lang::AccountsExit::exit(&self.payer, program_id)
            .map_err(|e| e.with_account_name("payer"))?;
        anchor_lang::AccountsExit::exit(&self.config, program_id)
            .map_err(|e| e.with_account_name("config"))?;
        Ok(())
    }
}
/// An internal, Anchor generated module. This is used (as an
/// implementation detail), to generate a struct for a given
/// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
/// instead of an `AccountInfo`. This is useful for clients that want
/// to generate a list of accounts, without explicitly knowing the
/// order all the fields should be in.
///
/// To access the struct in this module, one should use the sibling
/// `accounts` module (also generated), which re-exports this.
pub(crate) mod __client_accounts_initialize {
    use super::*;
    use anchor_lang::prelude::borsh;
    /// Generated client accounts for [`Initialize`].
    pub struct Initialize {
        pub payer: anchor_lang::solana_program::pubkey::Pubkey,
        pub config: anchor_lang::solana_program::pubkey::Pubkey,
        ///Mint of the treasury
        pub mint: anchor_lang::solana_program::pubkey::Pubkey,
        ///Treasury token account. This is an externally owned token account and
        ///the owner of this account will approve the config as a delegate using the
        ///solana CLI command `spl-token approve <treasury_account_address> <approve_amount> <config_address>`
        pub treasury: anchor_lang::solana_program::pubkey::Pubkey,
        pub system_program: anchor_lang::solana_program::pubkey::Pubkey,
    }
    impl borsh::ser::BorshSerialize for Initialize
    where
        anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
        anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
        anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
        anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
        anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
    {
        fn serialize<W: borsh::maybestd::io::Write>(
            &self,
            writer: &mut W,
        ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
            borsh::BorshSerialize::serialize(&self.payer, writer)?;
            borsh::BorshSerialize::serialize(&self.config, writer)?;
            borsh::BorshSerialize::serialize(&self.mint, writer)?;
            borsh::BorshSerialize::serialize(&self.treasury, writer)?;
            borsh::BorshSerialize::serialize(&self.system_program, writer)?;
            Ok(())
        }
    }
    #[automatically_derived]
    impl anchor_lang::ToAccountMetas for Initialize {
        fn to_account_metas(
            &self,
            is_signer: Option<bool>,
        ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
            let mut account_metas = ::alloc::vec::Vec::new();
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new(
                        self.payer,
                        true,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new(
                        self.config,
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        self.mint,
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        self.treasury,
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        self.system_program,
                        false,
                    ),
                );
            account_metas
        }
    }
}
/// An internal, Anchor generated module. This is used (as an
/// implementation detail), to generate a CPI struct for a given
/// `#[derive(Accounts)]` implementation, where each field is an
/// AccountInfo.
///
/// To access the struct in this module, one should use the sibling
/// [`cpi::accounts`] module (also generated), which re-exports this.
pub(crate) mod __cpi_client_accounts_initialize {
    use super::*;
    /// Generated CPI struct of the accounts for [`Initialize`].
    pub struct Initialize<'info> {
        pub payer: anchor_lang::solana_program::account_info::AccountInfo<'info>,
        pub config: anchor_lang::solana_program::account_info::AccountInfo<'info>,
        ///Mint of the treasury
        pub mint: anchor_lang::solana_program::account_info::AccountInfo<'info>,
        ///Treasury token account. This is an externally owned token account and
        ///the owner of this account will approve the config as a delegate using the
        ///solana CLI command `spl-token approve <treasury_account_address> <approve_amount> <config_address>`
        pub treasury: anchor_lang::solana_program::account_info::AccountInfo<'info>,
        pub system_program: anchor_lang::solana_program::account_info::AccountInfo<
            'info,
        >,
    }
    #[automatically_derived]
    impl<'info> anchor_lang::ToAccountMetas for Initialize<'info> {
        fn to_account_metas(
            &self,
            is_signer: Option<bool>,
        ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
            let mut account_metas = ::alloc::vec::Vec::new();
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new(
                        anchor_lang::Key::key(&self.payer),
                        true,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new(
                        anchor_lang::Key::key(&self.config),
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        anchor_lang::Key::key(&self.mint),
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        anchor_lang::Key::key(&self.treasury),
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        anchor_lang::Key::key(&self.system_program),
                        false,
                    ),
                );
            account_metas
        }
    }
    #[automatically_derived]
    impl<'info> anchor_lang::ToAccountInfos<'info> for Initialize<'info> {
        fn to_account_infos(
            &self,
        ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
            let mut account_infos = ::alloc::vec::Vec::new();
            account_infos
                .extend(anchor_lang::ToAccountInfos::to_account_infos(&self.payer));
            account_infos
                .extend(anchor_lang::ToAccountInfos::to_account_infos(&self.config));
            account_infos
                .extend(anchor_lang::ToAccountInfos::to_account_infos(&self.mint));
            account_infos
                .extend(anchor_lang::ToAccountInfos::to_account_infos(&self.treasury));
            account_infos
                .extend(
                    anchor_lang::ToAccountInfos::to_account_infos(&self.system_program),
                );
            account_infos
        }
    }
}
#[instruction(claim_certificates:Vec<ClaimCertificate>)]
pub struct Claim<'info> {
    #[account(mut)]
    pub claimant: Signer<'info>,
    pub dispenser_guard: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump, has_one = dispenser_guard)]
    pub config: Account<'info, Config>,
    #[account(
        init_if_needed,
        space = Cart::LEN,
        payer = claimant,
        seeds = [CART_SEED,
        claimant.key.as_ref()],
        bump
    )]
    pub cart: Account<'info, Cart>,
    pub system_program: Program<'info, System>,
    /// CHECK : Anchor wants me to write this comment because I'm using AccountInfo which doesn't check for ownership and doesn't deserialize the account automatically. But it's fine because I check the address and I load it using load_instruction_at_checked.
    #[account(address = SYSVAR_IX_ID)]
    pub sysvar_instruction: AccountInfo<'info>,
}
#[automatically_derived]
impl<'info> anchor_lang::Accounts<'info> for Claim<'info>
where
    'info: 'info,
{
    #[inline(never)]
    fn try_accounts(
        program_id: &anchor_lang::solana_program::pubkey::Pubkey,
        accounts: &mut &[anchor_lang::solana_program::account_info::AccountInfo<'info>],
        ix_data: &[u8],
        __bumps: &mut std::collections::BTreeMap<String, u8>,
        __reallocs: &mut std::collections::BTreeSet<
            anchor_lang::solana_program::pubkey::Pubkey,
        >,
    ) -> anchor_lang::Result<Self> {
        let mut ix_data = ix_data;
        struct __Args {
            claim_certificates: Vec<ClaimCertificate>,
        }
        impl borsh::ser::BorshSerialize for __Args
        where
            Vec<ClaimCertificate>: borsh::ser::BorshSerialize,
        {
            fn serialize<W: borsh::maybestd::io::Write>(
                &self,
                writer: &mut W,
            ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                borsh::BorshSerialize::serialize(&self.claim_certificates, writer)?;
                Ok(())
            }
        }
        impl borsh::de::BorshDeserialize for __Args
        where
            Vec<ClaimCertificate>: borsh::BorshDeserialize,
        {
            fn deserialize(
                buf: &mut &[u8],
            ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
                Ok(Self {
                    claim_certificates: borsh::BorshDeserialize::deserialize(buf)?,
                })
            }
        }
        let __Args { claim_certificates } = __Args::deserialize(&mut ix_data)
            .map_err(|_| anchor_lang::error::ErrorCode::InstructionDidNotDeserialize)?;
        let claimant: Signer = anchor_lang::Accounts::try_accounts(
                program_id,
                accounts,
                ix_data,
                __bumps,
                __reallocs,
            )
            .map_err(|e| e.with_account_name("claimant"))?;
        let dispenser_guard: Signer = anchor_lang::Accounts::try_accounts(
                program_id,
                accounts,
                ix_data,
                __bumps,
                __reallocs,
            )
            .map_err(|e| e.with_account_name("dispenser_guard"))?;
        let config: anchor_lang::accounts::account::Account<Config> = anchor_lang::Accounts::try_accounts(
                program_id,
                accounts,
                ix_data,
                __bumps,
                __reallocs,
            )
            .map_err(|e| e.with_account_name("config"))?;
        if accounts.is_empty() {
            return Err(anchor_lang::error::ErrorCode::AccountNotEnoughKeys.into());
        }
        let cart = &accounts[0];
        *accounts = &accounts[1..];
        let system_program: anchor_lang::accounts::program::Program<System> = anchor_lang::Accounts::try_accounts(
                program_id,
                accounts,
                ix_data,
                __bumps,
                __reallocs,
            )
            .map_err(|e| e.with_account_name("system_program"))?;
        let sysvar_instruction: AccountInfo = anchor_lang::Accounts::try_accounts(
                program_id,
                accounts,
                ix_data,
                __bumps,
                __reallocs,
            )
            .map_err(|e| e.with_account_name("sysvar_instruction"))?;
        let __anchor_rent = Rent::get()?;
        let (__pda_address, __bump) = Pubkey::find_program_address(
            &[CART_SEED, claimant.key.as_ref()],
            program_id,
        );
        __bumps.insert("cart".to_string(), __bump);
        if cart.key() != __pda_address {
            return Err(
                anchor_lang::error::Error::from(
                        anchor_lang::error::ErrorCode::ConstraintSeeds,
                    )
                    .with_account_name("cart")
                    .with_pubkeys((cart.key(), __pda_address)),
            );
        }
        let cart = {
            let actual_field = cart.to_account_info();
            let actual_owner = actual_field.owner;
            let space = Cart::LEN;
            let pa: anchor_lang::accounts::account::Account<Cart> = if !true
                || actual_owner == &anchor_lang::solana_program::system_program::ID
            {
                let __current_lamports = cart.lamports();
                if __current_lamports == 0 {
                    let space = space;
                    let lamports = __anchor_rent.minimum_balance(space);
                    let cpi_accounts = anchor_lang::system_program::CreateAccount {
                        from: claimant.to_account_info(),
                        to: cart.to_account_info(),
                    };
                    let cpi_context = anchor_lang::context::CpiContext::new(
                        system_program.to_account_info(),
                        cpi_accounts,
                    );
                    anchor_lang::system_program::create_account(
                        cpi_context
                            .with_signer(
                                &[&[CART_SEED, claimant.key.as_ref(), &[__bump][..]][..]],
                            ),
                        lamports,
                        space as u64,
                        program_id,
                    )?;
                } else {
                    if claimant.key() == cart.key() {
                        return Err(
                            anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                                    error_name: anchor_lang::error::ErrorCode::TryingToInitPayerAsProgramAccount
                                        .name(),
                                    error_code_number: anchor_lang::error::ErrorCode::TryingToInitPayerAsProgramAccount
                                        .into(),
                                    error_msg: anchor_lang::error::ErrorCode::TryingToInitPayerAsProgramAccount
                                        .to_string(),
                                    error_origin: Some(
                                        anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                            filename: "programs/token-dispenser/src/lib.rs",
                                            line: 189u32,
                                        }),
                                    ),
                                    compared_values: None,
                                })
                                .with_pubkeys((claimant.key(), cart.key())),
                        );
                    }
                    let required_lamports = __anchor_rent
                        .minimum_balance(space)
                        .max(1)
                        .saturating_sub(__current_lamports);
                    if required_lamports > 0 {
                        let cpi_accounts = anchor_lang::system_program::Transfer {
                            from: claimant.to_account_info(),
                            to: cart.to_account_info(),
                        };
                        let cpi_context = anchor_lang::context::CpiContext::new(
                            system_program.to_account_info(),
                            cpi_accounts,
                        );
                        anchor_lang::system_program::transfer(
                            cpi_context,
                            required_lamports,
                        )?;
                    }
                    let cpi_accounts = anchor_lang::system_program::Allocate {
                        account_to_allocate: cart.to_account_info(),
                    };
                    let cpi_context = anchor_lang::context::CpiContext::new(
                        system_program.to_account_info(),
                        cpi_accounts,
                    );
                    anchor_lang::system_program::allocate(
                        cpi_context
                            .with_signer(
                                &[&[CART_SEED, claimant.key.as_ref(), &[__bump][..]][..]],
                            ),
                        space as u64,
                    )?;
                    let cpi_accounts = anchor_lang::system_program::Assign {
                        account_to_assign: cart.to_account_info(),
                    };
                    let cpi_context = anchor_lang::context::CpiContext::new(
                        system_program.to_account_info(),
                        cpi_accounts,
                    );
                    anchor_lang::system_program::assign(
                        cpi_context
                            .with_signer(
                                &[&[CART_SEED, claimant.key.as_ref(), &[__bump][..]][..]],
                            ),
                        program_id,
                    )?;
                }
                match anchor_lang::accounts::account::Account::try_from_unchecked(
                    &cart,
                ) {
                    Ok(val) => val,
                    Err(e) => return Err(e.with_account_name("cart")),
                }
            } else {
                match anchor_lang::accounts::account::Account::try_from(&cart) {
                    Ok(val) => val,
                    Err(e) => return Err(e.with_account_name("cart")),
                }
            };
            if true {
                if space != actual_field.data_len() {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintSpace,
                            )
                            .with_account_name("cart")
                            .with_values((space, actual_field.data_len())),
                    );
                }
                if actual_owner != program_id {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintOwner,
                            )
                            .with_account_name("cart")
                            .with_pubkeys((*actual_owner, *program_id)),
                    );
                }
                {
                    let required_lamports = __anchor_rent.minimum_balance(space);
                    if pa.to_account_info().lamports() < required_lamports {
                        return Err(
                            anchor_lang::error::Error::from(
                                    anchor_lang::error::ErrorCode::ConstraintRentExempt,
                                )
                                .with_account_name("cart"),
                        );
                    }
                }
            }
            pa
        };
        if !cart.to_account_info().is_writable {
            return Err(
                anchor_lang::error::Error::from(
                        anchor_lang::error::ErrorCode::ConstraintMut,
                    )
                    .with_account_name("cart"),
            );
        }
        if !__anchor_rent
            .is_exempt(
                cart.to_account_info().lamports(),
                cart.to_account_info().try_data_len()?,
            )
        {
            return Err(
                anchor_lang::error::Error::from(
                        anchor_lang::error::ErrorCode::ConstraintRentExempt,
                    )
                    .with_account_name("cart"),
            );
        }
        if !claimant.to_account_info().is_writable {
            return Err(
                anchor_lang::error::Error::from(
                        anchor_lang::error::ErrorCode::ConstraintMut,
                    )
                    .with_account_name("claimant"),
            );
        }
        let __pda_address = Pubkey::create_program_address(
                &[CONFIG_SEED, &[config.bump][..]],
                &program_id,
            )
            .map_err(|_| {
                anchor_lang::error::Error::from(
                        anchor_lang::error::ErrorCode::ConstraintSeeds,
                    )
                    .with_account_name("config")
            })?;
        if config.key() != __pda_address {
            return Err(
                anchor_lang::error::Error::from(
                        anchor_lang::error::ErrorCode::ConstraintSeeds,
                    )
                    .with_account_name("config")
                    .with_pubkeys((config.key(), __pda_address)),
            );
        }
        {
            let my_key = config.dispenser_guard;
            let target_key = dispenser_guard.key();
            if my_key != target_key {
                return Err(
                    anchor_lang::error::Error::from(
                            anchor_lang::error::ErrorCode::ConstraintHasOne,
                        )
                        .with_account_name("config")
                        .with_pubkeys((my_key, target_key)),
                );
            }
        }
        {
            let actual = sysvar_instruction.key();
            let expected = SYSVAR_IX_ID;
            if actual != expected {
                return Err(
                    anchor_lang::error::Error::from(
                            anchor_lang::error::ErrorCode::ConstraintAddress,
                        )
                        .with_account_name("sysvar_instruction")
                        .with_pubkeys((actual, expected)),
                );
            }
        }
        Ok(Claim {
            claimant,
            dispenser_guard,
            config,
            cart,
            system_program,
            sysvar_instruction,
        })
    }
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountInfos<'info> for Claim<'info>
where
    'info: 'info,
{
    fn to_account_infos(
        &self,
    ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
        let mut account_infos = ::alloc::vec::Vec::new();
        account_infos.extend(self.claimant.to_account_infos());
        account_infos.extend(self.dispenser_guard.to_account_infos());
        account_infos.extend(self.config.to_account_infos());
        account_infos.extend(self.cart.to_account_infos());
        account_infos.extend(self.system_program.to_account_infos());
        account_infos.extend(self.sysvar_instruction.to_account_infos());
        account_infos
    }
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountMetas for Claim<'info> {
    fn to_account_metas(
        &self,
        is_signer: Option<bool>,
    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
        let mut account_metas = ::alloc::vec::Vec::new();
        account_metas.extend(self.claimant.to_account_metas(None));
        account_metas.extend(self.dispenser_guard.to_account_metas(None));
        account_metas.extend(self.config.to_account_metas(None));
        account_metas.extend(self.cart.to_account_metas(None));
        account_metas.extend(self.system_program.to_account_metas(None));
        account_metas.extend(self.sysvar_instruction.to_account_metas(None));
        account_metas
    }
}
#[automatically_derived]
impl<'info> anchor_lang::AccountsExit<'info> for Claim<'info>
where
    'info: 'info,
{
    fn exit(
        &self,
        program_id: &anchor_lang::solana_program::pubkey::Pubkey,
    ) -> anchor_lang::Result<()> {
        anchor_lang::AccountsExit::exit(&self.claimant, program_id)
            .map_err(|e| e.with_account_name("claimant"))?;
        anchor_lang::AccountsExit::exit(&self.cart, program_id)
            .map_err(|e| e.with_account_name("cart"))?;
        Ok(())
    }
}
/// An internal, Anchor generated module. This is used (as an
/// implementation detail), to generate a struct for a given
/// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
/// instead of an `AccountInfo`. This is useful for clients that want
/// to generate a list of accounts, without explicitly knowing the
/// order all the fields should be in.
///
/// To access the struct in this module, one should use the sibling
/// `accounts` module (also generated), which re-exports this.
pub(crate) mod __client_accounts_claim {
    use super::*;
    use anchor_lang::prelude::borsh;
    /// Generated client accounts for [`Claim`].
    pub struct Claim {
        pub claimant: anchor_lang::solana_program::pubkey::Pubkey,
        pub dispenser_guard: anchor_lang::solana_program::pubkey::Pubkey,
        pub config: anchor_lang::solana_program::pubkey::Pubkey,
        pub cart: anchor_lang::solana_program::pubkey::Pubkey,
        pub system_program: anchor_lang::solana_program::pubkey::Pubkey,
        ///CHECK : Anchor wants me to write this comment because I'm using AccountInfo which doesn't check for ownership and doesn't deserialize the account automatically. But it's fine because I check the address and I load it using load_instruction_at_checked.
        pub sysvar_instruction: anchor_lang::solana_program::pubkey::Pubkey,
    }
    impl borsh::ser::BorshSerialize for Claim
    where
        anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
        anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
        anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
        anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
        anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
        anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
    {
        fn serialize<W: borsh::maybestd::io::Write>(
            &self,
            writer: &mut W,
        ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
            borsh::BorshSerialize::serialize(&self.claimant, writer)?;
            borsh::BorshSerialize::serialize(&self.dispenser_guard, writer)?;
            borsh::BorshSerialize::serialize(&self.config, writer)?;
            borsh::BorshSerialize::serialize(&self.cart, writer)?;
            borsh::BorshSerialize::serialize(&self.system_program, writer)?;
            borsh::BorshSerialize::serialize(&self.sysvar_instruction, writer)?;
            Ok(())
        }
    }
    #[automatically_derived]
    impl anchor_lang::ToAccountMetas for Claim {
        fn to_account_metas(
            &self,
            is_signer: Option<bool>,
        ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
            let mut account_metas = ::alloc::vec::Vec::new();
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new(
                        self.claimant,
                        true,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        self.dispenser_guard,
                        true,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        self.config,
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new(
                        self.cart,
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        self.system_program,
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        self.sysvar_instruction,
                        false,
                    ),
                );
            account_metas
        }
    }
}
/// An internal, Anchor generated module. This is used (as an
/// implementation detail), to generate a CPI struct for a given
/// `#[derive(Accounts)]` implementation, where each field is an
/// AccountInfo.
///
/// To access the struct in this module, one should use the sibling
/// [`cpi::accounts`] module (also generated), which re-exports this.
pub(crate) mod __cpi_client_accounts_claim {
    use super::*;
    /// Generated CPI struct of the accounts for [`Claim`].
    pub struct Claim<'info> {
        pub claimant: anchor_lang::solana_program::account_info::AccountInfo<'info>,
        pub dispenser_guard: anchor_lang::solana_program::account_info::AccountInfo<
            'info,
        >,
        pub config: anchor_lang::solana_program::account_info::AccountInfo<'info>,
        pub cart: anchor_lang::solana_program::account_info::AccountInfo<'info>,
        pub system_program: anchor_lang::solana_program::account_info::AccountInfo<
            'info,
        >,
        ///CHECK : Anchor wants me to write this comment because I'm using AccountInfo which doesn't check for ownership and doesn't deserialize the account automatically. But it's fine because I check the address and I load it using load_instruction_at_checked.
        pub sysvar_instruction: anchor_lang::solana_program::account_info::AccountInfo<
            'info,
        >,
    }
    #[automatically_derived]
    impl<'info> anchor_lang::ToAccountMetas for Claim<'info> {
        fn to_account_metas(
            &self,
            is_signer: Option<bool>,
        ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
            let mut account_metas = ::alloc::vec::Vec::new();
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new(
                        anchor_lang::Key::key(&self.claimant),
                        true,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        anchor_lang::Key::key(&self.dispenser_guard),
                        true,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        anchor_lang::Key::key(&self.config),
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new(
                        anchor_lang::Key::key(&self.cart),
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        anchor_lang::Key::key(&self.system_program),
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        anchor_lang::Key::key(&self.sysvar_instruction),
                        false,
                    ),
                );
            account_metas
        }
    }
    #[automatically_derived]
    impl<'info> anchor_lang::ToAccountInfos<'info> for Claim<'info> {
        fn to_account_infos(
            &self,
        ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
            let mut account_infos = ::alloc::vec::Vec::new();
            account_infos
                .extend(anchor_lang::ToAccountInfos::to_account_infos(&self.claimant));
            account_infos
                .extend(
                    anchor_lang::ToAccountInfos::to_account_infos(&self.dispenser_guard),
                );
            account_infos
                .extend(anchor_lang::ToAccountInfos::to_account_infos(&self.config));
            account_infos
                .extend(anchor_lang::ToAccountInfos::to_account_infos(&self.cart));
            account_infos
                .extend(
                    anchor_lang::ToAccountInfos::to_account_infos(&self.system_program),
                );
            account_infos
                .extend(
                    anchor_lang::ToAccountInfos::to_account_infos(
                        &self.sysvar_instruction,
                    ),
                );
            account_infos
        }
    }
}
pub struct Checkout<'info> {
    #[account(mut)]
    pub claimant: Signer<'info>,
    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = mint,
        has_one = treasury,
    )]
    pub config: Account<'info, Config>,
    /// Mint of the treasury & claimant_fund token account.
    /// Needed if the `claimant_fund` token account needs to be initialized
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub treasury: Account<'info, TokenAccount>,
    #[account(mut, seeds = [CART_SEED, claimant.key.as_ref()], bump)]
    pub cart: Account<'info, Cart>,
    /// Claimant's associated token account for receiving their claim/token grant
    #[account(
        init_if_needed,
        payer = claimant,
        associated_token::authority = claimant,
        associated_token::mint = mint,
    )]
    pub claimant_fund: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}
#[automatically_derived]
impl<'info> anchor_lang::Accounts<'info> for Checkout<'info>
where
    'info: 'info,
{
    #[inline(never)]
    fn try_accounts(
        program_id: &anchor_lang::solana_program::pubkey::Pubkey,
        accounts: &mut &[anchor_lang::solana_program::account_info::AccountInfo<'info>],
        ix_data: &[u8],
        __bumps: &mut std::collections::BTreeMap<String, u8>,
        __reallocs: &mut std::collections::BTreeSet<
            anchor_lang::solana_program::pubkey::Pubkey,
        >,
    ) -> anchor_lang::Result<Self> {
        let claimant: Signer = anchor_lang::Accounts::try_accounts(
                program_id,
                accounts,
                ix_data,
                __bumps,
                __reallocs,
            )
            .map_err(|e| e.with_account_name("claimant"))?;
        let config: anchor_lang::accounts::account::Account<Config> = anchor_lang::Accounts::try_accounts(
                program_id,
                accounts,
                ix_data,
                __bumps,
                __reallocs,
            )
            .map_err(|e| e.with_account_name("config"))?;
        let mint: anchor_lang::accounts::account::Account<Mint> = anchor_lang::Accounts::try_accounts(
                program_id,
                accounts,
                ix_data,
                __bumps,
                __reallocs,
            )
            .map_err(|e| e.with_account_name("mint"))?;
        let treasury: anchor_lang::accounts::account::Account<TokenAccount> = anchor_lang::Accounts::try_accounts(
                program_id,
                accounts,
                ix_data,
                __bumps,
                __reallocs,
            )
            .map_err(|e| e.with_account_name("treasury"))?;
        let cart: anchor_lang::accounts::account::Account<Cart> = anchor_lang::Accounts::try_accounts(
                program_id,
                accounts,
                ix_data,
                __bumps,
                __reallocs,
            )
            .map_err(|e| e.with_account_name("cart"))?;
        if accounts.is_empty() {
            return Err(anchor_lang::error::ErrorCode::AccountNotEnoughKeys.into());
        }
        let claimant_fund = &accounts[0];
        *accounts = &accounts[1..];
        let system_program: anchor_lang::accounts::program::Program<System> = anchor_lang::Accounts::try_accounts(
                program_id,
                accounts,
                ix_data,
                __bumps,
                __reallocs,
            )
            .map_err(|e| e.with_account_name("system_program"))?;
        let token_program: anchor_lang::accounts::program::Program<Token> = anchor_lang::Accounts::try_accounts(
                program_id,
                accounts,
                ix_data,
                __bumps,
                __reallocs,
            )
            .map_err(|e| e.with_account_name("token_program"))?;
        let associated_token_program: anchor_lang::accounts::program::Program<
            AssociatedToken,
        > = anchor_lang::Accounts::try_accounts(
                program_id,
                accounts,
                ix_data,
                __bumps,
                __reallocs,
            )
            .map_err(|e| e.with_account_name("associated_token_program"))?;
        let __anchor_rent = Rent::get()?;
        let claimant_fund: anchor_lang::accounts::account::Account<TokenAccount> = {
            if !true
                || AsRef::<AccountInfo>::as_ref(&claimant_fund).owner
                    == &anchor_lang::solana_program::system_program::ID
            {
                let cpi_program = associated_token_program.to_account_info();
                let cpi_accounts = ::anchor_spl::associated_token::Create {
                    payer: claimant.to_account_info(),
                    associated_token: claimant_fund.to_account_info(),
                    authority: claimant.to_account_info(),
                    mint: mint.to_account_info(),
                    system_program: system_program.to_account_info(),
                    token_program: token_program.to_account_info(),
                };
                let cpi_ctx = anchor_lang::context::CpiContext::new(
                    cpi_program,
                    cpi_accounts,
                );
                ::anchor_spl::associated_token::create(cpi_ctx)?;
            }
            let pa: anchor_lang::accounts::account::Account<TokenAccount> = match anchor_lang::accounts::account::Account::try_from_unchecked(
                &claimant_fund,
            ) {
                Ok(val) => val,
                Err(e) => return Err(e.with_account_name("claimant_fund")),
            };
            if true {
                if pa.mint != mint.key() {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintTokenMint,
                            )
                            .with_account_name("claimant_fund")
                            .with_pubkeys((pa.mint, mint.key())),
                    );
                }
                if pa.owner != claimant.key() {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::ConstraintTokenOwner,
                            )
                            .with_account_name("claimant_fund")
                            .with_pubkeys((pa.owner, claimant.key())),
                    );
                }
                if pa.key()
                    != ::anchor_spl::associated_token::get_associated_token_address(
                        &claimant.key(),
                        &mint.key(),
                    )
                {
                    return Err(
                        anchor_lang::error::Error::from(
                                anchor_lang::error::ErrorCode::AccountNotAssociatedTokenAccount,
                            )
                            .with_account_name("claimant_fund"),
                    );
                }
            }
            pa
        };
        if !claimant_fund.to_account_info().is_writable {
            return Err(
                anchor_lang::error::Error::from(
                        anchor_lang::error::ErrorCode::ConstraintMut,
                    )
                    .with_account_name("claimant_fund"),
            );
        }
        if !__anchor_rent
            .is_exempt(
                claimant_fund.to_account_info().lamports(),
                claimant_fund.to_account_info().try_data_len()?,
            )
        {
            return Err(
                anchor_lang::error::Error::from(
                        anchor_lang::error::ErrorCode::ConstraintRentExempt,
                    )
                    .with_account_name("claimant_fund"),
            );
        }
        if !claimant.to_account_info().is_writable {
            return Err(
                anchor_lang::error::Error::from(
                        anchor_lang::error::ErrorCode::ConstraintMut,
                    )
                    .with_account_name("claimant"),
            );
        }
        let __pda_address = Pubkey::create_program_address(
                &[CONFIG_SEED, &[config.bump][..]],
                &program_id,
            )
            .map_err(|_| {
                anchor_lang::error::Error::from(
                        anchor_lang::error::ErrorCode::ConstraintSeeds,
                    )
                    .with_account_name("config")
            })?;
        if config.key() != __pda_address {
            return Err(
                anchor_lang::error::Error::from(
                        anchor_lang::error::ErrorCode::ConstraintSeeds,
                    )
                    .with_account_name("config")
                    .with_pubkeys((config.key(), __pda_address)),
            );
        }
        {
            let my_key = config.mint;
            let target_key = mint.key();
            if my_key != target_key {
                return Err(
                    anchor_lang::error::Error::from(
                            anchor_lang::error::ErrorCode::ConstraintHasOne,
                        )
                        .with_account_name("config")
                        .with_pubkeys((my_key, target_key)),
                );
            }
        }
        {
            let my_key = config.treasury;
            let target_key = treasury.key();
            if my_key != target_key {
                return Err(
                    anchor_lang::error::Error::from(
                            anchor_lang::error::ErrorCode::ConstraintHasOne,
                        )
                        .with_account_name("config")
                        .with_pubkeys((my_key, target_key)),
                );
            }
        }
        if !treasury.to_account_info().is_writable {
            return Err(
                anchor_lang::error::Error::from(
                        anchor_lang::error::ErrorCode::ConstraintMut,
                    )
                    .with_account_name("treasury"),
            );
        }
        let (__pda_address, __bump) = Pubkey::find_program_address(
            &[CART_SEED, claimant.key.as_ref()],
            &program_id,
        );
        __bumps.insert("cart".to_string(), __bump);
        if cart.key() != __pda_address {
            return Err(
                anchor_lang::error::Error::from(
                        anchor_lang::error::ErrorCode::ConstraintSeeds,
                    )
                    .with_account_name("cart")
                    .with_pubkeys((cart.key(), __pda_address)),
            );
        }
        if !cart.to_account_info().is_writable {
            return Err(
                anchor_lang::error::Error::from(
                        anchor_lang::error::ErrorCode::ConstraintMut,
                    )
                    .with_account_name("cart"),
            );
        }
        Ok(Checkout {
            claimant,
            config,
            mint,
            treasury,
            cart,
            claimant_fund,
            system_program,
            token_program,
            associated_token_program,
        })
    }
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountInfos<'info> for Checkout<'info>
where
    'info: 'info,
{
    fn to_account_infos(
        &self,
    ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
        let mut account_infos = ::alloc::vec::Vec::new();
        account_infos.extend(self.claimant.to_account_infos());
        account_infos.extend(self.config.to_account_infos());
        account_infos.extend(self.mint.to_account_infos());
        account_infos.extend(self.treasury.to_account_infos());
        account_infos.extend(self.cart.to_account_infos());
        account_infos.extend(self.claimant_fund.to_account_infos());
        account_infos.extend(self.system_program.to_account_infos());
        account_infos.extend(self.token_program.to_account_infos());
        account_infos.extend(self.associated_token_program.to_account_infos());
        account_infos
    }
}
#[automatically_derived]
impl<'info> anchor_lang::ToAccountMetas for Checkout<'info> {
    fn to_account_metas(
        &self,
        is_signer: Option<bool>,
    ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
        let mut account_metas = ::alloc::vec::Vec::new();
        account_metas.extend(self.claimant.to_account_metas(None));
        account_metas.extend(self.config.to_account_metas(None));
        account_metas.extend(self.mint.to_account_metas(None));
        account_metas.extend(self.treasury.to_account_metas(None));
        account_metas.extend(self.cart.to_account_metas(None));
        account_metas.extend(self.claimant_fund.to_account_metas(None));
        account_metas.extend(self.system_program.to_account_metas(None));
        account_metas.extend(self.token_program.to_account_metas(None));
        account_metas.extend(self.associated_token_program.to_account_metas(None));
        account_metas
    }
}
#[automatically_derived]
impl<'info> anchor_lang::AccountsExit<'info> for Checkout<'info>
where
    'info: 'info,
{
    fn exit(
        &self,
        program_id: &anchor_lang::solana_program::pubkey::Pubkey,
    ) -> anchor_lang::Result<()> {
        anchor_lang::AccountsExit::exit(&self.claimant, program_id)
            .map_err(|e| e.with_account_name("claimant"))?;
        anchor_lang::AccountsExit::exit(&self.treasury, program_id)
            .map_err(|e| e.with_account_name("treasury"))?;
        anchor_lang::AccountsExit::exit(&self.cart, program_id)
            .map_err(|e| e.with_account_name("cart"))?;
        anchor_lang::AccountsExit::exit(&self.claimant_fund, program_id)
            .map_err(|e| e.with_account_name("claimant_fund"))?;
        Ok(())
    }
}
/// An internal, Anchor generated module. This is used (as an
/// implementation detail), to generate a struct for a given
/// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
/// instead of an `AccountInfo`. This is useful for clients that want
/// to generate a list of accounts, without explicitly knowing the
/// order all the fields should be in.
///
/// To access the struct in this module, one should use the sibling
/// `accounts` module (also generated), which re-exports this.
pub(crate) mod __client_accounts_checkout {
    use super::*;
    use anchor_lang::prelude::borsh;
    /// Generated client accounts for [`Checkout`].
    pub struct Checkout {
        pub claimant: anchor_lang::solana_program::pubkey::Pubkey,
        pub config: anchor_lang::solana_program::pubkey::Pubkey,
        ///Mint of the treasury & claimant_fund token account.
        ///Needed if the `claimant_fund` token account needs to be initialized
        pub mint: anchor_lang::solana_program::pubkey::Pubkey,
        pub treasury: anchor_lang::solana_program::pubkey::Pubkey,
        pub cart: anchor_lang::solana_program::pubkey::Pubkey,
        ///Claimant's associated token account for receiving their claim/token grant
        pub claimant_fund: anchor_lang::solana_program::pubkey::Pubkey,
        pub system_program: anchor_lang::solana_program::pubkey::Pubkey,
        pub token_program: anchor_lang::solana_program::pubkey::Pubkey,
        pub associated_token_program: anchor_lang::solana_program::pubkey::Pubkey,
    }
    impl borsh::ser::BorshSerialize for Checkout
    where
        anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
        anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
        anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
        anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
        anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
        anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
        anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
        anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
        anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
    {
        fn serialize<W: borsh::maybestd::io::Write>(
            &self,
            writer: &mut W,
        ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
            borsh::BorshSerialize::serialize(&self.claimant, writer)?;
            borsh::BorshSerialize::serialize(&self.config, writer)?;
            borsh::BorshSerialize::serialize(&self.mint, writer)?;
            borsh::BorshSerialize::serialize(&self.treasury, writer)?;
            borsh::BorshSerialize::serialize(&self.cart, writer)?;
            borsh::BorshSerialize::serialize(&self.claimant_fund, writer)?;
            borsh::BorshSerialize::serialize(&self.system_program, writer)?;
            borsh::BorshSerialize::serialize(&self.token_program, writer)?;
            borsh::BorshSerialize::serialize(&self.associated_token_program, writer)?;
            Ok(())
        }
    }
    #[automatically_derived]
    impl anchor_lang::ToAccountMetas for Checkout {
        fn to_account_metas(
            &self,
            is_signer: Option<bool>,
        ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
            let mut account_metas = ::alloc::vec::Vec::new();
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new(
                        self.claimant,
                        true,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        self.config,
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        self.mint,
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new(
                        self.treasury,
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new(
                        self.cart,
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new(
                        self.claimant_fund,
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        self.system_program,
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        self.token_program,
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        self.associated_token_program,
                        false,
                    ),
                );
            account_metas
        }
    }
}
/// An internal, Anchor generated module. This is used (as an
/// implementation detail), to generate a CPI struct for a given
/// `#[derive(Accounts)]` implementation, where each field is an
/// AccountInfo.
///
/// To access the struct in this module, one should use the sibling
/// [`cpi::accounts`] module (also generated), which re-exports this.
pub(crate) mod __cpi_client_accounts_checkout {
    use super::*;
    /// Generated CPI struct of the accounts for [`Checkout`].
    pub struct Checkout<'info> {
        pub claimant: anchor_lang::solana_program::account_info::AccountInfo<'info>,
        pub config: anchor_lang::solana_program::account_info::AccountInfo<'info>,
        ///Mint of the treasury & claimant_fund token account.
        ///Needed if the `claimant_fund` token account needs to be initialized
        pub mint: anchor_lang::solana_program::account_info::AccountInfo<'info>,
        pub treasury: anchor_lang::solana_program::account_info::AccountInfo<'info>,
        pub cart: anchor_lang::solana_program::account_info::AccountInfo<'info>,
        ///Claimant's associated token account for receiving their claim/token grant
        pub claimant_fund: anchor_lang::solana_program::account_info::AccountInfo<'info>,
        pub system_program: anchor_lang::solana_program::account_info::AccountInfo<
            'info,
        >,
        pub token_program: anchor_lang::solana_program::account_info::AccountInfo<'info>,
        pub associated_token_program: anchor_lang::solana_program::account_info::AccountInfo<
            'info,
        >,
    }
    #[automatically_derived]
    impl<'info> anchor_lang::ToAccountMetas for Checkout<'info> {
        fn to_account_metas(
            &self,
            is_signer: Option<bool>,
        ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
            let mut account_metas = ::alloc::vec::Vec::new();
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new(
                        anchor_lang::Key::key(&self.claimant),
                        true,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        anchor_lang::Key::key(&self.config),
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        anchor_lang::Key::key(&self.mint),
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new(
                        anchor_lang::Key::key(&self.treasury),
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new(
                        anchor_lang::Key::key(&self.cart),
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new(
                        anchor_lang::Key::key(&self.claimant_fund),
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        anchor_lang::Key::key(&self.system_program),
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        anchor_lang::Key::key(&self.token_program),
                        false,
                    ),
                );
            account_metas
                .push(
                    anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                        anchor_lang::Key::key(&self.associated_token_program),
                        false,
                    ),
                );
            account_metas
        }
    }
    #[automatically_derived]
    impl<'info> anchor_lang::ToAccountInfos<'info> for Checkout<'info> {
        fn to_account_infos(
            &self,
        ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
            let mut account_infos = ::alloc::vec::Vec::new();
            account_infos
                .extend(anchor_lang::ToAccountInfos::to_account_infos(&self.claimant));
            account_infos
                .extend(anchor_lang::ToAccountInfos::to_account_infos(&self.config));
            account_infos
                .extend(anchor_lang::ToAccountInfos::to_account_infos(&self.mint));
            account_infos
                .extend(anchor_lang::ToAccountInfos::to_account_infos(&self.treasury));
            account_infos
                .extend(anchor_lang::ToAccountInfos::to_account_infos(&self.cart));
            account_infos
                .extend(
                    anchor_lang::ToAccountInfos::to_account_infos(&self.claimant_fund),
                );
            account_infos
                .extend(
                    anchor_lang::ToAccountInfos::to_account_infos(&self.system_program),
                );
            account_infos
                .extend(
                    anchor_lang::ToAccountInfos::to_account_infos(&self.token_program),
                );
            account_infos
                .extend(
                    anchor_lang::ToAccountInfos::to_account_infos(
                        &self.associated_token_program,
                    ),
                );
            account_infos
        }
    }
}
pub struct ClaimInfo {
    identity: Identity,
    amount: u64,
}
impl borsh::de::BorshDeserialize for ClaimInfo
where
    Identity: borsh::BorshDeserialize,
    u64: borsh::BorshDeserialize,
{
    fn deserialize(
        buf: &mut &[u8],
    ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
        Ok(Self {
            identity: borsh::BorshDeserialize::deserialize(buf)?,
            amount: borsh::BorshDeserialize::deserialize(buf)?,
        })
    }
}
impl borsh::ser::BorshSerialize for ClaimInfo
where
    Identity: borsh::ser::BorshSerialize,
    u64: borsh::ser::BorshSerialize,
{
    fn serialize<W: borsh::maybestd::io::Write>(
        &self,
        writer: &mut W,
    ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
        borsh::BorshSerialize::serialize(&self.identity, writer)?;
        borsh::BorshSerialize::serialize(&self.amount, writer)?;
        Ok(())
    }
}
#[automatically_derived]
impl ::core::clone::Clone for ClaimInfo {
    #[inline]
    fn clone(&self) -> ClaimInfo {
        ClaimInfo {
            identity: ::core::clone::Clone::clone(&self.identity),
            amount: ::core::clone::Clone::clone(&self.amount),
        }
    }
}
/**
 * This is the identity that the claimant will use to claim tokens.
 * A claimant can claim tokens for 1 identity on each ecosystem.
 * Typically for a blockchain it is a public key in the blockchain's address space.
 */
pub enum Identity {
    Discord { username: String },
    Solana { pubkey: Pubkey },
    Evm { pubkey: EvmPubkey },
    Sui,
    Aptos,
    Cosmwasm { address: CosmosBech32Address },
}
impl borsh::de::BorshDeserialize for Identity
where
    String: borsh::BorshDeserialize,
    Pubkey: borsh::BorshDeserialize,
    EvmPubkey: borsh::BorshDeserialize,
    CosmosBech32Address: borsh::BorshDeserialize,
{
    fn deserialize(
        buf: &mut &[u8],
    ) -> core::result::Result<Self, borsh::maybestd::io::Error> {
        let variant_idx: u8 = borsh::BorshDeserialize::deserialize(buf)?;
        let return_value = match variant_idx {
            0u8 => {
                Identity::Discord {
                    username: borsh::BorshDeserialize::deserialize(buf)?,
                }
            }
            1u8 => {
                Identity::Solana {
                    pubkey: borsh::BorshDeserialize::deserialize(buf)?,
                }
            }
            2u8 => {
                Identity::Evm {
                    pubkey: borsh::BorshDeserialize::deserialize(buf)?,
                }
            }
            3u8 => Identity::Sui,
            4u8 => Identity::Aptos,
            5u8 => {
                Identity::Cosmwasm {
                    address: borsh::BorshDeserialize::deserialize(buf)?,
                }
            }
            _ => {
                let msg = {
                    let res = ::alloc::fmt::format(
                        ::core::fmt::Arguments::new_v1(
                            &["Unexpected variant index: "],
                            &[::core::fmt::ArgumentV1::new_debug(&variant_idx)],
                        ),
                    );
                    res
                };
                return Err(
                    borsh::maybestd::io::Error::new(
                        borsh::maybestd::io::ErrorKind::InvalidInput,
                        msg,
                    ),
                );
            }
        };
        Ok(return_value)
    }
}
impl borsh::ser::BorshSerialize for Identity
where
    String: borsh::ser::BorshSerialize,
    Pubkey: borsh::ser::BorshSerialize,
    EvmPubkey: borsh::ser::BorshSerialize,
    CosmosBech32Address: borsh::ser::BorshSerialize,
{
    fn serialize<W: borsh::maybestd::io::Write>(
        &self,
        writer: &mut W,
    ) -> core::result::Result<(), borsh::maybestd::io::Error> {
        let variant_idx: u8 = match self {
            Identity::Discord { .. } => 0u8,
            Identity::Solana { .. } => 1u8,
            Identity::Evm { .. } => 2u8,
            Identity::Sui => 3u8,
            Identity::Aptos => 4u8,
            Identity::Cosmwasm { .. } => 5u8,
        };
        writer.write_all(&variant_idx.to_le_bytes())?;
        match self {
            Identity::Discord { username } => {
                borsh::BorshSerialize::serialize(username, writer)?;
            }
            Identity::Solana { pubkey } => {
                borsh::BorshSerialize::serialize(pubkey, writer)?;
            }
            Identity::Evm { pubkey } => {
                borsh::BorshSerialize::serialize(pubkey, writer)?;
            }
            Identity::Sui => {}
            Identity::Aptos => {}
            Identity::Cosmwasm { address } => {
                borsh::BorshSerialize::serialize(address, writer)?;
            }
        }
        Ok(())
    }
}
#[automatically_derived]
impl ::core::clone::Clone for Identity {
    #[inline]
    fn clone(&self) -> Identity {
        match self {
            Identity::Discord { username: __self_0 } => {
                Identity::Discord {
                    username: ::core::clone::Clone::clone(__self_0),
                }
            }
            Identity::Solana { pubkey: __self_0 } => {
                Identity::Solana {
                    pubkey: ::core::clone::Clone::clone(__self_0),
                }
            }
            Identity::Evm { pubkey: __self_0 } => {
                Identity::Evm {
                    pubkey: ::core::clone::Clone::clone(__self_0),
                }
            }
            Identity::Sui => Identity::Sui,
            Identity::Aptos => Identity::Aptos,
            Identity::Cosmwasm { address: __self_0 } => {
                Identity::Cosmwasm {
                    address: ::core::clone::Clone::clone(__self_0),
                }
            }
        }
    }
}
impl Identity {
    pub fn to_discriminant(&self) -> usize {
        match self {
            Identity::Discord { .. } => 0,
            Identity::Solana { .. } => 1,
            Identity::Evm { .. } => 2,
            Identity::Sui { .. } => 3,
            Identity::Aptos { .. } => 4,
            Identity::Cosmwasm { .. } => 5,
        }
    }
    pub const NUMBER_OF_VARIANTS: usize = 6;
}
pub enum IdentityCertificate {
    Discord { username: String },
    Evm { pubkey: EvmPubkey, verification_instruction_index: u8 },
    Solana,
    Sui,
    Aptos,
    Cosmwasm {
        chain_id: String,
        signature: Secp256k1Signature,
        recovery_id: u8,
        pubkey: CosmosPubkey,
        message: Vec<u8>,
    },
}
impl borsh::de::BorshDeserialize for IdentityCertificate
where
    String: borsh::BorshDeserialize,
    EvmPubkey: borsh::BorshDeserialize,
    u8: borsh::BorshDeserialize,
    String: borsh::BorshDeserialize,
    Secp256k1Signature: borsh::BorshDeserialize,
    u8: borsh::BorshDeserialize,
    CosmosPubkey: borsh::BorshDeserialize,
    Vec<u8>: borsh::BorshDeserialize,
{
    fn deserialize(
        buf: &mut &[u8],
    ) -> core::result::Result<Self, borsh::maybestd::io::Error> {
        let variant_idx: u8 = borsh::BorshDeserialize::deserialize(buf)?;
        let return_value = match variant_idx {
            0u8 => {
                IdentityCertificate::Discord {
                    username: borsh::BorshDeserialize::deserialize(buf)?,
                }
            }
            1u8 => {
                IdentityCertificate::Evm {
                    pubkey: borsh::BorshDeserialize::deserialize(buf)?,
                    verification_instruction_index: borsh::BorshDeserialize::deserialize(
                        buf,
                    )?,
                }
            }
            2u8 => IdentityCertificate::Solana,
            3u8 => IdentityCertificate::Sui,
            4u8 => IdentityCertificate::Aptos,
            5u8 => {
                IdentityCertificate::Cosmwasm {
                    chain_id: borsh::BorshDeserialize::deserialize(buf)?,
                    signature: borsh::BorshDeserialize::deserialize(buf)?,
                    recovery_id: borsh::BorshDeserialize::deserialize(buf)?,
                    pubkey: borsh::BorshDeserialize::deserialize(buf)?,
                    message: borsh::BorshDeserialize::deserialize(buf)?,
                }
            }
            _ => {
                let msg = {
                    let res = ::alloc::fmt::format(
                        ::core::fmt::Arguments::new_v1(
                            &["Unexpected variant index: "],
                            &[::core::fmt::ArgumentV1::new_debug(&variant_idx)],
                        ),
                    );
                    res
                };
                return Err(
                    borsh::maybestd::io::Error::new(
                        borsh::maybestd::io::ErrorKind::InvalidInput,
                        msg,
                    ),
                );
            }
        };
        Ok(return_value)
    }
}
impl borsh::ser::BorshSerialize for IdentityCertificate
where
    String: borsh::ser::BorshSerialize,
    EvmPubkey: borsh::ser::BorshSerialize,
    u8: borsh::ser::BorshSerialize,
    String: borsh::ser::BorshSerialize,
    Secp256k1Signature: borsh::ser::BorshSerialize,
    u8: borsh::ser::BorshSerialize,
    CosmosPubkey: borsh::ser::BorshSerialize,
    Vec<u8>: borsh::ser::BorshSerialize,
{
    fn serialize<W: borsh::maybestd::io::Write>(
        &self,
        writer: &mut W,
    ) -> core::result::Result<(), borsh::maybestd::io::Error> {
        let variant_idx: u8 = match self {
            IdentityCertificate::Discord { .. } => 0u8,
            IdentityCertificate::Evm { .. } => 1u8,
            IdentityCertificate::Solana => 2u8,
            IdentityCertificate::Sui => 3u8,
            IdentityCertificate::Aptos => 4u8,
            IdentityCertificate::Cosmwasm { .. } => 5u8,
        };
        writer.write_all(&variant_idx.to_le_bytes())?;
        match self {
            IdentityCertificate::Discord { username } => {
                borsh::BorshSerialize::serialize(username, writer)?;
            }
            IdentityCertificate::Evm { pubkey, verification_instruction_index } => {
                borsh::BorshSerialize::serialize(pubkey, writer)?;
                borsh::BorshSerialize::serialize(
                    verification_instruction_index,
                    writer,
                )?;
            }
            IdentityCertificate::Solana => {}
            IdentityCertificate::Sui => {}
            IdentityCertificate::Aptos => {}
            IdentityCertificate::Cosmwasm {
                chain_id,
                signature,
                recovery_id,
                pubkey,
                message,
            } => {
                borsh::BorshSerialize::serialize(chain_id, writer)?;
                borsh::BorshSerialize::serialize(signature, writer)?;
                borsh::BorshSerialize::serialize(recovery_id, writer)?;
                borsh::BorshSerialize::serialize(pubkey, writer)?;
                borsh::BorshSerialize::serialize(message, writer)?;
            }
        }
        Ok(())
    }
}
#[automatically_derived]
impl ::core::clone::Clone for IdentityCertificate {
    #[inline]
    fn clone(&self) -> IdentityCertificate {
        match self {
            IdentityCertificate::Discord { username: __self_0 } => {
                IdentityCertificate::Discord {
                    username: ::core::clone::Clone::clone(__self_0),
                }
            }
            IdentityCertificate::Evm {
                pubkey: __self_0,
                verification_instruction_index: __self_1,
            } => {
                IdentityCertificate::Evm {
                    pubkey: ::core::clone::Clone::clone(__self_0),
                    verification_instruction_index: ::core::clone::Clone::clone(__self_1),
                }
            }
            IdentityCertificate::Solana => IdentityCertificate::Solana,
            IdentityCertificate::Sui => IdentityCertificate::Sui,
            IdentityCertificate::Aptos => IdentityCertificate::Aptos,
            IdentityCertificate::Cosmwasm {
                chain_id: __self_0,
                signature: __self_1,
                recovery_id: __self_2,
                pubkey: __self_3,
                message: __self_4,
            } => {
                IdentityCertificate::Cosmwasm {
                    chain_id: ::core::clone::Clone::clone(__self_0),
                    signature: ::core::clone::Clone::clone(__self_1),
                    recovery_id: ::core::clone::Clone::clone(__self_2),
                    pubkey: ::core::clone::Clone::clone(__self_3),
                    message: ::core::clone::Clone::clone(__self_4),
                }
            }
        }
    }
}
pub struct ClaimCertificate {
    amount: u64,
    proof_of_identity: IdentityCertificate,
    proof_of_inclusion: MerklePath<SolanaHasher>,
}
impl borsh::de::BorshDeserialize for ClaimCertificate
where
    u64: borsh::BorshDeserialize,
    IdentityCertificate: borsh::BorshDeserialize,
    MerklePath<SolanaHasher>: borsh::BorshDeserialize,
{
    fn deserialize(
        buf: &mut &[u8],
    ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
        Ok(Self {
            amount: borsh::BorshDeserialize::deserialize(buf)?,
            proof_of_identity: borsh::BorshDeserialize::deserialize(buf)?,
            proof_of_inclusion: borsh::BorshDeserialize::deserialize(buf)?,
        })
    }
}
impl borsh::ser::BorshSerialize for ClaimCertificate
where
    u64: borsh::ser::BorshSerialize,
    IdentityCertificate: borsh::ser::BorshSerialize,
    MerklePath<SolanaHasher>: borsh::ser::BorshSerialize,
{
    fn serialize<W: borsh::maybestd::io::Write>(
        &self,
        writer: &mut W,
    ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
        borsh::BorshSerialize::serialize(&self.amount, writer)?;
        borsh::BorshSerialize::serialize(&self.proof_of_identity, writer)?;
        borsh::BorshSerialize::serialize(&self.proof_of_inclusion, writer)?;
        Ok(())
    }
}
#[automatically_derived]
impl ::core::clone::Clone for ClaimCertificate {
    #[inline]
    fn clone(&self) -> ClaimCertificate {
        ClaimCertificate {
            amount: ::core::clone::Clone::clone(&self.amount),
            proof_of_identity: ::core::clone::Clone::clone(&self.proof_of_identity),
            proof_of_inclusion: ::core::clone::Clone::clone(&self.proof_of_inclusion),
        }
    }
}
/**
 * A hasher that uses the solana pre-compiled keccak256 function.
 */
pub struct SolanaHasher {}
#[automatically_derived]
impl ::core::default::Default for SolanaHasher {
    #[inline]
    fn default() -> SolanaHasher {
        SolanaHasher {}
    }
}
#[automatically_derived]
impl ::core::fmt::Debug for SolanaHasher {
    fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
        ::core::fmt::Formatter::write_str(f, "SolanaHasher")
    }
}
#[automatically_derived]
impl ::core::clone::Clone for SolanaHasher {
    #[inline]
    fn clone(&self) -> SolanaHasher {
        SolanaHasher {}
    }
}
#[automatically_derived]
impl ::core::marker::StructuralPartialEq for SolanaHasher {}
#[automatically_derived]
impl ::core::cmp::PartialEq for SolanaHasher {
    #[inline]
    fn eq(&self, other: &SolanaHasher) -> bool {
        true
    }
}
impl Hasher for SolanaHasher {
    type Hash = [u8; 32];
    fn hashv(data: &[impl AsRef<[u8]>]) -> Self::Hash {
        hashv(&data.iter().map(|x| x.as_ref()).collect::<Vec<&[u8]>>()).to_bytes()
    }
}
pub struct Config {
    pub bump: u8,
    pub merkle_root: MerkleRoot<SolanaHasher>,
    pub dispenser_guard: Pubkey,
    pub mint: Pubkey,
    pub treasury: Pubkey,
}
#[automatically_derived]
impl ::core::marker::StructuralPartialEq for Config {}
#[automatically_derived]
impl ::core::cmp::PartialEq for Config {
    #[inline]
    fn eq(&self, other: &Config) -> bool {
        self.bump == other.bump && self.merkle_root == other.merkle_root
            && self.dispenser_guard == other.dispenser_guard && self.mint == other.mint
            && self.treasury == other.treasury
    }
}
#[automatically_derived]
impl ::core::fmt::Debug for Config {
    fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
        ::core::fmt::Formatter::debug_struct_field5_finish(
            f,
            "Config",
            "bump",
            &&self.bump,
            "merkle_root",
            &&self.merkle_root,
            "dispenser_guard",
            &&self.dispenser_guard,
            "mint",
            &&self.mint,
            "treasury",
            &&self.treasury,
        )
    }
}
impl borsh::ser::BorshSerialize for Config
where
    u8: borsh::ser::BorshSerialize,
    MerkleRoot<SolanaHasher>: borsh::ser::BorshSerialize,
    Pubkey: borsh::ser::BorshSerialize,
    Pubkey: borsh::ser::BorshSerialize,
    Pubkey: borsh::ser::BorshSerialize,
{
    fn serialize<W: borsh::maybestd::io::Write>(
        &self,
        writer: &mut W,
    ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
        borsh::BorshSerialize::serialize(&self.bump, writer)?;
        borsh::BorshSerialize::serialize(&self.merkle_root, writer)?;
        borsh::BorshSerialize::serialize(&self.dispenser_guard, writer)?;
        borsh::BorshSerialize::serialize(&self.mint, writer)?;
        borsh::BorshSerialize::serialize(&self.treasury, writer)?;
        Ok(())
    }
}
impl borsh::de::BorshDeserialize for Config
where
    u8: borsh::BorshDeserialize,
    MerkleRoot<SolanaHasher>: borsh::BorshDeserialize,
    Pubkey: borsh::BorshDeserialize,
    Pubkey: borsh::BorshDeserialize,
    Pubkey: borsh::BorshDeserialize,
{
    fn deserialize(
        buf: &mut &[u8],
    ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
        Ok(Self {
            bump: borsh::BorshDeserialize::deserialize(buf)?,
            merkle_root: borsh::BorshDeserialize::deserialize(buf)?,
            dispenser_guard: borsh::BorshDeserialize::deserialize(buf)?,
            mint: borsh::BorshDeserialize::deserialize(buf)?,
            treasury: borsh::BorshDeserialize::deserialize(buf)?,
        })
    }
}
#[automatically_derived]
impl ::core::clone::Clone for Config {
    #[inline]
    fn clone(&self) -> Config {
        Config {
            bump: ::core::clone::Clone::clone(&self.bump),
            merkle_root: ::core::clone::Clone::clone(&self.merkle_root),
            dispenser_guard: ::core::clone::Clone::clone(&self.dispenser_guard),
            mint: ::core::clone::Clone::clone(&self.mint),
            treasury: ::core::clone::Clone::clone(&self.treasury),
        }
    }
}
#[automatically_derived]
impl anchor_lang::AccountSerialize for Config {
    fn try_serialize<W: std::io::Write>(
        &self,
        writer: &mut W,
    ) -> anchor_lang::Result<()> {
        if writer.write_all(&[155, 12, 170, 224, 30, 250, 204, 130]).is_err() {
            return Err(anchor_lang::error::ErrorCode::AccountDidNotSerialize.into());
        }
        if AnchorSerialize::serialize(self, writer).is_err() {
            return Err(anchor_lang::error::ErrorCode::AccountDidNotSerialize.into());
        }
        Ok(())
    }
}
#[automatically_derived]
impl anchor_lang::AccountDeserialize for Config {
    fn try_deserialize(buf: &mut &[u8]) -> anchor_lang::Result<Self> {
        if buf.len() < [155, 12, 170, 224, 30, 250, 204, 130].len() {
            return Err(
                anchor_lang::error::ErrorCode::AccountDiscriminatorNotFound.into(),
            );
        }
        let given_disc = &buf[..8];
        if &[155, 12, 170, 224, 30, 250, 204, 130] != given_disc {
            return Err(
                anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                        error_name: anchor_lang::error::ErrorCode::AccountDiscriminatorMismatch
                            .name(),
                        error_code_number: anchor_lang::error::ErrorCode::AccountDiscriminatorMismatch
                            .into(),
                        error_msg: anchor_lang::error::ErrorCode::AccountDiscriminatorMismatch
                            .to_string(),
                        error_origin: Some(
                            anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                filename: "programs/token-dispenser/src/lib.rs",
                                line: 322u32,
                            }),
                        ),
                        compared_values: None,
                    })
                    .with_account_name("Config"),
            );
        }
        Self::try_deserialize_unchecked(buf)
    }
    fn try_deserialize_unchecked(buf: &mut &[u8]) -> anchor_lang::Result<Self> {
        let mut data: &[u8] = &buf[8..];
        AnchorDeserialize::deserialize(&mut data)
            .map_err(|_| anchor_lang::error::ErrorCode::AccountDidNotDeserialize.into())
    }
}
#[automatically_derived]
impl anchor_lang::Discriminator for Config {
    const DISCRIMINATOR: [u8; 8] = [155, 12, 170, 224, 30, 250, 204, 130];
}
#[automatically_derived]
impl anchor_lang::Owner for Config {
    fn owner() -> Pubkey {
        crate::ID
    }
}
impl Config {
    pub const LEN: usize = 8 + 1 + 32 + 32 + 32 + 32;
}
pub struct Receipt {}
impl borsh::ser::BorshSerialize for Receipt {
    fn serialize<W: borsh::maybestd::io::Write>(
        &self,
        writer: &mut W,
    ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
        Ok(())
    }
}
impl borsh::de::BorshDeserialize for Receipt {
    fn deserialize(
        buf: &mut &[u8],
    ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
        Ok(Self {})
    }
}
#[automatically_derived]
impl ::core::clone::Clone for Receipt {
    #[inline]
    fn clone(&self) -> Receipt {
        Receipt {}
    }
}
#[automatically_derived]
impl anchor_lang::AccountSerialize for Receipt {
    fn try_serialize<W: std::io::Write>(
        &self,
        writer: &mut W,
    ) -> anchor_lang::Result<()> {
        if writer.write_all(&[39, 154, 73, 106, 80, 102, 145, 153]).is_err() {
            return Err(anchor_lang::error::ErrorCode::AccountDidNotSerialize.into());
        }
        if AnchorSerialize::serialize(self, writer).is_err() {
            return Err(anchor_lang::error::ErrorCode::AccountDidNotSerialize.into());
        }
        Ok(())
    }
}
#[automatically_derived]
impl anchor_lang::AccountDeserialize for Receipt {
    fn try_deserialize(buf: &mut &[u8]) -> anchor_lang::Result<Self> {
        if buf.len() < [39, 154, 73, 106, 80, 102, 145, 153].len() {
            return Err(
                anchor_lang::error::ErrorCode::AccountDiscriminatorNotFound.into(),
            );
        }
        let given_disc = &buf[..8];
        if &[39, 154, 73, 106, 80, 102, 145, 153] != given_disc {
            return Err(
                anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                        error_name: anchor_lang::error::ErrorCode::AccountDiscriminatorMismatch
                            .name(),
                        error_code_number: anchor_lang::error::ErrorCode::AccountDiscriminatorMismatch
                            .into(),
                        error_msg: anchor_lang::error::ErrorCode::AccountDiscriminatorMismatch
                            .to_string(),
                        error_origin: Some(
                            anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                filename: "programs/token-dispenser/src/lib.rs",
                                line: 336u32,
                            }),
                        ),
                        compared_values: None,
                    })
                    .with_account_name("Receipt"),
            );
        }
        Self::try_deserialize_unchecked(buf)
    }
    fn try_deserialize_unchecked(buf: &mut &[u8]) -> anchor_lang::Result<Self> {
        let mut data: &[u8] = &buf[8..];
        AnchorDeserialize::deserialize(&mut data)
            .map_err(|_| anchor_lang::error::ErrorCode::AccountDidNotDeserialize.into())
    }
}
#[automatically_derived]
impl anchor_lang::Discriminator for Receipt {
    const DISCRIMINATOR: [u8; 8] = [39, 154, 73, 106, 80, 102, 145, 153];
}
#[automatically_derived]
impl anchor_lang::Owner for Receipt {
    fn owner() -> Pubkey {
        crate::ID
    }
}
pub struct Cart {
    pub amount: u64,
    pub set: ClaimedEcosystems,
}
impl borsh::ser::BorshSerialize for Cart
where
    u64: borsh::ser::BorshSerialize,
    ClaimedEcosystems: borsh::ser::BorshSerialize,
{
    fn serialize<W: borsh::maybestd::io::Write>(
        &self,
        writer: &mut W,
    ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
        borsh::BorshSerialize::serialize(&self.amount, writer)?;
        borsh::BorshSerialize::serialize(&self.set, writer)?;
        Ok(())
    }
}
impl borsh::de::BorshDeserialize for Cart
where
    u64: borsh::BorshDeserialize,
    ClaimedEcosystems: borsh::BorshDeserialize,
{
    fn deserialize(
        buf: &mut &[u8],
    ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
        Ok(Self {
            amount: borsh::BorshDeserialize::deserialize(buf)?,
            set: borsh::BorshDeserialize::deserialize(buf)?,
        })
    }
}
#[automatically_derived]
impl ::core::clone::Clone for Cart {
    #[inline]
    fn clone(&self) -> Cart {
        Cart {
            amount: ::core::clone::Clone::clone(&self.amount),
            set: ::core::clone::Clone::clone(&self.set),
        }
    }
}
#[automatically_derived]
impl anchor_lang::AccountSerialize for Cart {
    fn try_serialize<W: std::io::Write>(
        &self,
        writer: &mut W,
    ) -> anchor_lang::Result<()> {
        if writer.write_all(&[110, 9, 100, 44, 36, 143, 131, 88]).is_err() {
            return Err(anchor_lang::error::ErrorCode::AccountDidNotSerialize.into());
        }
        if AnchorSerialize::serialize(self, writer).is_err() {
            return Err(anchor_lang::error::ErrorCode::AccountDidNotSerialize.into());
        }
        Ok(())
    }
}
#[automatically_derived]
impl anchor_lang::AccountDeserialize for Cart {
    fn try_deserialize(buf: &mut &[u8]) -> anchor_lang::Result<Self> {
        if buf.len() < [110, 9, 100, 44, 36, 143, 131, 88].len() {
            return Err(
                anchor_lang::error::ErrorCode::AccountDiscriminatorNotFound.into(),
            );
        }
        let given_disc = &buf[..8];
        if &[110, 9, 100, 44, 36, 143, 131, 88] != given_disc {
            return Err(
                anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                        error_name: anchor_lang::error::ErrorCode::AccountDiscriminatorMismatch
                            .name(),
                        error_code_number: anchor_lang::error::ErrorCode::AccountDiscriminatorMismatch
                            .into(),
                        error_msg: anchor_lang::error::ErrorCode::AccountDiscriminatorMismatch
                            .to_string(),
                        error_origin: Some(
                            anchor_lang::error::ErrorOrigin::Source(anchor_lang::error::Source {
                                filename: "programs/token-dispenser/src/lib.rs",
                                line: 339u32,
                            }),
                        ),
                        compared_values: None,
                    })
                    .with_account_name("Cart"),
            );
        }
        Self::try_deserialize_unchecked(buf)
    }
    fn try_deserialize_unchecked(buf: &mut &[u8]) -> anchor_lang::Result<Self> {
        let mut data: &[u8] = &buf[8..];
        AnchorDeserialize::deserialize(&mut data)
            .map_err(|_| anchor_lang::error::ErrorCode::AccountDidNotDeserialize.into())
    }
}
#[automatically_derived]
impl anchor_lang::Discriminator for Cart {
    const DISCRIMINATOR: [u8; 8] = [110, 9, 100, 44, 36, 143, 131, 88];
}
#[automatically_derived]
impl anchor_lang::Owner for Cart {
    fn owner() -> Pubkey {
        crate::ID
    }
}
impl Cart {
    pub const LEN: usize = 8 + 8 + Identity::NUMBER_OF_VARIANTS;
}
pub struct ClaimedEcosystems {
    set: [bool; 6],
}
impl borsh::de::BorshDeserialize for ClaimedEcosystems
where
    [bool; 6]: borsh::BorshDeserialize,
{
    fn deserialize(
        buf: &mut &[u8],
    ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
        Ok(Self {
            set: borsh::BorshDeserialize::deserialize(buf)?,
        })
    }
}
impl borsh::ser::BorshSerialize for ClaimedEcosystems
where
    [bool; 6]: borsh::ser::BorshSerialize,
{
    fn serialize<W: borsh::maybestd::io::Write>(
        &self,
        writer: &mut W,
    ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
        borsh::BorshSerialize::serialize(&self.set, writer)?;
        Ok(())
    }
}
#[automatically_derived]
impl ::core::clone::Clone for ClaimedEcosystems {
    #[inline]
    fn clone(&self) -> ClaimedEcosystems {
        ClaimedEcosystems {
            set: ::core::clone::Clone::clone(&self.set),
        }
    }
}
impl ClaimedEcosystems {
    pub fn new() -> Self {
        ClaimedEcosystems {
            set: [false; Identity::NUMBER_OF_VARIANTS],
        }
    }
    pub fn insert(&mut self, item: &Identity) {
        let index = item.to_discriminant();
        self.set[index] = true;
    }
    pub fn contains(&self, item: &Identity) -> bool {
        self.set[item.to_discriminant()]
    }
}
#[repr(u32)]
pub enum ErrorCode {
    ArithmeticOverflow,
    MoreThanOneIdentityPerEcosystem,
    AlreadyClaimed,
    InvalidInclusionProof,
    WrongPda,
    NotImplemented,
    InsufficientTreasuryFunds,
    SignatureVerificationWrongProgram,
    SignatureVerificationWrongAccounts,
    SignatureVerificationWrongHeader,
    SignatureVerificationWrongMessage,
    SignatureVerificationWrongMessageMetadata,
    SignatureVerificationWrongSigner,
    SignatureVerificationWrongClaimant,
}
#[automatically_derived]
impl ::core::fmt::Debug for ErrorCode {
    fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
        match self {
            ErrorCode::ArithmeticOverflow => {
                ::core::fmt::Formatter::write_str(f, "ArithmeticOverflow")
            }
            ErrorCode::MoreThanOneIdentityPerEcosystem => {
                ::core::fmt::Formatter::write_str(f, "MoreThanOneIdentityPerEcosystem")
            }
            ErrorCode::AlreadyClaimed => {
                ::core::fmt::Formatter::write_str(f, "AlreadyClaimed")
            }
            ErrorCode::InvalidInclusionProof => {
                ::core::fmt::Formatter::write_str(f, "InvalidInclusionProof")
            }
            ErrorCode::WrongPda => ::core::fmt::Formatter::write_str(f, "WrongPda"),
            ErrorCode::NotImplemented => {
                ::core::fmt::Formatter::write_str(f, "NotImplemented")
            }
            ErrorCode::InsufficientTreasuryFunds => {
                ::core::fmt::Formatter::write_str(f, "InsufficientTreasuryFunds")
            }
            ErrorCode::SignatureVerificationWrongProgram => {
                ::core::fmt::Formatter::write_str(f, "SignatureVerificationWrongProgram")
            }
            ErrorCode::SignatureVerificationWrongAccounts => {
                ::core::fmt::Formatter::write_str(
                    f,
                    "SignatureVerificationWrongAccounts",
                )
            }
            ErrorCode::SignatureVerificationWrongHeader => {
                ::core::fmt::Formatter::write_str(f, "SignatureVerificationWrongHeader")
            }
            ErrorCode::SignatureVerificationWrongMessage => {
                ::core::fmt::Formatter::write_str(f, "SignatureVerificationWrongMessage")
            }
            ErrorCode::SignatureVerificationWrongMessageMetadata => {
                ::core::fmt::Formatter::write_str(
                    f,
                    "SignatureVerificationWrongMessageMetadata",
                )
            }
            ErrorCode::SignatureVerificationWrongSigner => {
                ::core::fmt::Formatter::write_str(f, "SignatureVerificationWrongSigner")
            }
            ErrorCode::SignatureVerificationWrongClaimant => {
                ::core::fmt::Formatter::write_str(
                    f,
                    "SignatureVerificationWrongClaimant",
                )
            }
        }
    }
}
#[automatically_derived]
impl ::core::clone::Clone for ErrorCode {
    #[inline]
    fn clone(&self) -> ErrorCode {
        *self
    }
}
#[automatically_derived]
impl ::core::marker::Copy for ErrorCode {}
impl ErrorCode {
    /// Gets the name of this [#enum_name].
    pub fn name(&self) -> String {
        match self {
            ErrorCode::ArithmeticOverflow => "ArithmeticOverflow".to_string(),
            ErrorCode::MoreThanOneIdentityPerEcosystem => {
                "MoreThanOneIdentityPerEcosystem".to_string()
            }
            ErrorCode::AlreadyClaimed => "AlreadyClaimed".to_string(),
            ErrorCode::InvalidInclusionProof => "InvalidInclusionProof".to_string(),
            ErrorCode::WrongPda => "WrongPda".to_string(),
            ErrorCode::NotImplemented => "NotImplemented".to_string(),
            ErrorCode::InsufficientTreasuryFunds => {
                "InsufficientTreasuryFunds".to_string()
            }
            ErrorCode::SignatureVerificationWrongProgram => {
                "SignatureVerificationWrongProgram".to_string()
            }
            ErrorCode::SignatureVerificationWrongAccounts => {
                "SignatureVerificationWrongAccounts".to_string()
            }
            ErrorCode::SignatureVerificationWrongHeader => {
                "SignatureVerificationWrongHeader".to_string()
            }
            ErrorCode::SignatureVerificationWrongMessage => {
                "SignatureVerificationWrongMessage".to_string()
            }
            ErrorCode::SignatureVerificationWrongMessageMetadata => {
                "SignatureVerificationWrongMessageMetadata".to_string()
            }
            ErrorCode::SignatureVerificationWrongSigner => {
                "SignatureVerificationWrongSigner".to_string()
            }
            ErrorCode::SignatureVerificationWrongClaimant => {
                "SignatureVerificationWrongClaimant".to_string()
            }
        }
    }
}
impl From<ErrorCode> for u32 {
    fn from(e: ErrorCode) -> u32 {
        e as u32 + anchor_lang::error::ERROR_CODE_OFFSET
    }
}
impl From<ErrorCode> for anchor_lang::error::Error {
    fn from(error_code: ErrorCode) -> anchor_lang::error::Error {
        anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
            error_name: error_code.name(),
            error_code_number: error_code.into(),
            error_msg: error_code.to_string(),
            error_origin: None,
            compared_values: None,
        })
    }
}
impl std::fmt::Display for ErrorCode {
    fn fmt(
        &self,
        fmt: &mut std::fmt::Formatter<'_>,
    ) -> std::result::Result<(), std::fmt::Error> {
        match self {
            ErrorCode::ArithmeticOverflow => <Self as std::fmt::Debug>::fmt(self, fmt),
            ErrorCode::MoreThanOneIdentityPerEcosystem => {
                <Self as std::fmt::Debug>::fmt(self, fmt)
            }
            ErrorCode::AlreadyClaimed => <Self as std::fmt::Debug>::fmt(self, fmt),
            ErrorCode::InvalidInclusionProof => <Self as std::fmt::Debug>::fmt(self, fmt),
            ErrorCode::WrongPda => <Self as std::fmt::Debug>::fmt(self, fmt),
            ErrorCode::NotImplemented => <Self as std::fmt::Debug>::fmt(self, fmt),
            ErrorCode::InsufficientTreasuryFunds => {
                <Self as std::fmt::Debug>::fmt(self, fmt)
            }
            ErrorCode::SignatureVerificationWrongProgram => {
                <Self as std::fmt::Debug>::fmt(self, fmt)
            }
            ErrorCode::SignatureVerificationWrongAccounts => {
                <Self as std::fmt::Debug>::fmt(self, fmt)
            }
            ErrorCode::SignatureVerificationWrongHeader => {
                <Self as std::fmt::Debug>::fmt(self, fmt)
            }
            ErrorCode::SignatureVerificationWrongMessage => {
                <Self as std::fmt::Debug>::fmt(self, fmt)
            }
            ErrorCode::SignatureVerificationWrongMessageMetadata => {
                <Self as std::fmt::Debug>::fmt(self, fmt)
            }
            ErrorCode::SignatureVerificationWrongSigner => {
                <Self as std::fmt::Debug>::fmt(self, fmt)
            }
            ErrorCode::SignatureVerificationWrongClaimant => {
                <Self as std::fmt::Debug>::fmt(self, fmt)
            }
        }
    }
}
pub fn check_claim_receipt_is_unitialized(
    claim_receipt_account: &AccountInfo,
) -> Result<()> {
    if claim_receipt_account.owner.eq(&crate::id()) {
        return Err(ErrorCode::AlreadyClaimed.into());
    }
    Ok(())
}
/**
 * Checks that a proof of identity is valid and returns the underlying identity.
 * For some ecosystem like EVM we use a signature verification program,
 * for others like cosmos the signature is included in the ClaimCertificate.
 */
impl IdentityCertificate {
    pub fn checked_into_identity(
        &self,
        sysvar_instruction: &AccountInfo,
        claimant: &Pubkey,
    ) -> Result<Identity> {
        match self {
            IdentityCertificate::Discord { username } => {
                Ok(Identity::Discord {
                    username: username.to_string(),
                })
            }
            IdentityCertificate::Evm { pubkey, verification_instruction_index } => {
                let signature_verification_instruction = load_instruction_at_checked(
                    *verification_instruction_index as usize,
                    sysvar_instruction,
                )?;
                check_message(
                    EvmPrefixedMessage::parse(
                            &Secp256k1InstructionData::from_instruction_and_check_signer(
                                &signature_verification_instruction,
                                pubkey,
                                &verification_instruction_index,
                            )?,
                        )?
                        .get_payload(),
                    claimant,
                )?;
                Ok(Identity::Evm { pubkey: *pubkey })
            }
            IdentityCertificate::Cosmwasm {
                pubkey,
                chain_id,
                signature,
                recovery_id,
                message,
            } => {
                secp256k1_sha256_verify_signer(signature, recovery_id, pubkey, message)?;
                check_message(CosmosMessage::parse(message)?.get_payload(), claimant)?;
                let cosmos_bech32 = pubkey.into_bech32(chain_id);
                Ok(Identity::Cosmwasm {
                    address: cosmos_bech32,
                })
            }
            _ => Err(ErrorCode::NotImplemented.into()),
        }
    }
}
/**
 * Check that the identity of the claim_info has authorized the claimant by signing a message.
 */
impl ClaimCertificate {
    pub fn checked_into_claim_info(
        &self,
        sysvar_instruction: &AccountInfo,
        claimant: &Pubkey,
    ) -> Result<ClaimInfo> {
        Ok(ClaimInfo {
            identity: self
                .proof_of_identity
                .checked_into_identity(sysvar_instruction, claimant)?,
            amount: self.amount,
        })
    }
}
/**
 * Creates a claim receipt for the claimant. This is an account that contains no data. Each leaf
 * is associated with a unique claim receipt account. Since the number of claim receipt accounts
 * to be passed to the program is dynamic and equal to the size of `claim_certificates`, it is
 * awkward to declare them in the anchor context. Instead, we pass them inside
 * remaining_accounts. If the account is initialized, the assign instruction will fail.
 */
pub fn checked_create_claim_receipt(
    index: usize,
    leaf: &[u8],
    payer: &Pubkey,
    remaining_accounts: &[AccountInfo],
) -> Result<()> {
    let (receipt_pubkey, bump) = get_receipt_pda(leaf);
    let claim_receipt_account = &remaining_accounts[index];
    if !claim_receipt_account.key.eq(&receipt_pubkey) {
        return Err(ErrorCode::WrongPda.into());
    }
    check_claim_receipt_is_unitialized(claim_receipt_account)?;
    let transfer_instruction = system_instruction::transfer(
        payer,
        &claim_receipt_account.key(),
        Rent::get()?.minimum_balance(0),
    );
    invoke(&transfer_instruction, remaining_accounts)?;
    let assign_instruction = system_instruction::assign(
        &claim_receipt_account.key(),
        &crate::id(),
    );
    invoke_signed(
            &assign_instruction,
            remaining_accounts,
            &[&[RECEIPT_SEED, &MerkleTree::<SolanaHasher>::hash_leaf(leaf), &[bump]]],
        )
        .map_err(|_| ErrorCode::AlreadyClaimed)?;
    Ok(())
}
pub fn get_config_pda() -> (Pubkey, u8) {
    Pubkey::find_program_address(&[CONFIG_SEED], &crate::id())
}
pub fn get_receipt_pda(leaf: &[u8]) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[RECEIPT_SEED, &MerkleTree::<SolanaHasher>::hash_leaf(leaf)],
        &crate::id(),
    )
}
pub fn get_cart_pda(claimant: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[CART_SEED, claimant.as_ref()], &crate::id())
}
impl crate::accounts::Initialize {
    pub fn populate(payer: Pubkey, mint: Pubkey, treasury: Pubkey) -> Self {
        crate::accounts::Initialize {
            payer,
            config: get_config_pda().0,
            mint,
            treasury,
            system_program: system_program::System::id(),
        }
    }
}
impl crate::accounts::Claim {
    pub fn populate(claimant: Pubkey, dispenser_guard: Pubkey) -> Self {
        crate::accounts::Claim {
            claimant,
            dispenser_guard,
            config: get_config_pda().0,
            cart: get_cart_pda(&claimant).0,
            system_program: system_program::System::id(),
            sysvar_instruction: SYSVAR_IX_ID,
        }
    }
}
impl crate::accounts::Checkout {
    pub fn populate(
        claimant: Pubkey,
        mint: Pubkey,
        treasury: Pubkey,
        cart_override: Option<Pubkey>,
        claimant_fund_override: Option<Pubkey>,
    ) -> Self {
        let config = get_config_pda().0;
        crate::accounts::Checkout {
            claimant,
            config,
            mint,
            treasury,
            cart: cart_override.unwrap_or_else(|| get_cart_pda(&claimant).0),
            claimant_fund: claimant_fund_override
                .unwrap_or_else(|| get_associated_token_address(&claimant, &mint)),
            system_program: system_program::System::id(),
            token_program: Token::id(),
            associated_token_program: AssociatedToken::id(),
        }
    }
}
