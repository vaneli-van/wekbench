import { useMemo, useState } from "react"
import { Calculator, RotateCcw } from "lucide-react"
import { landedCost } from "@/lib/data"

function ngn(n: number) {
  return "GH₵" + Math.round(n).toLocaleString("en-GH")
}

export function LandedCostCalculator() {
  const [fxRate, setFxRate] = useState(landedCost.fxRate)
  const [fxBuffer, setFxBuffer] = useState(landedCost.fxBuffer)
  const [margin, setMargin] = useState(landedCost.marginPercent)
  const [duty, setDuty] = useState(landedCost.dutyPercent)

  const calc = useMemo(() => {
    const effectiveFx = fxRate * (1 + fxBuffer / 100)
    const supplierNgn = landedCost.supplierCost * effectiveFx
    const freight = landedCost.freightPerUnit * effectiveFx
    const dutyAmt = (supplierNgn * duty) / 100
    const clearing = landedCost.clearingPerUnit * effectiveFx
    const insurance = (supplierNgn * landedCost.insurancePercent) / 100
    const localDelivery = landedCost.localDeliveryPerUnit * effectiveFx
    const totalCost = supplierNgn + freight + dutyAmt + clearing + insurance + localDelivery
    const marginAmt = (totalCost * margin) / 100
    const sellingPrice = totalCost + marginAmt
    return {
      effectiveFx,
      supplierNgn,
      freight,
      dutyAmt,
      clearing,
      insurance,
      localDelivery,
      totalCost,
      marginAmt,
      sellingPrice,
      lineTotal: sellingPrice * landedCost.quantity,
    }
  }, [fxRate, fxBuffer, margin, duty])

  const reset = () => {
    setFxRate(landedCost.fxRate)
    setFxBuffer(landedCost.fxBuffer)
    setMargin(landedCost.marginPercent)
    setDuty(landedCost.dutyPercent)
  }

  const rows = [
    { label: "Supplier cost (per unit)", value: `$${landedCost.supplierCost} → ${ngn(calc.supplierNgn)}`, note: landedCost.currency },
    { label: "FX rate (USD → GHS)", value: fxRate.toLocaleString(), note: "editable" },
    { label: `FX buffer (${fxBuffer}%)`, value: `Effective ${calc.effectiveFx.toFixed(0)}`, note: "editable" },
    { label: "Freight (per unit)", value: ngn(calc.freight) },
    { label: `Duty (${duty}%)`, value: ngn(calc.dutyAmt), note: "editable" },
    { label: "Clearing (per unit)", value: ngn(calc.clearing) },
    { label: `Insurance (${landedCost.insurancePercent}%)`, value: ngn(calc.insurance) },
    { label: "Local delivery (per unit)", value: ngn(calc.localDelivery) },
  ]

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      {/* Breakdown table */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Calculator className="size-4 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">Landed Cost Breakdown</h3>
          </div>
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3.5" />
            Reset assumptions
          </button>
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.label}>
                <td className="px-5 py-2.5 text-muted-foreground">{r.label}</td>
                <td className="px-5 py-2.5 text-right font-medium tabular-nums text-foreground">{r.value}</td>
                <td className="w-20 px-5 py-2.5 text-right text-xs text-muted-foreground">{r.note ?? ""}</td>
              </tr>
            ))}
            <tr className="bg-muted/40">
              <td className="px-5 py-3 font-medium text-foreground">Total landed cost (per unit)</td>
              <td className="px-5 py-3 text-right font-semibold tabular-nums text-foreground">{ngn(calc.totalCost)}</td>
              <td />
            </tr>
            <tr>
              <td className="px-5 py-2.5 text-muted-foreground">Margin ({margin}%)</td>
              <td className="px-5 py-2.5 text-right font-medium tabular-nums text-success">+{ngn(calc.marginAmt)}</td>
              <td className="px-5 py-2.5 text-right text-xs text-muted-foreground">editable</td>
            </tr>
            <tr className="bg-primary/5">
              <td className="px-5 py-3 font-semibold text-foreground">Final selling price (per unit)</td>
              <td className="px-5 py-3 text-right text-base font-semibold tabular-nums text-primary">
                {ngn(calc.sellingPrice)}
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      {/* Assumptions panel */}
      <aside className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground">Pricing Assumptions</h3>
          <div className="mt-4 space-y-4">
            <Slider label="FX Rate (USD → GHS)" min={1400} max={1800} step={10} value={fxRate} onChange={setFxRate} suffix="" />
            <Slider label="FX Buffer" min={0} max={10} step={0.5} value={fxBuffer} onChange={setFxBuffer} suffix="%" />
            <Slider label="Import Duty" min={0} max={20} step={1} value={duty} onChange={setDuty} suffix="%" />
            <Slider label="Margin" min={5} max={40} step={1} value={margin} onChange={setMargin} suffix="%" />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Quote summary</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Quantity</dt>
              <dd className="font-medium text-foreground">{landedCost.quantity} units</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Selling price / unit</dt>
              <dd className="font-medium text-foreground">{ngn(calc.sellingPrice)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <dt className="font-medium text-foreground">Line total</dt>
              <dd className="font-semibold text-primary">{ngn(calc.lineTotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Delivery timeline</dt>
              <dd className="font-medium text-foreground">{landedCost.deliveryTimeline}</dd>
            </div>
          </dl>
        </div>
      </aside>
    </div>
  )
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
  suffix,
}: {
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
  suffix: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-sm text-muted-foreground">{label}</label>
        <span className="text-sm font-medium tabular-nums text-foreground">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-accent"
      />
    </div>
  )
}
