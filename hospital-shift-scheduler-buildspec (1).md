# Hospital Shift Scheduler — Windsurf Build Spec (Convex)

## Overview

A web-based shift scheduling platform for hospital radiology departments. It replaces the current workflow where staff photograph paper Excel schedules and coordinate swaps via phone. The app keeps the clerk's Excel-based input workflow intact while giving all staff a real-time, mobile-friendly interface.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React + Vite | Fast dev, mobile-responsive |
| Styling | Tailwind CSS | Utility-first, easy responsive design |
| Backend / DB / Real-time | **Convex** | All-in-one: database, server functions, real-time reactivity, and scheduled jobs — no separate backend needed |
| Auth | **Convex Auth** (`@convex-dev/auth`) | Built on top of Convex, supports email/password and magic links |
| Excel parsing | SheetJS (`xlsx`) | Parse `.xlsx` files in the browser before sending to Convex |
| Notifications | Convex scheduled functions + Web Push API | `ctx.scheduler.runAfter()` for seniority queue timing |
| SMS fallback | Twilio (optional, called from a Convex action) | For workers who don't enable push |
| Hosting | Vercel or Netlify | Free tier, auto-deploy from GitHub |

---

## Why Convex Instead of Supabase

Convex replaces Supabase + separate API routes + real-time config with a single unified layer:

- **No SQL schema files** — schema is defined in TypeScript in `convex/schema.ts`
- **No RLS policies** — access control lives inside each query/mutation function
- **Real-time is automatic** — any `useQuery` hook re-runs the moment the underlying data changes, with no channel setup
- **Scheduled jobs built in** — the seniority notification queue uses `ctx.scheduler.runAfter()` with no external cron or queue service
- **Type-safe end to end** — Convex generates types from your schema, so frontend and backend share the same types automatically

---

## Project Setup

```bash
npm create vite@latest hospital-scheduler -- --template react
cd hospital-scheduler
npm install convex @convex-dev/auth
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npx convex dev   # initialises convex/ folder and links to your Convex project
```

Your `.env.local` will contain only:
```
VITE_CONVEX_URL=https://<your-project>.convex.cloud
```

---

## Convex Schema — `convex/schema.ts`

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({

  departments: defineTable({
    name: v.string(),       // "X-Ray WRM"
    code: v.string(),       // "WRM"
  }).index("by_code", ["code"]),

  workers: defineTable({
    name: v.string(),
    seniorityNumber: v.optional(v.number()),  // lower = more senior
    departmentId: v.id("departments"),
    role: v.optional(v.string()),             // "WRM", "WRO", "casual"
    qualifications: v.optional(v.array(v.string())), // ["IR", "XM", "XO"]
    email: v.string(),
    phone: v.optional(v.string()),
    pushSubscription: v.optional(v.string()), // JSON-stringified Web Push subscription
    isClerk: v.boolean(),
    userId: v.optional(v.string()),           // Convex Auth user ID
  })
    .index("by_email", ["email"])
    .index("by_userId", ["userId"])
    .index("by_department", ["departmentId"]),

  schedulePeriods: defineTable({
    label: v.string(),      // "Oct 2024 Week 1"
    startDate: v.string(),  // ISO date string "2024-10-12"
    endDate: v.string(),    // ISO date string "2024-10-25"
  }),

  shifts: defineTable({
    workerId: v.id("workers"),
    schedulePeriodId: v.id("schedulePeriods"),
    shiftDate: v.string(),     // ISO date "2024-10-14"
    shiftCode: v.string(),     // "7-3 M", "VN", "SK", "RP 7:30", etc.
    departmentId: v.id("departments"),
    isVacant: v.boolean(),
    notes: v.optional(v.string()),
  })
    .index("by_period", ["schedulePeriodId"])
    .index("by_worker", ["workerId"])
    .index("by_department_and_date", ["departmentId", "shiftDate"]),

  swapRequests: defineTable({
    shiftId: v.id("shifts"),
    postedBy: v.id("workers"),
    reason: v.optional(v.string()),
    status: v.union(
      v.literal("open"),
      v.literal("claimed"),
      v.literal("cancelled")
    ),
    claimedBy: v.optional(v.id("workers")),
    claimedAt: v.optional(v.number()),  // Unix ms timestamp
  })
    .index("by_status", ["status"])
    .index("by_shift", ["shiftId"]),

  vacancyNotifications: defineTable({
    shiftId: v.id("shifts"),
    workerId: v.id("workers"),
    seniorityRank: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("accepted"),
      v.literal("declined"),
      v.literal("expired")
    ),
    sentAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    respondedAt: v.optional(v.number()),
  })
    .index("by_shift", ["shiftId"])
    .index("by_worker", ["workerId"])
    .index("by_shift_and_rank", ["shiftId", "seniorityRank"]),

});
```

---

## App Structure

```
convex/
  schema.ts                  -- All table definitions (see above)
  auth.ts                    -- Convex Auth config
  workers.ts                 -- queries + mutations for worker data
  shifts.ts                  -- queries + mutations for schedule/shifts
  swapRequests.ts            -- queries + mutations for swap board
  vacancyQueue.ts            -- mutations + scheduled actions for seniority queue
  notifications.ts           -- Convex action: send Web Push notifications
  seed.ts                    -- Dev seed data (Oct 2024 schedule)

