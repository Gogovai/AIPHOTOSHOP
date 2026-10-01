# Assets

Repository-static assets: the brand mark, iconography sources, and any file that
ships with the application itself rather than being uploaded by a user.

## What belongs here

- Application branding: logos, marks, favicon sources.
- Static imagery used by the product surface.
- Source files for generated assets, when they are worth keeping.

## What does not

- User-uploaded or user-generated design assets. Those are document data and are
  handled by the persistence layer in a later milestone.
- Large binary blobs that belong in object storage.
- Anything produced by a build step. Build output is never committed.

## Current state

Empty. Milestone 001 ships a restrained product surface that needs no imagery —
no stock photography, no decorative illustrations, no generic AI artwork. Assets
are added only when the design calls for them.

Keep files small and purposeful. When an asset is replaced, delete the old one
in the same change.
