The claim codebase relies on a database to store :

- The amounts that each claimant is entitled to (`amounts` table)
- The authentication status of claimants (`authentications` table)

To develop locally, first spin up a local database using :

```
docker run  -e POSTGRES_PASSWORD="password" -p 5432:5432 -e POSTGRES_USER=postgresUser postgres
```

Second, update `DATABASE_URL` in `.env` with the database url (you can copy it from `.env.sample`)
Next migrate the database to the latest version with :

```
npx node-pg-migrate up
```
