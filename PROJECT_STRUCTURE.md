# BothPls 项目结构

## 源码目录

```text
src/
├── app/
│   ├── App.tsx
│   └── router.tsx
├── components/
│   └── layout/
│       ├── BottomNav.tsx
│       └── PageShell.tsx
├── features/
│   ├── home/
│   │   └── pages/
│   │       └── HomePage.tsx
│   └── polls/
│       ├── components/
│       │   └── StatusPill.tsx
│       ├── hooks/
│       │   └── usePolls.ts
│       ├── pages/
│       │   ├── CreatePollPage.tsx
│       │   ├── ManagementPages.tsx
│       │   ├── ResultsPage.tsx
│       │   └── VotingPage.tsx
│       ├── services/
│       │   └── polls.ts
│       └── utils/
│           └── voting.ts
├── lib/
│   └── storage/
│       └── localStorage.ts
├── types/
│   └── poll.ts
├── main.tsx
└── styles.css
```

Only directories needed by the current implementation are present. For example, there is no auth feature, provider, shared UI control, asset, or application constant to place in the corresponding optional directories.

## Responsibilities

- `app/`: Application root and route definitions. Add global providers here if the app needs them.
- `components/layout/`: Reusable application framing and navigation shared by pages.
- `features/home/`: Homepage pages and any components used only by the homepage.
- `features/polls/`: Poll pages, poll-specific components and hooks, poll data operations, and voting helpers. Keep poll rules and poll state within this feature.
- `hooks/`: Hooks shared across multiple features; feature-specific hooks stay with their feature.
- `lib/`: Shared infrastructure such as browser storage helpers.
- `types/`: TypeScript types shared across features.
- `constants/`: Shared application constants, when needed.
- `assets/`: Static assets imported by the application, when needed.
- `styles.css`: Global styles; keep page- or feature-specific styles alongside that feature if they are introduced.
- `main.tsx`: Browser entry point that mounts the React application.

## Where to add code

- Add a page to the relevant feature's `pages/` directory, then register its URL in `app/router.tsx`.
- Put a component used only by one feature in that feature's `components/`; put genuinely reusable layout or UI components in `components/`.
- Keep feature-specific state hooks, business logic, and data operations in that feature's `hooks/`, `utils/`, and `services/` directories. Put shared infrastructure in `lib/` and cross-feature types in `types/`.
- Add new auth or other feature directories only when the corresponding implementation exists; avoid empty folders and unnecessary layers.