src/
  components/
    ScheduleTable.jsx         -- Full grid view
    MyShifts.jsx              -- Personal shift cards
    SwapBoard.jsx             -- Open swap requests list
    PostSwapForm.jsx          -- Modal: post a shift for swap
    ClerkUpload.jsx           -- Excel upload + schedule management
    VacancyQueue.jsx          -- Clerk view: seniority notification queue
    ShiftBadge.jsx            -- Colour-coded shift code pill
  pages/
    SchedulePage.jsx          -- Tabbed view: Schedule / My Shifts / Swap Board
    ClerkDashboard.jsx        -- Clerk-only: upload, edit, send vacancy notices
    LoginPage.jsx             -- Convex Auth login
  lib/
    convex.ts                 -- ConvexReactClient init
    parseExcel.js             -- SheetJS parser: .xlsx → shift objects
    pushNotifications.js      -- Web Push subscribe + send helpers
```

---

## Convex Functions

### `convex/shifts.ts`

```typescript
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Fetch all shifts for a schedule period (auto-reactive)
export const listByPeriod = query({
  args: { schedulePeriodId: v.id("schedulePeriods") },
  handler: async (ctx, { schedulePeriodId }) => {
    const shifts = await ctx.db
      .query("shifts")
      .withIndex("by_period", q => q.eq("schedulePeriodId", schedulePeriodId))
      .collect();

    // Join worker + department for each shift
    return Promise.all(shifts.map(async shift => ({
      ...shift,
      worker: await ctx.db.get(shift.workerId),
      department: await ctx.db.get(shift.departmentId),
    })));
  },
});

// Clerk: update a shift code inline
export const updateShiftCode = mutation({
  args: { shiftId: v.id("shifts"), shiftCode: v.string() },
  handler: async (ctx, { shiftId, shiftCode }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    // TODO: assert isClerk via workers table lookup
    await ctx.db.patch(shiftId, { shiftCode });
  },
});

