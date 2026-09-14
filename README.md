# PeoplesHR Platform site

A public read-only website for the platform strategy and the product roadmap,
a private editor that publishes to it, and a one-click sync from the
monday.com roadmap board.

```
content.json   the single source of truth. Everything on both tabs.
index.html     the public site. Read-only. Loads content.json.
editor.html    your editor. Same page plus editing, Sync and Publish.
app.js         shared rendering and interaction.
edit.js        publishing and monday.com sync. Loaded by editor.html only.
styles.css     shared styles.
api/sync.js    server-side reader for the monday.com board.
vercel.json    caching, clean URLs, function timeout.
_headers       the same caching rules for hosts that read this file instead.
```

## How it works

`index.html` fetches `content.json` and renders it. It has no editing code
path that can reach a server, and it never loads `edit.js`.

`editor.html` sets one flag before loading the same `app.js`, which turns on
the pencils, the **Add capability** buttons and the capability form. Your edits
are written to this browser's `localStorage` as a private draft. Nothing
changes on the public site until you press **Publish**.

**Publish** writes `content.json` back to the GitHub repository through the
GitHub API. Vercel sees the commit and redeploys, normally within a minute.

**Sync from monday.com** calls this site's own `/api/sync`, which reads the 2H
2026 board on the server and returns what it finds. The result is merged into
your draft, not published, so you always see what changed before it goes out.

## One-time setup

### 1. The repository

A GitHub repository, for example `peopleshr-platform`, with these files in the
root of the default branch. It can be private.

### 2. Vercel

1. Vercel dashboard, **Add New**, **Project**, import the repository.
2. Framework preset: **Other**. No build command. Output directory: leave empty.
3. Deploy. You get a `*.vercel.app` URL straight away.
4. For a proper address, **Settings**, **Domains**, and add something like
   `roadmap.peopleshr.com`. That needs a CNAME from whoever runs the
   peopleshr.com DNS.

### 3. A token for publishing

1. GitHub, **Settings**, **Developer settings**,
   **Personal access tokens**, **Fine-grained tokens**, **Generate new token**.
2. Repository access: **Only select repositories**, and choose this one.
3. Permissions: **Repository permissions**, **Contents**, **Read and write**.
   Nothing else.
4. Set an expiry you are comfortable with, generate it, and copy it once.

Then open `editor.html` on the deployed site, press **Connect repository**,
fill in owner, repository, branch and the token, **Test connection**, **Save**.

### 4. Syncing from monday.com

The monday.com API does not answer requests made straight from a browser, and
a monday token is worth more than this site is, so the board is read by a small
server-side function instead. The token lives in Vercel and never reaches
anyone's browser.

1. monday.com, your avatar, **Developers**, **My access tokens**, and copy your
   personal API token.
2. Vercel, this project, **Settings**, **Environment Variables**, and add three:

   | Name | Value |
   | --- | --- |
   | `MONDAY_TOKEN` | the token from step 1 |
   | `SYNC_KEY` | any long random string you invent |
   | `MONDAY_BOARD_ID` | `5029507352`, only needed if the board changes |

   Apply them to **Production** at least.
3. Redeploy once so the function picks them up.
4. In the editor, **Settings**, and put the same `SYNC_KEY` value in the
   **Sync key** field. Save.

Without `SYNC_KEY` the endpoint refuses everything, so a half-configured
deployment cannot leak the board.

## Day to day

1. Open the editor.
2. **Sync from monday.com** to pull the board in, or edit by hand: pencils on
   the strategy tab, the pencil in a capability drawer, **Add capability** at
   the foot of a lane.
3. The bar at the top says **Unpublished draft** while your copy differs from
   the live one.
4. Press **Publish**. The bar goes green and the public site follows.

**Discard draft** throws your unpublished changes away and returns to the
published content.

## What the sync does and does not touch

The board owns:

- which lane a capability sits in, from the **Now** / **Next** / **Later** groups
- the pillar, from the **S Pillar** column
- the package, from the **Package** column, when it has one
- the capture date, from **Date Insight Created**
- the monday.com link
- the Thesis, taken from the **Problem / Opportunity** section of the item's
  Thesis document and nothing after it

You own:

- the short card title and the one-line summary. A new item gets a first draft
  of both from the board, and after that the sync leaves them alone
- the Azure DevOps link
- everything on the Platform Strategy tab

A capability on the site that is no longer on the board is listed in the sync
result and left in place. Delete it yourself from its drawer if it should go.

Item ids are the board number and the Item ID column joined, for example
`5029507352-2854697896`, so a card can always be traced back to one board row.

## Notes

- `editor.html` is deployed alongside the public page and anyone can open it.
  Without the GitHub token it cannot publish, without the sync key it cannot
  sync, and any edits a visitor makes stay in their own browser. If you would
  rather it were not reachable at all, delete it from the deployed branch and
  open it from a local copy instead, served over `http` rather than opened as
  a file.
- The GitHub token and the sync key are held in that browser's `localStorage`.
  They never go anywhere except to `api.github.com` and to this site's own
  `/api/sync`. Anyone who can use that browser profile can read them.
- `content.json` is also the artifact export format for the strategy section,
  under `content`, `boxes` and `questions`, so the Strategic Pillars page and
  this site stay interchangeable.
- Editing in two browsers at once will have the second publish overwrite the
  first. There is one editor by design.
