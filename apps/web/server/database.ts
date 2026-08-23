import postgres, { type Sql } from "postgres";

let client: Sql | null | undefined;
let schemaReady: Promise<void> | undefined;

export function database(): Sql | null {
  if (client !== undefined) return client;
  const url = process.env.DATABASE_URL?.trim();
  client = url ? postgres(url, { max: 3, idle_timeout: 20, connect_timeout: 10 }) : null;
  return client;
}

export async function ensureObservabilitySchema(sql: Sql): Promise<void> {
  schemaReady ??= createSchema(sql).catch((error) => {
    schemaReady = undefined;
    throw error;
  });
  return schemaReady;
}

async function createSchema(sql: Sql): Promise<void> {
  await sql`
    create table if not exists funnel_events (
      id bigint generated always as identity primary key,
      event text not null,
      viewport text not null,
      created_at timestamptz not null default now()
    )
  `;
  await sql`create index if not exists funnel_events_created_at_idx on funnel_events (created_at)`;
  await sql`
    create table if not exists feedback_entries (
      id bigint generated always as identity primary key,
      rating smallint not null check (rating between 1 and 5),
      device text not null,
      moment text not null,
      comment text not null,
      created_at timestamptz not null default now()
    )
  `;
  await sql`create index if not exists feedback_entries_created_at_idx on feedback_entries (created_at)`;
  await sql`
    create table if not exists client_errors (
      id bigint generated always as identity primary key,
      category text not null,
      route text not null,
      created_at timestamptz not null default now()
    )
  `;
  await sql`create index if not exists client_errors_created_at_idx on client_errors (created_at)`;
}
