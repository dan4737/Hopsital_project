import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const listByPeriod = query({
  args: { schedulePeriodId: v.id("schedulePeriods") },
  handler: async (ctx, { schedulePeriodId }) => {
    const shifts = await ctx.db
      .query("shifts")
      .withIndex("by_period", (q) =>
        q.eq("schedulePeriodId", schedulePeriodId)
      )
      .collect();

    return Promise.all(
      shifts.map(async (shift) => ({
        ...shift,
        worker: await ctx.db.get(shift.workerId),
        department: await ctx.db.get(shift.departmentId),
      }))
    );
  },
});

export const listByWorker = query({
  args: { workerId: v.id("workers") },
  handler: async (ctx, { workerId }) => {
    const shifts = await ctx.db
      .query("shifts")
      .withIndex("by_worker", (q) => q.eq("workerId", workerId))
      .collect();

    return Promise.all(
      shifts.map(async (shift) => ({
        ...shift,
        department: await ctx.db.get(shift.departmentId),
      }))
    );
  },
});

export const getById = internalQuery({
  args: { shiftId: v.id("shifts") },
  handler: async (ctx, { shiftId }) => {
    const shift = await ctx.db.get(shiftId);
    if (!shift) return null;
    return {
      ...shift,
      department: await ctx.db.get(shift.departmentId),
    };
  },
});

export const updateShiftCode = mutation({
  args: { shiftId: v.id("shifts"), shiftCode: v.string() },
  handler: async (ctx, { shiftId, shiftCode }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const worker = await ctx.db
      .query("workers")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .first();
    if (!worker?.isClerk) throw new Error("Not authorised");

    await ctx.db.patch(shiftId, { shiftCode });
  },
});

export const bulkUpsert = mutation({
  args: {
    schedulePeriodId: v.id("schedulePeriods"),
    shifts: v.array(
      v.object({
        workerId: v.id("workers"),
        shiftDate: v.string(),
        shiftCode: v.string(),
        departmentId: v.id("departments"),
      })
    ),
  },
  handler: async (ctx, { schedulePeriodId, shifts }) => {
    for (const s of shifts) {
      const existing = await ctx.db
        .query("shifts")
        .withIndex("by_worker", (q) => q.eq("workerId", s.workerId))
        .filter((q) => q.eq(q.field("shiftDate"), s.shiftDate))
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
