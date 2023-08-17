# grant-program

Launch a community grant program that allows users to claim tokens by verifying their identity across multiple ecosystems.

## Local Development

The grant program has two components:

- The `token_dispenser` solana program that verifies identities, checks claim amounts and transfers tokens.
  The on-chain program uses a merkle tree to verify claim membership.
- A web frontend for verifying identities, retrieving claim proofs, and submitting claim transactions.
  The frontend connects to a postgres database to retrieve merkle proofs for claims that can be verified on-chain.

### Configuration

Copy `frontend/.env.sample` to `frontend/.env` and edit the configuration variables therein.

### Dependencies

First, install both the [Solana CLI tools](https://docs.solana.com/cli/install-solana-cli-tools) and [Anchor](https://www.anchor-lang.com/docs/installation). We recommend `v1.14.20` for Solana and `v0.27.0` for Anchor.
Next, start a solana test validator.

Install [Docker](https://docs.docker.com/engine/install/).

### Web Frontend

The frontend depends on a postgres database for storing claims and on an instance of Solana to send on-chain transactions.
Here is how to run a local postgres database and a solana test validator for development.

Install dependencies for the frontend. From the `frontend/` directory, run:

```bash
npm install
```

Start a Docker Desktop.

From the `frontend/` directory run:

```
./scripts/setup.sh --dev
```

This command starts both a postgres container and a solana test validator. It also deploys the program and populates the database with the keys stored in `frontend/integration/keys/`.

On a different terminal tab, run :

```
npm run dev
```

Navigate your browser to `http://localhost:3000` to see the frontend.
The frontend also uses vercel edge functions for its backend API.
The code for this API lives in the `frontend/pages/api` directory.
The functions in that directory are available under the URL `http://localhost:3000/api/`, e.g.,
`http://localhost:3000/api/grant/v1/amount`.
You can import the wallets from `frontend/integration/keys/` into your browser wallets to be able to claim tokens in the test environment.

## Unit tests

You can run the unit tests for the `token_dispenser` program as follows:

```bash
cd token_dispenser
cargo test-bpf
```

The unit tests for the frontend require starting the database and migrating it (per the directions above).
A script has been provided to handle starting the database, migrating it as well as starting a solana-test-validator
and deploying the token-dispenser program

```bash
cd frontend
./scripts/setup.sh --dev
```

Then in a separate terminal run:

```bash
cd frontend
npm run test
```

## Integration tests

From the `frontend/` directory run :

```
./scripts/setup.sh --test
```