// Clerk: bulk upsert from Excel upload
export const bulkUpsert = mutation({
  args: {
    schedulePeriodId: v.id("schedulePeriods"),
    shifts: v.array(v.object({
      workerId: v.id("workers"),
      shiftDate: v.string(),
      shiftCode: v.string(),
      departmentId: v.id("departments"),
    })),
  },
  handler: async (ctx, { schedulePeriodId, shifts }) => {
    for (const s of shifts) {
      const existing = await ctx.db
        .query("shifts")
        .withIndex("by_worker", q => q.eq("workerId", s.workerId))
        .filter(q => q.eq(q.field("shiftDate"), s.shiftDate))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, { shiftCode: s.shiftCode });
      } else {
        await ctx.db.insert("shifts", {
          ...s,
          schedulePeriodId,
          isVacant: false,
        });
      }
    }
  },
});
```

---

### `convex/swapRequests.ts`

```typescript
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// All open swaps — auto-reactive, updates instantly for all users
export const listOpen = query({
  args: {},
  handler: async (ctx) => {
    const swaps = await ctx.db
      .query("swapRequests")
      .withIndex("by_status", q => q.eq("status", "open"))
      .collect();

    return Promise.all(swaps.map(async swap => ({
      ...swap,
      shift: await ctx.db.get(swap.shiftId),
      postedByWorker: await ctx.db.get(swap.postedBy),
    })));
  },
});

