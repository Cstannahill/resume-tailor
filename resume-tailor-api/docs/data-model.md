# Data model

PostgreSQL via Prisma (`prisma/schema.prisma`). IDs are UUID strings unless noted.

## Core entities

```text
User
  ├── UserCredential      (passwordHash, 1:1)
  ├── UserSetting         (defaultLlmProvider, notificationPrefs)
  ├── UserProviderKey     (unique userId+provider, encryptedKey)
  ├── Resume              → ResumeTechnology → Technology
  ├── Project?            (ownerId SetNull on user delete)
  ├── ConversationSession → ConversationResponse
  ├── TailoredAsset       (optional resumeId)
  └── Insight             → InsightTechnology → Technology

Project
  ├── ProjectArtifact     (kind: source_file | heuristic | summary)
  └── ProjectTechnology   → Technology
```

## Notable columns

| Model | Field | Meaning |
| --- | --- | --- |
| `Project` | `technologies String[]` | Language names from file extensions, duplicated onto join rows |
| `Project` | `repoUrl` / `localPath` | Global upsert keys (not per owner) |
| `Project` | `ownerId` | Nullable; public GET if null |
| `Resume` | `experience` / `education` / `contact` | JSON |
| `ConversationSession` | `currentQuestion` | Null means the session is complete |
| `ConversationSession` | `insights` | JSON; overwritten after each answer |
| `Insight` | `source` / `layer` | `layer` is `raw \| derived \| curated` |
| `TailoredAsset` | `assetType` | `resume \| cover_letter \| summary` |
| `TailoredAsset` | `projectIds` | `String[]` of ids used at generation time (not a relation) |

## Cascades

Deleting a `User` cascades credentials, settings, keys, resumes, sessions, assets, and insights. `Project.ownerId` is **SetNull** — indexed repos remain and become public on `GET /projects/:id`.

`Technology.name` is unique and **case-sensitive**.

## Migrations

Single init migration: `prisma/migrations/20251117060259_init_db`. Local: `npx prisma generate` then `npx prisma migrate dev`. Deploy: `npm run prisma:deploy`.

Prisma logs `query` in `NODE_ENV=development` (`src/db/client.ts`).
