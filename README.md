# Creating Migrations

Whenever you edit `schema.prisma` you MUST run `pnpm create-migration <name of migration>` from root. This will apply the migration to the remote dev database. When you deploy to Railway, `migrate deploy` will be run as part of the deploy script, which will then apply the migration to the production db.

hi