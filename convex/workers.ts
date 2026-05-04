import { query, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { departmentId: v.optional(v.id("departments")) },
  handler: async (ctx, { departmentId }) => {
    if (departmentId) {
      return ctx.db
        .query("workers")
        .withIndex("by_department", (q) => q.eq("departmentId", departmentId))
        .collect();
    }
    return ctx.db.query("workers").collect();
  },
});

export const getByUserId = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return ctx.db
      .query("workers")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .first();
  },
});

export const getById = internalQuery({
  args: { workerId: v.id("workers") },
  handler: async (ctx, { workerId }) => {
    return ctx.db.get(workerId);
  },
});

export const listDepartments = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("departments").collect();
  },
});

export const listSchedulePeriods = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("schedulePeriods").collect();
  },
});
