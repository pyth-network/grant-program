The claim codebase relies on a database to store :

- The amounts that each claimant is entitled to (`amounts` table)
- The authentication status of claimants (`authentications` table)

To develop locally, first spin up a local database using :

```
docker run  -e POSTGRES_PASSWORD="password" -p 5432:5432 -e POSTGRES_USER=postgresUser postgres
```

Second, update the `PG*` variables in `.env` with the relevant values (the defaults in `.env.sample` are set for local development)
Next migrate the database to the latest version with:

```
npm run migrate
```

To reset the database, just shut down the container and create a new one.

### Create a new migration

```
npx node-pg-migrate create -j {sql|ts} name of migration
```

This will create a file in `migrations/` prefixed by the timestamp. Then, you can fill out the up migration section manually.
