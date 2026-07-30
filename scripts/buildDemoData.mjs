import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const names = [
  "daily_earnings.csv",
  "earned_wage_advances.csv",
  "recurring_obligations.csv",
  "transactions.csv",
  "weekly_cashflow_summary.csv",
  "workers.csv",
];

const number = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const date = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const median = (values) => {
  const valid = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!valid.length) return 0;
  const middle = Math.floor(valid.length / 2);
  return valid.length % 2
    ? valid[middle]
    : (valid[middle - 1] + valid[middle]) / 2;
};

const round = (value, places = 2) => {
  const scale = 10 ** places;
  return Math.round((value + Number.EPSILON) * scale) / scale;
};

async function locate(name) {
  const candidates = [path.join(root, "data", name), path.join("/mnt/data", name)];
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next supported dataset location.
    }
  }
  throw new Error(
    `Missing ${name}. Copy all six source CSVs into ${path.join(root, "data")} or /mnt/data.`,
  );
}

async function load(name) {
  const source = await locate(name);
  const contents = await readFile(source, "utf8");
  return parse(contents, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true,
  });
}

const [
  earnings,
  advances,
  obligations,
  transactions,
  weeklySummaries,
  workers,
] = await Promise.all(names.map(load));

const extractLinkedId = (notes, key) => {
  if (typeof notes !== "string") return null;
  return notes.match(new RegExp(`(?:^|[;\\s])${key}=([^;\\s,]+)`))?.[1] ?? null;
};

const earningsById = new Map(earnings.map((row) => [row.earnings_id, row]));
const workerById = new Map(workers.map((row) => [row.worker_id, row]));
const incomeTransactions = transactions
  .filter((row) => row.direction === "credit" && row.category === "income")
  .map((row) => ({
    ...row,
    parsedAt: date(row.txn_ts),
    linkedEarningsId: extractLinkedId(row.notes, "linked_earnings_id"),
  }))
  .filter((row) => row.parsedAt);

const transactionsByWorker = new Map();
for (const transaction of incomeTransactions) {
  const list = transactionsByWorker.get(transaction.worker_id) ?? [];
  list.push(transaction);
  transactionsByWorker.set(transaction.worker_id, list);
}
for (const list of transactionsByWorker.values()) {
  list.sort((a, b) => a.parsedAt - b.parsedAt);
}

const matchedPayouts = incomeTransactions
  .map((transaction) => {
    const earning = earningsById.get(transaction.linkedEarningsId);
    if (!earning) return null;
    const payoutDay = date(`${earning.work_date}T00:00:00`);
    if (!payoutDay) return null;
    const delayMinutes = Math.round(
      (transaction.parsedAt.getTime() - payoutDay.getTime()) / 60_000,
    );
    if (delayMinutes < 0 || delayMinutes > 7 * 24 * 60) return null;
    return { transaction, earning, delayMinutes };
  })
  .filter(Boolean);

function findFallbackScenario() {
  for (const advance of advances) {
    const requestedAt = date(advance.requested_at);
    const amount = number(advance.amount_cad);
    const fee = number(advance.fee_cad);
    if (!requestedAt || amount <= 0 || fee <= 0) continue;
    const deposit = (transactionsByWorker.get(advance.worker_id) ?? []).find((txn) => {
      const wait = txn.parsedAt.getTime() - requestedAt.getTime();
      return wait > 0 && wait <= 24 * 60 * 60 * 1000 && number(txn.amount_cad) >= amount;
    });
    if (!deposit) continue;
    const earning = earningsById.get(deposit.linkedEarningsId);
    if (earning) return { advance, deposit, earning };
  }
  return null;
}

const preferredAdvance = advances.find((row) => row.advance_id === "A-00498");
const preferredDeposit = incomeTransactions.find((row) => row.txn_id === "T-0029495");
const preferredEarning = earningsById.get("E-011418");
const preferredIsLinked =
  preferredAdvance &&
  preferredDeposit &&
  preferredEarning &&
  preferredAdvance.worker_id === preferredDeposit.worker_id &&
  preferredDeposit.linkedEarningsId === preferredEarning.earnings_id;

const scenario = preferredIsLinked
  ? {
      advance: preferredAdvance,
      deposit: preferredDeposit,
      earning: preferredEarning,
    }
  : findFallbackScenario();

if (!scenario) {
  throw new Error(
    "No suitable replay found: expected a paid advance followed by a sufficient linked income deposit within 24 hours.",
  );
}

const replayStart = date(scenario.advance.requested_at);
const replayEnd = scenario.deposit.parsedAt;
if (!replayStart || !replayEnd) {
  throw new Error("The selected replay contains a missing or malformed date.");
}

