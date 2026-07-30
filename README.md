# PayRace

PayRace is a simple daily money planner for gig and daily-wage workers. It answers:

- How much did I earn today?
- How much is in my account?
- What expenses do I need to cover?
- Do I have enough total money?
- If not, how many additional paid hours would close the shortfall?
- If I borrow the shortfall, what fee and repayment would I pay?

Every money value is editable. Expenses can be added, removed, renamed, and re-priced. The app does not ask the worker to predict when pay will arrive or when a spontaneous expense will occur.

The separate **Forecast calendar** uses editable planning assumptions to show projected income and expenses across a monthly calendar. A selected date can be summarized on a daily, weekly, or monthly basis.

## Run it

Requires Node.js 22.13 or newer.

```bash
npm install
npm run prepare-data
npm run typecheck
npm run verify
npx expo start --web
```

For a phone, install Expo Go, run `npx expo start`, and scan the QR code.

## Demo situations

The app includes three one-tap presets:

1. **Everything covered:** $250 is available for $218.74 of expenses.
2. **Money is short:** $179.71 is available, leaving a $39.03 shortfall. At $18.88/hr, about 2.1 additional paid hours closes it. Borrowing $39.03 costs about $2.13 and requires $41.16 repayment.
3. **Unexpected expense:** a spontaneous $120 repair increases the shortfall to $159.03. The app recalculates work hours and borrowing costs immediately.

After choosing a preset, change any input to demonstrate a custom situation.

## Calculation

```text
total money = account balance + earned today
shortfall = max(0, total expenses − total money)
extra work hours = shortfall ÷ take-home hourly pay
loan or advance amount = shortfall
fee = shortfall × historical median fee rate
repayment = shortfall + fee
next pay after repayment = max(0, earned today − repayment)
```

If the total money covers the expense list, the app says no extra work or loan is needed. If money is short, it presents two direct choices:

1. Work the calculated additional paid hours at $0 fee.
2. Borrow exactly the shortfall and see the fee, repayment, and next-pay impact.

The exact historical $85.74 advance uses its observed $4.29 fee. Other amounts use the sample worker’s median historical fee rate.

## Calendar forecast

The Forecast calendar has four editable assumptions:

- Earnings per workday
- Workdays per week
- Monthly bills
- Weekly essentials

Workday earnings appear on scheduled workdays. Monthly bills are placed on the 15th, while weekly essentials are placed on Saturdays so cash-flow pressure is visible on the calendar. Selecting a calendar date and choosing **Daily**, **Weekly**, or **Monthly** recalculates earnings, expenses, net cash flow, and workdays for that period.

If a selected period is negative, the forecast shows the additional work hours or borrowing amount, fee, and repayment that would close the projected gap. These are planning assumptions, not predicted deposit times.

## Data and architecture

- [App.tsx](./App.tsx) contains the mobile calculator and editable expense list.
- [decisionEngine.ts](./src/domain/decisionEngine.ts) contains pure calculation logic.
- [forecastEngine.ts](./src/domain/forecastEngine.ts) builds month projections and period summaries.
- [ForecastCalendar.tsx](./src/components/ForecastCalendar.tsx) renders the separate interactive calendar view.
- [buildDemoData.mjs](./scripts/buildDemoData.mjs) links the six CSV datasets and generates a compact app payload.
- [verifyDecision.ts](./scripts/verifyDecision.ts) tests worker summaries, custom expenses, work hours, and advance costs.

The sample data supplies initial values and evidence; it does not control the user’s editable scenario.

## Ethical limitations

PayRace does not provide financial advice. Working more is presented as an option, not an obligation. A loan or cash advance is never treated as income, and its fee, repayment, and impact on future pay remain visible.

## 60-second demo

1. Show **Earned today**, **In account**, and **Take-home per work hour**.
2. Show the editable expense list and its total.
3. Select **Money is short**: the app reports $39.03 missing.
4. Compare the two choices: 2.1 more paid hours at no fee, or borrow $39.03, pay a $2.13 fee, and repay $41.16.
5. Change groceries from $85.74 to $100; the shortfall, hours, fee, and repayment update instantly.
6. Change the account balance to $100; all expenses become covered.
7. Select **Unexpected expense** to show how a spontaneous $120 cost changes both options.
8. Open **Forecast calendar**, select the 15th, and switch between Daily, Weekly, and Monthly to show how one expense-heavy date affects the larger forecast.
