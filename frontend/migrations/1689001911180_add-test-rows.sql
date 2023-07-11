-- Up Migration
INSERT INTO public.amounts (ecosystem, identity, amount, claimant)
VALUES ('solana'::ecosystem_type, '3kzAHeiucNConBwKQVHyLcG3soaMzSZkvs4y14fmMgKL', 1000, null);

INSERT INTO public.amounts (ecosystem, identity, amount, claimant)
VALUES ('evm'::ecosystem_type, '0xf3f9225A2166861e745742509CED164183a626d7', 2000, null);

INSERT INTO public.amounts (ecosystem, identity, amount, claimant)
VALUES ('aptos'::ecosystem_type, '0x7e7544df4fc42107d4a60834685dfd9c1e6ff048f49fe477bc19c1551299d5cb', 3000, null);

INSERT INTO public.amounts (ecosystem, identity, amount, claimant)
VALUES ('cosmwasm'::ecosystem_type, 'cosmos1lv3rrn5trdea7vs43z5m4y34d5r3zxp484wcpu', 4000, null);

-- Down Migration
