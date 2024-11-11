import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';

import * as schema from '@/lib/pg/schema';
// let pg: ReturnType<typeof drizzle>;

const pg = drizzle(process.env.DATABASE_URL!, {
  schema: schema,
});


export { pg };
