import { mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const tables = ["shifts", "swapRequests", "vacancyNotifications", "workers", "schedulePeriods", "departments"] as const;
    for (const table of tables) {
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
    }
  },
});

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("departments").first();
    if (existing) {
      throw new Error("Database already seeded. Run seed:clearAll first.");
    }

    // --- Departments ---
    const wrmId = await ctx.db.insert("departments", { name: "X-Ray WRM", code: "WRM" });
    const wroId = await ctx.db.insert("departments", { name: "X-Ray WRO", code: "WRO" });

    // --- Schedule Period ---
    const periodId = await ctx.db.insert("schedulePeriods", {
      label: "Oct 2024 Week 1-2",
      startDate: "2024-10-12",
      endDate: "2024-10-25",
    });

    // --- WRM Workers with sub-departments and qualifications ---
    type WorkerDef = { name: string; seniority: number; sub: string; quals?: string[]; };

    const wrmWorkers: WorkerDef[] = [
      { name: "Sonja Serafimovski", seniority: 5094, sub: "X-Ray-WRM", quals: ["IR", "XM"] },
      { name: "Rosemary Simmons", seniority: 5094, sub: "X-Ray-WRM" },
      { name: "Lisa Greenwood", seniority: 5160, sub: "X-Ray-WRM" },
      { name: "Rachel Dupuis", seniority: 6119, sub: "X-Ray-WRM" },
      { name: "Shae Drouillard", seniority: 7259, sub: "X-Ray-WRM" },
      { name: "Tara McDowell", seniority: 7276, sub: "X-Ray-WRM" },
      { name: "Claudia McCarton", seniority: 3701, sub: "X-Ray-WRM" },
      { name: "Jim Copson", seniority: 8331, sub: "X-Ray-WRM" },
      { name: "Brittany Mitchell", seniority: 11353, sub: "X-Ray-WRM" },
      { name: "Olivia Speziale", seniority: 13166, sub: "X-Ray-WRM", quals: ["IR", "XM", "XO"] },
      { name: "Sydney Savauge", seniority: 13271, sub: "X-Ray-WRM", quals: ["I"] },
      { name: "Laura Schoof", seniority: 13311, sub: "X-Ray-WRM", quals: ["IR", "XM", "XO"] },
      { name: "Misaed Naderi", seniority: 15228, sub: "X-Ray-WRM", quals: ["XM"] },
      { name: "Rasha Eldemiry", seniority: 14829, sub: "X-Ray-WRM" },
      { name: "Rosy Ingalls", seniority: 0, sub: "X-Ray-WRM" },
      // Casual WRM
      { name: "Laura McNamara", seniority: 0, sub: "Casual-WRM" },
    ];

    const wrmWorkerIds: Id<"workers">[] = [];
    for (const w of wrmWorkers) {
      const id = await ctx.db.insert("workers", {
        name: w.name,
        seniorityNumber: w.seniority || undefined,
        departmentId: wrmId,
        subDepartment: w.sub,
        role: "WRM",
        qualifications: w.quals,
        email: `${w.name.split(" ")[1]?.toLowerCase() || w.name.split(" ")[0].toLowerCase()}@hospital.dev`,
        isClerk: false,
      });
      wrmWorkerIds.push(id);
    }

    // --- WRO Workers ---
    const wroWorkers: WorkerDef[] = [
      { name: "Tania Babister", seniority: 10707, sub: "X-Ray-WRO" },
      { name: "Larry Guitar", seniority: 10631, sub: "X-Ray-WRO" },
      { name: "Caroline Vasic", seniority: 10748, sub: "X-Ray-WRO" },
      { name: "Melissa Miller", seniority: 10945, sub: "X-Ray-WRO" },
      { name: "Jennifer Faber", seniority: 10946, sub: "X-Ray-WRO" },
      { name: "Sharon Timpson", seniority: 11215, sub: "X-Ray-WRO" },
      { name: "Katie Deschamps", seniority: 11088, sub: "X-Ray-WRO" },
      { name: "Jose Martinez", seniority: 11757, sub: "X-Ray-WRO" },
      { name: "Brittney Drouillard", seniority: 12450, sub: "X-Ray-WRO", quals: ["IR"] },
      { name: "Katelyn Shanahan", seniority: 12500, sub: "X-Ray-WRO" },
      { name: "Chantel Pereira", seniority: 11812, sub: "X-Ray-WRO" },
      { name: "Lauren Tienhaara", seniority: 12764, sub: "X-Ray-WRO" },
      { name: "Mallory Thompson", seniority: 0, sub: "X-Ray-WRO", quals: ["B"] },
      { name: "Tonya Valleau", seniority: 15122, sub: "X-Ray-WRO", quals: ["B"] },
      { name: "Jennifer Thompson", seniority: 15299, sub: "X-Ray-WRO", quals: ["B"] },
      { name: "Cheyne Skirving", seniority: 15249, sub: "X-Ray-WRO", quals: ["B"] },
      { name: "Brent McDonald", seniority: 0, sub: "X-Ray-WRO", quals: ["B"] },
      { name: "Jonathan Vo", seniority: 0, sub: "X-Ray-WRO", quals: ["B"] },
      { name: "Rachel Laporte", seniority: 0, sub: "X-Ray-WRO", quals: ["XO"] },
    ];

    const wroWorkerIds: Id<"workers">[] = [];
    for (const w of wroWorkers) {
      const id = await ctx.db.insert("workers", {
        name: w.name,
        seniorityNumber: w.seniority || undefined,
        departmentId: wroId,
        subDepartment: w.sub,
        role: "WRO",
        qualifications: w.quals,
        email: `${w.name.split(" ")[1]?.toLowerCase() || w.name.split(" ")[0].toLowerCase()}@hospital.dev`,
        isClerk: false,
      });
      wroWorkerIds.push(id);
    }

    // --- Clerk ---
    await ctx.db.insert("workers", {
      name: "Schedule Clerk",
      departmentId: wrmId,
      subDepartment: "Admin",
      role: "clerk",
      email: "clerk@hospital.dev",
      isClerk: true,
    });

    // --- Shift generation ---
    const wrmShiftCodes = ["7-3 M", "3-11 M", "11-7 M", "8-4 M", "4-12 M", "9-5 M", "6-2 M", "2300 M", "RP 7:30", "XA 8-4"];
    const wroShiftCodes = ["3-11 O", "6-2 O", "7:30 O", "10-6 O", "7-3 O", "8-4 O", "9-5 O", "2300 O", "RP 7:00", "CL 7:00"];
    const offCodes = ["VN", "SK", "ML", "HO"];

    function getDateStr(startDate: string, dayOffset: number): string {
      const d = new Date(startDate);
      d.setDate(d.getDate() + dayOffset);
      return d.toISOString().split("T")[0];
    }

    // WRM shifts — some days have no shift (empty cell), some are vacant
    for (let day = 0; day < 14; day++) {
      const date = getDateStr("2024-10-12", day);
      const dayOfWeek = new Date(date + "T12:00:00").getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      for (let w = 0; w < wrmWorkerIds.length; w++) {
        // ~15% chance of no shift (empty cell) on weekends for some workers
        if (isWeekend && (w + day) % 7 === 0) continue;
        // Casual workers only work ~40% of days
        if (wrmWorkers[w].sub === "Casual-WRM" && (day % 5 !== 0 && day % 5 !== 3)) continue;

        let code: string;
        let isVacant = false;

        if (isWeekend && w % 4 === 0) {
          code = offCodes[day % offCodes.length];
        } else if (w === 3 && day === 5) {
          code = "Call";
        } else {
          code = wrmShiftCodes[(w + day) % wrmShiftCodes.length];
        }

        // Mark a few shifts as vacant
        if ((w === 1 && day >= 10) || (w === 10 && day === 7)) {
          isVacant = true;
        }

        await ctx.db.insert("shifts", {
          workerId: wrmWorkerIds[w],
          schedulePeriodId: periodId,
          shiftDate: date,
          shiftCode: code,
          departmentId: wrmId,
          isVacant,
        });
      }
    }

    // WRO shifts
    for (let day = 0; day < 14; day++) {
      const date = getDateStr("2024-10-12", day);
      const dayOfWeek = new Date(date + "T12:00:00").getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      for (let w = 0; w < wroWorkerIds.length; w++) {
        // ~10% empty cells
        if (isWeekend && (w + day) % 9 === 0) continue;

        let code: string;
        let isVacant = false;

        if (isWeekend && w % 5 === 0) {
          code = offCodes[(day + w) % offCodes.length];
        } else if (w === 7 && day === 3) {
          code = "Call";
        } else {
          code = wroShiftCodes[(w + day) % wroShiftCodes.length];
        }

        // Mark some WRO shifts as vacant
        if ((w === 5 && day >= 8 && day <= 10) || (w === 14 && day === 2)) {
          isVacant = true;
        }

        await ctx.db.insert("shifts", {
          workerId: wroWorkerIds[w],
          schedulePeriodId: periodId,
          shiftDate: date,
          shiftCode: code,
          departmentId: wroId,
          isVacant,
        });
      }
    }
  },
});
