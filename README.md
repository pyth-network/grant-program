# grant-program

Launch a community grant program that allows users to claim tokens by verifying their identity across multiple ecosystems.

## Local Development

The grant program has three components: 
* The `token_dispenser` solana program that verifies identities, checks claim amounts and transfers tokens
* A backend API and database that retrieves claims (and proofs thereof)
* A web frontend

For local development, you will need to start up all three components.

### Configuration

Copy `frontend/.env.sample` to `frontend/.env`. TODO: will need edits for the solana validator part 

### Token Dispenser

TODO: start solana validator with the anchor program


### Backend API

The database is a postgres database. You can start the database by running

```
docker run  -e POSTGRES_PASSWORD="password" -p 5432:5432 -e POSTGRES_USER=postgresUser postgres
```


URLs show up here

http://localhost:3001/api/grant/v1/amount

## Token Dispenser

Run unit tests:
```cargo test-bpf```



TODO: do the anchor tests do anything or can we delete tests/token-dispenser.ts


