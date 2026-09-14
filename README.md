# PeoplesHR Platform site

A public read-only website for the platform strategy and the product roadmap,
plus a private editor that publishes to it.

```
content.json   the single source of truth. Everything on both tabs.
index.html     the public site. Read-only. Loads content.json.
editor.html    your editor. Same page plus editing and a Publish button.
app.js         shared rendering and interaction.
edit.js        publishing. Loaded by editor.html only, never by index.html.
styles.css     shared styles.
vercel.json    Vercel config. Stops content.json being cached.
_headers       the same thing for Cloudflare Pages. Vercel ignores it.
```

## How it works

`index.html` fetches `content.json` and renders it. It contains no editing
code path that can reach the server, and it never loads `edit.js`.

`editor.html` sets one flag before loading the same `app.js`, which turns on
the pencils, the **Add capability** buttons and the capability form. Your edits
are written to this browser's `localStorage` as a private draft. Nothing
changes on the public site until you press **Publish**.

**Publish** writes `content.json` back to the GitHub repository through the
GitHub API. The host sees the commit and redeploys, normally within a minute.

## One-time setup

### 1. Create the repository

Make a new GitHub repository, for example `peopleshr-platform`. It can be
private. Put these files in the root of the default branch.

### 2. Connect Vercel

1. Go to vercel.com and sign in **with GitHub**.
2. **Add New**, **Project**, then **Import** the `peopleshr-platform`
   repository. Vercel asks for access to the repository the first time.
   Grant it to that one repository rather than all of them.
3. Framework preset: **Other**. Leave the build command, output directory
   and install command **empty**. There is nothing to build.
4. **Deploy**. You get a `*.vercel.app` URL in under a minute.
5. For a proper address, project **Settings**, **Domains**, and add something
   like `roadmap.peopleshr.com`. That needs a CNAME from whoever runs the
   peopleshr.com DNS.

Every push to the default branch redeploys automatically, which is what makes
the editor's Publish button work.

### 3. Make a token for publishing

1. GitHub, **Settings**, **Developer settings**,
   **Personal access tokens**, **Fine-grained tokens**, **Generate new token**.
2. Repository access: **Only select repositories**, and choose this one.
3. Permissions: **Repository permissions**, **Contents**, **Read and write**.
   Nothing else.
4. Set an expiry you are comfortable with and generate it. Copy it once.

### 4. Connect the editor

Open `editor.html` on the deployed site, press **Connect repository**, fill in
owner, repository, branch and the token, then **Test connection** and **Save**.

The token is held in that browser's `localStorage`. It never goes anywhere
except to `api.github.com` as an authorization header. Anyone who can use that
browser profile can read it, so scope it to this one repository and revoke it
if the machine changes hands.

## Day to day

1. Open the editor.
2. Edit. Pencils on the strategy tab, the pencil in a capability drawer, or
   **Add capability** at the foot of a lane.
3. The bar at the top says **Unpublished draft** while your copy differs from
   the live one.
4. Press **Publish**. The bar goes green and the public site follows.

**Discard draft** throws your unpublished changes away and returns to the
published content.

## Notes

- `editor.html` is deployed alongside the public page and anyone can open it.
  Without the token it cannot publish, and any edits a visitor makes stay in
  their own browser. If you would rather it were not reachable at all, delete
  it from the deployed branch and open it from a local copy instead, served
  over `http` rather than opened as a file.
- `content.json` is also the artifact export format for the strategy section,
  under `content`, `boxes` and `questions`, so the Strategic Pillars page and
  this site stay interchangeable.
- Editing two browsers at once will have the second publish overwrite the
  first. There is one editor by design.
