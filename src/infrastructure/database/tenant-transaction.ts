import type { Pool, PoolClient } from "pg";

export async function withPostgresTenant<T>(
  pool: Pool,
  organizationId: string,
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("select set_config('vigie.organization_id', $1, true)", [organizationId]);
    const result = await operation(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
