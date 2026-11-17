# BothPls User Flows (English)

[中文版](UserFlow.md) · [PRD](PRD.md)

All polls are single-choice. Participants open a shared link and complete soft login with a random nickname and avatar before voting; no account registration is required. Closing disables votes and vote changes and makes comments public. Create and Profile are bottom navigation destinations.

Keep both language versions and the PRD synchronized when rules change.

## 1. Overall User Flow

```mermaid
flowchart TD
    A[Open BothPls] --> B[Home]
    A -->|Shared link| SL[Soft login: nickname and avatar]
    SL --> C[Voting page]
    B --> C
    B --> D[Create: login required]
    D --> E[Publish poll]
    E --> E1[Share public link]
    B --> F[Profile: login required]
    F --> G[My Polls]
    G --> G1[View results and manage]
    C --> H{Poll open?}
    H -->|No| I[Final results and public comments]
    H -->|Yes| J[Select one option]
    J --> K[Submit vote with optional comment]
    K --> L{Still open?}
    L -->|No| I
    L -->|Yes| M[Save latest vote and show results]
    M -->|Change while open| J
    M --> N[Optional comment / Share]
```

Creation form: Disable Publish while required fields are incomplete; show validation errors inline.

## 2. Creator Flow

```mermaid
flowchart TD
    A[Tap Create on Home] --> B{Logged in?}
    B -->|No| C[Log in / Sign up]
    B -->|Yes| D[Creation form]
    C --> D
    D --> E[Title and 2–5 product options]
    E --> F[Optional images, description and deadline]
    F --> G[Publish]
    G --> I[Published: generate public link]
    I --> J[Share with friends]
```

## 3. Participant Flow

```mermaid
flowchart TD
    A[Receive and open shared link] --> B[Soft login: enter random nickname and avatar]
    B --> C[Voting page]
    C --> D[Select one option and optionally comment]
    D --> E[Submit]
    E --> F[Results page]
```

## 4. Poll Management

```mermaid
flowchart TD
    A[Profile] --> B[My Polls]
    B --> C[View results and manage]
    C --> D[Creator menu]
    D --> E[Copy public link]
    D --> F[Duplicate into creation form]
    F --> G[Review and publish new poll]
    D --> H{Edit: poll open?}
    H -->|Yes| I[Edit and save]
    H -->|No| J[Editing disabled]
    D --> K[Set deadline]
    K --> L[Close automatically at deadline]
    D --> M[Close manually: confirm]
    M -->|Cancel| C
    M -->|Confirm| N[Final results and public comments]
    L --> N
    D --> O[Delete: confirm]
    O -->|Cancel| C
    O -->|Confirm| P[Delete and return to My Polls]
```

## 5. Pages and Permissions

```mermaid
flowchart LR
    A[Guest] --> B[Open shared link]
    A --> C[View closed poll results]
    B --> D[Soft login: random nickname and avatar]
    D --> E[Participant with soft-login identity]
    E --> F[Submit single-choice vote]
    E --> G[Change own vote while open]
    E --> H[Manage own comments]
    E --> I[Profile]
    J[Creator] --> I
    I --> K[My Polls and creator menu]
    K --> L[Edit / Duplicate / Close / Delete]
    K --> M[Manage all comments]
```

## 6. Poll Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Open: Publish
    Open --> Open: Submit or change single-choice vote
    Open --> Closed: Deadline reached
    Open --> Closed: Creator confirms closing
    Open --> Deleted: Creator confirms deletion
    Closed --> Deleted: Creator confirms deletion
    note right of Open
        Voting and changes allowed
        Current results visible
        Comments hidden
    end note
    note right of Closed
        Voting and changes disabled
        Final results visible
        All comments public
    end note
    note right of Deleted
        Public link unavailable
    end note
```

## 7. Business Sequence

```mermaid
sequenceDiagram
    participant O as Creator
    participant S as System
    participant V as Participant
    O->>S: Log in and create poll
    S-->>O: Generate public link and show sharing actions
    O->>V: Share link
    V->>S: Open link and enter random nickname and avatar
    V->>S: Select one option and optionally comment
    V->>S: Submit vote and optional comment
    alt Poll still open
        S-->>V: Save choice and show current results
        V->>S: Optionally comment or change choice
    else Poll closed
        S-->>V: Reject vote and show final results
    end
    O->>S: Confirm closing or reach deadline
    S-->>V: Show final results and all comments
    O->>S: Optionally duplicate or confirm deletion
```

Participant identity: Soft login does not require an account. Nickname and avatar identify the participant; repeat-vote protection must also rely on a persistent participant identity. Comments are optional on the voting page and submitted with the vote. Closed polls show final results and reject votes. Creator account login is unchanged.

