# BothPls User Flows

[中文版](UserFlow.md) · [PRD](PRD.md)

Based on the current implementation. Repeated entry points and login checks are merged. Profile is public; creating and managing own polls share account authentication.

## 1. Main flow

```mermaid
flowchart TD
    H[Home] -->|Create| A{Creator account signed in?}
    H -->|Profile| P[Profile: identity / My polls]
    P -->|Create or manage| A
    A -->|No| L[Email login / registration]
    L --> T{Resume original action}
    A -->|Yes| T
    T -->|Create| C[Complete and publish poll]
    T -->|Manage| M[Select own poll]
    C --> S[Results: open sharing]
    S -->|Shared link| E[Open poll]
    M --> R[Results]
    H -->|Browse polls| E
    LINK[Receive shared link] --> E
    E --> O{Poll open?}
    O -->|No| R
    O -->|Yes| I{Soft identity available?}
    I -->|No| J[Soft login: nickname and avatar]
    J --> V[Voting: browse and confirm option]
    I -->|Yes| V
    V --> B[Optional comment and submit]
    B --> R
    R -->|Change vote while open| V
    R -->|Close results: all identities, no confirmation| H
```

Profile shows account details, soft identity, or an unsigned empty state without forcing login. Creator accounts and soft identities are separate.

## 2. Management flow

```mermaid
flowchart TD
    R[Own poll results] --> M[Management menu]
    M -->|Edit / deadline while open| E[Edit and save in creation form]
    E --> R
    M -->|Duplicate| C[Prefill creation form and publish new poll]
    C --> N[New results and sharing]
    M -->|Share| S[Share dialog]
    S --> R
    M -->|End / delete| Q{Confirm action}
    Q -->|Cancel| R
    Q -->|End| F[Final results and public comments]
    Q -->|Delete| B[Return to Home / Profile]
```

Reaching the deadline also produces final results. Duplication excludes original votes, comments, and deadline.

## 3. State and permissions

| Situation | Rule |
| --- | --- |
| Browsing | Home, Profile, and Results allow unsigned access; the Home square shows public polls to visitors and soft-login users; Recent polls contains only polls created or participated in by the current identity, not polls merely viewed |
| Create / manage | Registered accounts create polls; only owners edit, end, or delete their polls |
| Select / submit | Single choice; confirmation triggers pouring, followed by separate submission; optional comment is submitted with the vote |
| Vote changes | Allowed while open; only the current identity's latest valid selection counts |
| Comment visibility | Hidden from ordinary participants while open, visible to creators; public after closing |
| Comment management | Authors edit or delete their own comments; creators may delete; management remains available after closing without changing votes |
| Closed | Final results and comments remain available; new or changed selections are prohibited |
| Deleted | Original links show a missing-poll state with a return action |
| Leaving results | All identities return directly to Home without confirmation or closing the browser tab; identity is retained. Loading, error and missing states use the same exit. |

## 4. Recovery and errors

- Reloads retain browser identities. Clearing browser storage loses the soft identity; automatic cross-device synchronization is unavailable. Account login does not replace soft login.
- Creation and voting drafts are scoped by identity, cleared after successful submission, and retained for retries after failure.
- Submission uses server state and time; expired or closed polls reject submissions.
- Results refresh about every 10 seconds and on visibility or network recovery.
- Poll loading failures for visitors and soft-login users use the generic “Poll loading failed. Please try again later.” message; Home Recent polls and Square provide retry actions instead of exposing Supabase configuration errors.
- Permission errors, loading failures, and missing links provide feedback and safe exits without forcing participants into creator login.