const worker = workerById.get(scenario.advance.worker_id);
if (!worker) throw new Error(`Missing worker ${scenario.advance.worker_id}.`);

const workerEarnings = earnings.filter((row) => row.worker_id === worker.worker_id);
const hourlyRates = workerEarnings
  .map((row) => {
    const hours = number(row.hours_worked);
    return hours > 0 ? number(row.net_pay_cad) / hours : NaN;
  })
  .filter(Number.isFinite);

const workerAdvances = advances.filter((row) => row.worker_id === worker.worker_id);
const feeRates = workerAdvances
  .map((row) => {
    const amount = number(row.amount_cad);
    return amount > 0 ? number(row.fee_cad) / amount : NaN;
  })
  .filter(Number.isFinite);

const replayMinuteOfDay = replayStart.getHours() * 60 + replayStart.getMinutes();
const predictionSamples = matchedPayouts
  .filter(({ transaction }) => transaction.worker_id === worker.worker_id)
  .map(({ transaction, earning, delayMinutes }) => {
    const depositMinuteOfDay =
      transaction.parsedAt.getHours() * 60 + transaction.parsedAt.getMinutes();
    return {
      workerId: earning.worker_id,
      employerId: earning.employer_id,
      paymentMethod: earning.pay_method,
      depositTransactionId: transaction.txn_id,
      delayFromWorkdayStartMinutes: delayMinutes,
      delayFromReplayCheckpointMinutes:
        depositMinuteOfDay >= replayMinuteOfDay
          ? depositMinuteOfDay - replayMinuteOfDay
          : null,
    };
  });

const predictionFallbacks = [
  {
    level: "worker_employer_payment_method",
    values: predictionSamples.filter(
      (sample) =>
        sample.workerId === worker.worker_id &&
        sample.employerId === scenario.earning.employer_id &&
        sample.paymentMethod === scenario.earning.pay_method &&
        sample.delayFromReplayCheckpointMinutes !== null,
    ),
  },
  {
    level: "worker_payment_method",
    values: predictionSamples.filter(
      (sample) =>
        sample.workerId === worker.worker_id &&
        sample.paymentMethod === scenario.earning.pay_method &&
        sample.delayFromReplayCheckpointMinutes !== null,
    ),
  },
  {
    level: "worker",
    values: predictionSamples.filter(
      (sample) =>
        sample.workerId === worker.worker_id &&
        sample.delayFromReplayCheckpointMinutes !== null,
    ),
  },
  {
    level: "payment_method",
    values: matchedPayouts
      .filter(({ earning, transaction }) => {
        const depositMinute =
          transaction.parsedAt.getHours() * 60 + transaction.parsedAt.getMinutes();
        return earning.pay_method === scenario.earning.pay_method && depositMinute >= replayMinuteOfDay;
      })
      .map(({ transaction }) => ({
        delayFromReplayCheckpointMinutes:
          transaction.parsedAt.getHours() * 60 +
          transaction.parsedAt.getMinutes() -
          replayMinuteOfDay,
      })),
  },
  {
    level: "global",
    values: matchedPayouts
      .filter(({ transaction }) => {
        const depositMinute =
          transaction.parsedAt.getHours() * 60 + transaction.parsedAt.getMinutes();
        return depositMinute >= replayMinuteOfDay;
      })
      .map(({ transaction }) => ({
        delayFromReplayCheckpointMinutes:
          transaction.parsedAt.getHours() * 60 +
          transaction.parsedAt.getMinutes() -
          replayMinuteOfDay,
      })),
  },
];

const selectedPrediction =
  predictionFallbacks.find((group) => group.values.length > 0) ??
  predictionFallbacks[predictionFallbacks.length - 1];
const predictionCount = selectedPrediction.values.length;
const historicalPredictionMinutes = Math.round(
  median(
    selectedPrediction.values.map(
      (sample) => sample.delayFromReplayCheckpointMinutes,
    ),
  ),
);

function nextDueDate(obligation, after) {
  const dueDay = Math.max(1, Math.min(28, Math.trunc(number(obligation.due_day_of_month))));
  if (!dueDay) return null;
  let candidate = new Date(
    after.getFullYear(),
    after.getMonth(),
    dueDay,
    9,
    0,
    0,
  );
  if (candidate <= after) {
    candidate = new Date(
      after.getFullYear(),
      after.getMonth() + 1,
      dueDay,
      9,
      0,
      0,
    );
  }
  return candidate;
}

