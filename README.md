# grant-program

Launch a community grant program that allows users to claim tokens by verifying their identity across multiple ecosystems.

## Local Development

The grant program has two components: 
* The `token_dispenser` solana program that verifies identities, checks claim amounts and transfers tokens.
  The on-chain program uses a merkle tree to verify claim membership.
* A web frontend for verifying identities, retrieving claim proofs, and submitting claim transactions. 
  The frontend connects to a postgres database to retrieve merkle proofs for claims that can be verified on-chain.   

### Configuration

Copy `frontend/.env.sample` to `frontend/.env` and edit the configuration variables therein.

### Token Dispenser

TODO: how to start solana validator with the anchor program?

### Web Frontend

The frontend depends on a postgres database for storing claims.
The easiest way to set up this database is to start an instance of the `postgres` docker container:

```
docker run  -e POSTGRES_PASSWORD="password" -p 5432:5432 -e POSTGRES_USER=postgresUser postgres
```

This command will start a postgres instance on localhost:5432.
You can then run the following command to populate the database schema: 

```
npm run migrate
```

See [DATABASE.md](frontend/DATABASE.md) for more information on how to work with the postgres database.

Next, install dependencies for the frontend. From the `frontend/` directory, run: 

```bash
npm install
```

Finally, start the frontend by running:

```
npm run dev
```

Navigate your browser to `http://localhost:3000` to see the frontend.
The frontend also uses vercel edge functions for its backend API.
The code for this API lives in the `frontend/pages/api` directory. 
The functions in that directory are available under the URL `http://localhost:3000/api/`, e.g.,
`http://localhost:3000/api/grant/v1/amount`.

## Unit tests

You can run the unit tests for the `token_dispenser` program via:

```bash
cd token_dispenser
cargo test-bpf
```

And the unit tests for the frontend via:

```bash
cd frontend 
npm run test
```

TODO: do the anchor tests do anything or can we delete tests/token-dispenser.ts
