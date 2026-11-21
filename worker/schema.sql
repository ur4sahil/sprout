-- Sprout sign-in tables (plan section 4). Safe to run more than once.
create table if not exists users (
  email      text primary key,        -- lower case
  pw_hash    text not null,
  pw_salt    text not null,
  created_at text not null,
  updated_at text not null
);

create table if not exists sessions (
  token_hash text primary key,        -- SHA-256 of the cookie value
  email      text not null,
  created_at text not null,
  expires_at text not null
);
create index if not exists sessions_email on sessions (email);

create table if not exists email_codes (
  email      text primary key,        -- one live code per address
  code_hash  text not null,
  sent_at    text not null,
  expires_at text not null,
  tries      integer not null default 0
);

create table if not exists login_attempts (
  email        text primary key,
  window_start text not null,
  count        integer not null
);

-- The family's records: children, scores, answers, stickers, plans and check-in results.
-- One row for each record. `value` is the record as JSON, exactly as the app sent it.
-- Every listed parent shares one family. Only the local test server keeps accounts apart.
create table if not exists records (
  family     text not null,
  store      text not null,           -- which kind of record, such as 'children' or 'attempts'
  key        text not null,           -- its id within that kind
  value      text not null,
  updated_at text not null,
  primary key (family, store, key)
);

-- Invites (Nov 21, 2026): a parent of the first family makes a one-time link; another family's parent
-- uses it to make an account, and gets a family of their own.
create table if not exists invites (
  token_hash text primary key,        -- SHA-256 of the token in the link
  created_by text not null,
  created_at text not null,
  expires_at text not null,
  used_at    text                     -- null until a parent joins with it
);

create table if not exists family_members (
  email     text primary key,         -- lower case; a parent who joined through an invite
  family    text not null,            -- their own family, never the first one
  joined_at text not null
);

