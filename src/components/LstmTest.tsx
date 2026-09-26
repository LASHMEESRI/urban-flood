import { useState } from "react";
import {
  predictNextWaterLevel,
  type LstmPrediction,
} from "../services/lstmService";
import {
  loadLstmSequences,
  prepareLstmInput,
  type LstmSequenceRecord,
} from "../services/lstmDataService";

export default function LstmTest() {
  const [prediction, setPrediction] = useState<LstmPrediction | null>(null);
  const [sequence, setSequence] = useState<LstmSequenceRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(false);

  async function runPrediction() {
    setLoading(true);
    setError("");

    try {
      const sequences = await loadLstmSequences();

      if (sequences.length === 0) {
        throw new Error("No Chennai LSTM sequences available");
      }

      const selectedSequence = sequences[0];
      const input = prepareLstmInput(selectedSequence);
      const result = await predictNextWaterLevel(input);

      setSequence(selectedSequence);
      setPrediction(result);
      setDetails(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "LSTM prediction failed");
    } finally {
      setLoading(false);
    }
  }

  /* Hidden state: only a small tab is visible */
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Open LSTM forecast"
        aria-label="Open LSTM forecast"
        className="fixed left-0 top-[55%] z-[9999] flex h-12 w-8 -translate-y-1/2 items-center justify-center rounded-r-xl border border-white/20 bg-slate-950/95 text-white shadow-xl backdrop-blur-md transition-all hover:w-10 hover:bg-slate-900"
      >
        <span className="text-xl font-bold">&gt;</span>
      </button>
    );
  }

  return (
    <div className="fixed left-4 top-[55%] z-[9999] w-[290px] -translate-y-1/2 text-white">
      <div className="overflow-hidden rounded-2xl border border-white/15 bg-slate-950/95 shadow-2xl backdrop-blur-md">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />

            <div>
              <div className="text-sm font-semibold">LSTM Forecast</div>

              <div className="text-[10px] text-slate-400">
                Next-hour water level
              </div>
            </div>
          </div>

          <button
            onClick={() => setOpen(false)}
            title="Hide LSTM forecast"
            aria-label="Hide LSTM forecast"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            &lt;
          </button>
        </div>

        {/* Prediction */}
        <div className="px-4 py-3">
          {prediction ? (
            <>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                Predicted water level
              </div>

              <div className="mt-1 flex items-end justify-between">
                <div className="text-2xl font-bold">
                  {prediction.predicted_water_level_m.toFixed(4)}
                  <span className="ml-1 text-sm font-medium text-slate-400">
                    m
                  </span>
                </div>

                <div className="rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-300">
                  +1 hour
                </div>
              </div>

              <button
                onClick={() => setDetails((prev) => !prev)}
                className="mt-3 w-full rounded-lg border border-white/10 px-3 py-2 text-[10px] font-medium text-slate-300 transition hover:bg-white/5"
              >
                {details ? "Hide Details" : "View Details"}
              </button>
            </>
          ) : (
            <>
              <div className="text-xs leading-relaxed text-slate-400">
                Forecast the next-hour water level using the Chennai historical
                LSTM model.
              </div>

              <button
                onClick={runPrediction}
                disabled={loading}
                className="mt-3 w-full rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-semibold transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Running LSTM..." : "Run LSTM Forecast"}
              </button>
            </>
          )}
        </div>

        {/* Details */}
        {details && sequence && prediction && (
          <div className="border-t border-white/10 px-4 py-3">
            <div className="rounded-xl bg-white/5 p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">
                Historical input
              </div>

              <div className="mt-1 text-xs font-medium text-white">
                {sequence.input_start}
              </div>

              <div className="text-[10px] text-slate-400">
                to {sequence.input_end}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] text-slate-500">Actual</div>

                  <div className="text-sm font-semibold text-white">
                    {sequence.target_water_level.toFixed(3)} m
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-500">LSTM</div>

                  <div className="text-sm font-semibold text-emerald-300">
                    {prediction.predicted_water_level_m.toFixed(4)} m
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-white/5 p-2">
                <div className="text-[9px] text-slate-500">Model</div>

                <div className="mt-0.5 text-xs font-medium">LSTM</div>
              </div>

              <div className="rounded-lg bg-white/5 p-2">
                <div className="text-[9px] text-slate-500">Horizon</div>

                <div className="mt-0.5 text-xs font-medium">+1 hour</div>
              </div>
            </div>

            <div className="mt-3 text-[9px] leading-relaxed text-slate-500">
              Experimental temporal forecasting model using historical Chennai
              rainfall and water-level sequences.
            </div>

            <button
              onClick={runPrediction}
              disabled={loading}
              className="mt-3 w-full rounded-lg border border-white/10 px-3 py-2 text-[10px] font-medium text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
            >
              {loading ? "Running..." : "Run Again"}
            </button>
          </div>
        )}

        {error && (
          <div className="border-t border-red-500/20 bg-red-950/60 px-4 py-3 text-[10px] text-red-300">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
