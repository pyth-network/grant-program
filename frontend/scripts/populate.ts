import { loadTestWallets } from '../claim_sdk/testWallets'
import {
  addTestWalletsToDatabase,
  clearDatabase,
  getDatabasePool,
} from '../utils/db'

const pool = getDatabasePool()

async function main() {
  await clearDatabase(pool)
  await addTestWalletsToDatabase(pool, await loadTestWallets())
}

main()