const nextEssential = obligations
  .filter((row) => row.worker_id === worker.worker_id && String(row.essential) === "1")
  .map((row) => ({ row, dueAt: nextDueDate(row, replayStart) }))
  .filter((entry) => entry.dueAt)
  .sort((a, b) => a.dueAt - b.dueAt)[0];

let sufficientWithin24h = 0;
let eligibleAdvanceCount = 0;
const minutesToNextIncome = [];
for (const advance of advances) {
  const requestedAt = date(advance.requested_at);
  const amount = number(advance.amount_cad);
  if (!requestedAt || amount <= 0) continue;
  eligibleAdvanceCount += 1;
  const nextIncome = (transactionsByWorker.get(advance.worker_id) ?? []).find(
    (txn) => txn.parsedAt > requestedAt,
  );
  if (!nextIncome) continue;
  const waitMinutes = (nextIncome.parsedAt.getTime() - requestedAt.getTime()) / 60_000;
  minutesToNextIncome.push(waitMinutes);
  if (waitMinutes <= 24 * 60 && number(nextIncome.amount_cad) >= amount) {
    sufficientWithin24h += 1;
  }
}

const actualWaitMinutes = Math.max(
  0,
  Math.round((replayEnd.getTime() - replayStart.getTime()) / 60_000),
);
const advanceAmount = Math.max(0, number(scenario.advance.amount_cad));
const advanceFee = Math.max(0, number(scenario.advance.fee_cad));
const pendingPay = Math.max(0, number(scenario.earning.net_pay_cad));

const generated = {
  generatedAt: new Date().toISOString(),
  source: {
    scenarioType: preferredIsLinked ? "preferred" : "automatic_fallback",
    replayLabel: "Historical replay",
    recordCounts: {
      earnings: earnings.length,
      advances: advances.length,
      obligations: obligations.length,
      transactions: transactions.length,
      weeklySummaries: weeklySummaries.length,
      workers: workers.length,
      matchedPayouts: matchedPayouts.length,
    },
  },
  worker: {
    id: worker.worker_id,
    occupation: worker.occupation,
    city: worker.city,
    province: worker.province,
    medianHourlyNetCad: round(median(hourlyRates)),
    historicalMedianAdvanceFeeRate: round(median(feeRates), 4),
  },
  replay: {
    startedAt: replayStart.toISOString(),
    depositAt: replayEnd.toISOString(),
    actualWaitMinutes,
    needReason: scenario.advance.reason_code || "essential need",
    needAmountCad: advanceAmount,
    availableNowAssumptionCad: 0,
    pendingPayCad: pendingPay,
    advanceFeeCad: advanceFee,
    advanceId: scenario.advance.advance_id,
    earningsId: scenario.earning.earnings_id,
    depositTransactionId: scenario.deposit.txn_id,
    employerId: scenario.earning.employer_id,
    paymentMethod: scenario.earning.pay_method,
  },
  payoutEstimate: {
    expectedDelayMinutes: historicalPredictionMinutes,
    supportCount: predictionCount,
    confidence:
      predictionCount >= 8 ? "High" : predictionCount >= 3 ? "Medium" : "Low",
    fallbackLevel: selectedPrediction.level,
    note: "Median of matched income deposits arriving after the 5:04 p.m. replay checkpoint; the replay itself uses the actual historical arrival.",
  },
  nextEssentialObligation: nextEssential
    ? {
        id: nextEssential.row.obligation_id,
        name: nextEssential.row.name,
        category: nextEssential.row.category,
        amountCad: number(nextEssential.row.amount_cad),
        dueAt: nextEssential.dueAt.toISOString(),
      }
    : null,
  insights: {
    advancesFollowedBySufficientPayWithin24HoursPct: round(
      eligibleAdvanceCount ? (sufficientWithin24h / eligibleAdvanceCount) * 100 : 0,
      1,
    ),
    medianMinutesToNextIncomeDeposit: Math.round(median(minutesToNextIncome)),
    totalObservedAdvanceFeesCad: round(
      advances.reduce((sum, row) => sum + Math.max(0, number(row.fee_cad)), 0),
    ),
    eligibleAdvanceCount,
  },
};

await mkdir(path.join(root, "src", "data"), { recursive: true });
await writeFile(
  path.join(root, "src", "data", "generatedDemo.json"),
  `${JSON.stringify(generated, null, 2)}\n`,
);

console.log(
  `Prepared ${generated.source.scenarioType} replay ${generated.replay.advanceId}: ` +
    `$${generated.replay.pendingPayCad.toFixed(2)} arrived ${generated.replay.actualWaitMinutes} minutes after request.`,
);
console.log(
  `Matched ${generated.source.recordCounts.matchedPayouts} earnings deposits and wrote src/data/generatedDemo.json.`,
);
