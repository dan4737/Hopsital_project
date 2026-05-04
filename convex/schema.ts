import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  departments: defineTable({
    name: v.string(),
    code: v.string(),
  }).index("by_code", ["code"]),

  workers: defineTable({
    name: v.string(),
    seniorityNumber: v.optional(v.number()),
    departmentId: v.id("departments"),
    subDepartment: v.optional(v.string()),
    role: v.optional(v.string()),
    qualifications: v.optional(v.array(v.string())),
    email: v.string(),
    phone: v.optional(v.string()),
    pushSubscription: v.optional(v.string()),
    isClerk: v.boolean(),
    userId: v.optional(v.string()),
  })
    .index("by_email", ["email"])
    .index("by_userId", ["userId"])
    .index("by_department", ["departmentId"]),

  schedulePeriods: defineTable({
    label: v.string(),
    startDate: v.string(),
    endDate: v.string(),
  }),

  shifts: defineTable({
    workerId: v.id("workers"),
    schedulePeriodId: v.id("schedulePeriods"),
    shiftDate: v.string(),
    shiftCode: v.string(),
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
    claimedAt: v.optional(v.number()),
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
