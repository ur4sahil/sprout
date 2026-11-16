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