// Post a shift for swap
export const post = mutation({
  args: {
    shiftId: v.id("shifts"),
    postedBy: v.id("workers"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("swapRequests", {
      ...args,
      status: "open",
    });
  },
});

// Claim a swap
export const claim = mutation({
  args: {
    swapRequestId: v.id("swapRequests"),
    claimedBy: v.id("workers"),
  },
  handler: async (ctx, { swapRequestId, claimedBy }) => {
    const swap = await ctx.db.get(swapRequestId);
    if (!swap || swap.status !== "open") throw new Error("Swap not available");

    const shift = await ctx.db.get(swap.shiftId);

    // Eligibility: claimer must not already have a shift on that date
    const conflict = await ctx.db
      .query("shifts")
      .withIndex("by_worker", q => q.eq("workerId", claimedBy))
      .filter(q => q.eq(q.field("shiftDate"), shift!.shiftDate))
      .first();
    if (conflict) throw new Error("You already have a shift on this day");

    // Reassign shift + mark swap claimed
    await ctx.db.patch(swap.shiftId, { workerId: claimedBy });
    await ctx.db.patch(swapRequestId, {
      status: "claimed",
      claimedBy,
      claimedAt: Date.now(),
    });
  },
});
```

---

### `convex/vacancyQueue.ts`

```typescript
import { mutation, internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours per worker

// Clerk triggers this to start the seniority queue for a vacant shift
export const startQueue = mutation({
  args: { shiftId: v.id("shifts") },
  handler: async (ctx, { shiftId }) => {
    const shift = await ctx.db.get(shiftId);
    if (!shift) throw new Error("Shift not found");

    // All eligible workers in the same dept, sorted by seniority number ascending
    const workers = await ctx.db
      .query("workers")
      .withIndex("by_department", q => q.eq("departmentId", shift.departmentId))
      .collect();

    const sorted = workers
      .filter(w => !w.isClerk)
      .sort((a, b) => (a.seniorityNumber ?? 99999) - (b.seniorityNumber ?? 99999));

    for (let i = 0; i < sorted.length; i++) {
      await ctx.db.insert("vacancyNotifications", {
        shiftId,
        workerId: sorted[i]._id,
        seniorityRank: i,
        status: "pending",
      });
    }

    // Fire first notification immediately
    await ctx.scheduler.runAfter(0, internal.vacancyQueue.sendNext, { shiftId, rank: 0 });
  },
});

// Internal: send notification to worker at a given seniority rank
export const sendNext = internalAction({
  args: { shiftId: v.id("shifts"), rank: v.number() },
  handler: async (ctx, { shiftId, rank }) => {
    const entry = await ctx.runQuery(internal.vacancyQueue.getQueueEntry, { shiftId, rank });
    if (!entry) return; // queue exhausted or shift already filled

    const expiresAt = Date.now() + WINDOW_MS;
    await ctx.runMutation(internal.vacancyQueue.markSent, {
      notificationId: entry._id,
      expiresAt,
    });

    // Send the Web Push notification
    await ctx.runAction(internal.notifications.sendPush, {
      workerId: entry.workerId,
      shiftId,
      expiresAt,
    });

    // Schedule expiry — advance queue if no response within the window
    await ctx.scheduler.runAfter(WINDOW_MS, internal.vacancyQueue.handleExpiry, {
      shiftId,
      notificationId: entry._id,
      nextRank: rank + 1,
    });
  },
});

// Internal: advance to next worker on expiry
export const handleExpiry = internalMutation({
  args: {
    shiftId: v.id("shifts"),
    notificationId: v.id("vacancyNotifications"),
    nextRank: v.number(),
  },
  handler: async (ctx, { shiftId, notificationId, nextRank }) => {
    const notif = await ctx.db.get(notificationId);
    if (!notif || notif.status !== "sent") return; // already responded

    await ctx.db.patch(notificationId, { status: "expired" });
    await ctx.scheduler.runAfter(0, internal.vacancyQueue.sendNext, { shiftId, rank: nextRank });
  },
});

// Worker accepts a vacancy notification
export const acceptVacancy = mutation({
  args: { notificationId: v.id("vacancyNotifications") },
  handler: async (ctx, { notificationId }) => {
    const notif = await ctx.db.get(notificationId);
    if (!notif || notif.status !== "sent") throw new Error("Notification expired or already responded");

    await ctx.db.patch(notif.shiftId, { workerId: notif.workerId, isVacant: false });
    await ctx.db.patch(notificationId, { status: "accepted", respondedAt: Date.now() });

    // Cancel all remaining pending/sent entries for this shift
    const remaining = await ctx.db
      .query("vacancyNotifications")
      .withIndex("by_shift", q => q.eq("shiftId", notif.shiftId))
      .filter(q =>
        q.or(q.eq(q.field("status"), "pending"), q.eq(q.field("status"), "sent"))
      )
      .collect();

    for (const r of remaining) {
      await ctx.db.patch(r._id, { status: "expired" });
    }
  },
});

// Worker declines
export const declineVacancy = mutation({
  args: { notificationId: v.id("vacancyNotifications") },
  handler: async (ctx, { notificationId }) => {
    const notif = await ctx.db.get(notificationId);
    if (!notif) throw new Error("Not found");

    await ctx.db.patch(notificationId, { status: "declined", respondedAt: Date.now() });

    // Advance to the next worker in the queue immediately
    await ctx.scheduler.runAfter(0, internal.vacancyQueue.sendNext, {
      shiftId: notif.shiftId,
      rank: notif.seniorityRank + 1,
    });
  },
});
```

---

## Frontend — Real-time Hooks

With Convex, **there is no manual subscription setup**. Every `useQuery` is reactive by default — when underlying data changes, the component re-renders automatically.

```tsx
// src/pages/SchedulePage.jsx
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export function SchedulePage({ periodId }) {
  // Automatically re-renders whenever any shift in this period changes
  const shifts = useQuery(api.shifts.listByPeriod, { schedulePeriodId: periodId });
  const openSwaps = useQuery(api.swapRequests.listOpen);
  const claimSwap = useMutation(api.swapRequests.claim);

  if (shifts === undefined) return <LoadingSpinner />;

  return (
    <ScheduleTable
      shifts={shifts}
      openSwaps={openSwaps}
      onClaimSwap={(swapId, workerId) =>
        claimSwap({ swapRequestId: swapId, claimedBy: workerId })
      }
    />
  );
}
```

```tsx
// src/pages/ClerkDashboard.jsx
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { parseScheduleExcel } from "../lib/parseExcel";

export function ClerkDashboard({ currentPeriodId }) {
  const bulkUpsert = useMutation(api.shifts.bulkUpsert);
  const startQueue = useMutation(api.vacancyQueue.startQueue);

  async function handleExcelUpload(file) {
    const parsed = await parseScheduleExcel(file); // SheetJS → shift objects
    await bulkUpsert({ schedulePeriodId: currentPeriodId, shifts: parsed });
    // All staff see the update instantly — no extra step needed
  }

  return (/* ... */);
}
```

---

## Authentication — `convex/auth.ts`

```typescript
// convex/auth.ts
import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { MagicLink } from "@convex-dev/auth/providers/MagicLink";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Password, MagicLink],
});
```

```typescript
// convex/http.ts  (required for Convex Auth)
import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();
auth.addHttpRoutes(http);
export default http;
```

```tsx
// src/main.jsx
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

