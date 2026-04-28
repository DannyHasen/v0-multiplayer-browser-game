# v0-multiplayer-browser-game

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_Wur4Q8OZxnZYMjcW19Nsw4N6G2X0)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Real Multiplayer Mode

The default dev flow uses the local demo client so you can test bots and gameplay quickly in one browser. To test real people in the same room, run the PartyKit server and start Next.js with PartyKit mode enabled.

In one terminal:

```powershell
corepack.cmd pnpm party:dev
```

In a second terminal:

```powershell
$env:NEXT_PUBLIC_MULTIPLAYER_MODE="party"
corepack.cmd pnpm dev --hostname 127.0.0.1 --port 3000
```

Then open two browser windows at [http://127.0.0.1:3000/play](http://127.0.0.1:3000/play), create a room in one window, and join the same room code in the other.

For friends on different networks, deploy the PartyKit server:

```powershell
corepack.cmd pnpm party:deploy
```

Set these environment variables wherever the Next.js app is running:

```text
NEXT_PUBLIC_MULTIPLAYER_MODE=party
NEXT_PUBLIC_PARTYKIT_HOST=neon-drift-arena.<your-github-username>.partykit.dev
```

Then share the deployed Next.js app URL and a room code.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.

<a href="https://v0.app/chat/api/kiro/clone/DannyHasen/v0-multiplayer-browser-game" alt="Open in Kiro"><img src="https://pdgvvgmkdvyeydso.public.blob.vercel-storage.com/open%20in%20kiro.svg?sanitize=true" /></a>
