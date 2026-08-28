# flomo-web-cli

`flomo-web-cli` provides local command-line access to a user's flomo memos through their flomo Web session.

## Language

**User Configuration**:
The user's persisted CLI settings, which may include credentials and form one input to the effective runtime configuration.
_Avoid_: Runtime configuration, environment configuration

**Memo Cache**:
A local snapshot of memos produced by synchronization and used for all-memo queries or cache-only reads. It is neither a backup nor an authoritative data source.
_Avoid_: Backup, source of truth