ReactDOM.createRoot(document.getElementById("root")).render(
  <ConvexAuthProvider client={convex}>
    <App />
  </ConvexAuthProvider>
);
```

**Role protection inside Convex functions** — instead of RLS policies, check the caller inline:

```typescript
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Not authenticated");

const worker = await ctx.db
  .query("workers")
  .withIndex("by_userId", q => q.eq("userId", identity.subject))
  .first();

if (!worker?.isClerk) throw new Error("Not authorised");
```

---

## Excel Upload — `src/lib/parseExcel.js`

```javascript
import * as XLSX from 'xlsx';

export function parseScheduleExcel(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const workbook = XLSX.read(e.target.result, { type: 'binary' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      resolve(transformRows(rows));
    };
    reader.readAsBinaryString(file);
  });
}

function transformRows(rows) {
  // Row 2 (index 2): date headers starting from column D (index 3)
  // Row 3+: worker data rows
  // Col 0: worker name  |  Col 1: seniority number  |  Col 2: section trigger

  const dateHeaders = rows[2].slice(3); // ["Saturday\n12-Oct", "Sunday\n13-Oct", ...]
  let currentDept = null;
  const shifts = [];

  for (let r = 3; r < rows.length; r++) {
    const row = rows[r];
    const name = row[0]?.toString().trim();
    if (!name) continue;

    // Detect section divider rows
    if (name.startsWith('X-Ray') || name.startsWith('Casual') || name.startsWith('PT')) {
      currentDept = name.includes('WRO') ? 'WRO' : 'WRM';
      continue;
    }

    const seniority = row[1];
    const shiftCells = row.slice(3);

    shiftCells.forEach((cell, i) => {
      const code = cell?.toString().trim();
      if (code && code !== '') {
        shifts.push({
          workerName: name,           // caller resolves to workerId via workers table
          shiftDate: parseDateHeader(dateHeaders[i]),
          shiftCode: code,
          departmentCode: currentDept,
          seniorityNumber: seniority,
        });
      }
    });
  }

  return shifts;
}

function parseDateHeader(header) {
  // "Saturday\n12-Oct" → "2024-10-12"
  const match = header?.toString().match(/(\d+)-(\w+)/);
  if (!match) return null;
  const months = {
    Jan:1, Feb:2, Mar:3, Apr:4, May:5, Jun:6,
    Jul:7, Aug:8, Sep:9, Oct:10, Nov:11, Dec:12
  };
  const day = match[1].padStart(2, '0');
  const month = String(months[match[2]]).padStart(2, '0');
  return `2024-${month}-${day}`;
}
```

---

## Key Component: ShiftBadge

```jsx
// src/components/ShiftBadge.jsx
const SHIFT_STYLES = {
  VN:   'bg-amber-100 text-amber-800',
  SK:   'bg-pink-100 text-pink-800',
  ML:   'bg-purple-100 text-purple-800',
  HO:   'bg-gray-100 text-gray-600',
  Call: 'bg-red-100 text-red-700',
};

function getShiftStyle(code) {
  for (const [key, cls] of Object.entries(SHIFT_STYLES)) {
    if (code.includes(key)) return cls;
  }
  if (code.includes('RP') || code.includes('CL')) return 'bg-orange-100 text-orange-800';
  if (code.includes('XA'))    return 'bg-teal-100 text-teal-800';
  if (code.includes('2300'))  return 'bg-violet-100 text-violet-800';
  if (code.includes('O'))     return 'bg-green-100 text-green-800';
  return 'bg-blue-100 text-blue-800'; // default = morning
}

export function ShiftBadge({ code, swapPosted }) {
  if (!code) return <span className="text-gray-300">—</span>;
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getShiftStyle(code)}`}>
      {code}
      {swapPosted && <span className="ml-1 text-red-500">↔</span>}
    </span>
  );
}
```

---

## Web Push Notifications — `convex/notifications.ts`

```typescript
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import webpush from "web-push"; // npm install web-push

webpush.setVapidDetails(
  "mailto:admin@hospital.com",
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export const sendPush = internalAction({
  args: {
    workerId: v.id("workers"),
    shiftId: v.id("shifts"),
    expiresAt: v.number(),
  },
  handler: async (ctx, { workerId, shiftId, expiresAt }) => {
    const worker = await ctx.runQuery(internal.workers.getById, { workerId });
    if (!worker?.pushSubscription) return; // worker hasn't enabled push

    const shift = await ctx.runQuery(internal.shifts.getById, { shiftId });

    const payload = JSON.stringify({
      title: `Shift available — ${shift?.shiftDate}`,
      body: `${shift?.shiftCode} in ${shift?.department?.name}. Tap to accept or decline.`,
      data: { shiftId, action: "vacancy_claim", expiresAt },
    });

    await webpush.sendNotification(JSON.parse(worker.pushSubscription), payload);
  },
});
```

**Add these to your Convex dashboard environment variables:**
```
VAPID_PUBLIC_KEY=<your public key>
VAPID_PRIVATE_KEY=<your private key>
```

Generate VAPID keys once with: `npx web-push generate-vapid-keys`

---

## Mobile Considerations

- The schedule grid is wide — wrap the table in `overflow-x: auto` on mobile
- **My Shifts is the default tab on mobile** — card layout, no horizontal scroll needed
- Swap Board is a vertical card list — readable on all screen sizes
- Push notifications: Android Chrome ✅ · iOS Safari 16.4+ ✅

---

## Sample Data (from Oct 2024 schedule)

Seed your dev database using a `convex/seed.ts` mutation (run once from the Convex dashboard functions panel):

- **16 workers in X-Ray WRM** (Morning modality)
- **19 workers in X-Ray WRO** (Afternoon/Evening modality)
- **14-day period:** Oct 12–25, 2024
- **Shift codes in use:** `7-3 M` `3-11 M` `11-7 M` `8-4 M` `4-12 M` `9-5 M` `6-2 M` `2300 M` `RP 7:30` `XA 8-4` `3-11 O` `6-2 O` `7:30 O` `10-6 O` `7-3 O` `8-4 O` `9-5 O` `2300 O` `RP 7:00` `CL 7:00` `VN` `SK` `ML` `HO` `Call`

---

## Phase 1 Scope (Build This First)

1. `npx convex dev` — scaffold schema, deploy functions, seed data
2. Auth — login page with email/password via `@convex-dev/auth`
3. Schedule viewer — full grid, department/day/worker filters, auto-reactive via `useQuery`
4. My Shifts tab — personal card view with "Post for swap" button
5. Swap Board — list open swaps, claim button, auto-reactive
6. Clerk: manual inline cell edit (`updateShiftCode` mutation)

## Phase 2

7. Clerk: Excel upload + SheetJS parser → `bulkUpsert` mutation
8. Vacancy notification queue — `startQueue`, `sendNext`, `handleExpiry` via `ctx.scheduler`
9. Web Push notifications from Convex actions

## Phase 3

10. SMS fallback via Twilio called from a Convex action
11. Eligibility rules engine (qualification codes, hours limits)
12. Schedule history — Convex stores full mutation log by default
13. Export: regenerate updated `.xlsx` from live Convex data using SheetJS on the client
