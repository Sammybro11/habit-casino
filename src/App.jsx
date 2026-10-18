import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'

const CLIPS = {
  Red: '#e63946',
  Blue: '#457b9d',
  Green: '#2a9d8f',
  Yellow: '#e9c46a',
  Purple: '#9b5de5',
  Orange: '#f77f00',
  Gold: '#d4af37',
}

const CARD = 'border-2 border-black bg-white shadow-[4px_4px_0_#000]'
const BTN =
  'border-2 border-black bg-[#ffd60a] font-bold shadow-[3px_3px_0_#000] ' +
  'transition-transform active:translate-x-[3px] active:translate-y-[3px] active:shadow-none'

export default function App() {
  const [state, setState] = useState(null)
  const [tier, setTier] = useState('One')
  const [reels, setReels] = useState(['Gold', 'Gold', 'Gold'])
  const [frozen, setFrozen] = useState(3)
  const [spinning, setSpinning] = useState(false)
  const [outcome, setOutcome] = useState(null)
  const [error, setError] = useState(null)

  const refresh = () => invoke('game_state').then(setState)
  useEffect(() => {
    refresh()
  }, [])

  async function complete() {
    setError(null)
    setOutcome(null)
    const res = await invoke('complete_habit', { index: 0 })
    if (res.Normal) console.log('clip:', res.Normal.clip)
    refresh()
  }

  async function spin() {
    setError(null)
    setOutcome(null)
    setSpinning(true)
    setFrozen(3)
    const iv = setInterval(() => {
      setReels((r) =>
        r.map((c, i) => (i < frozen ? c : randomClip()))
      )
    }, 80)

    let oc
    try {
      oc = await invoke('spin', { tier })
    } catch (e) {
      clearInterval(iv)
      setSpinning(false)
      setFrozen(3)
      setError(String(e))
      return
    }
    clearInterval(iv)

    // reels stop left to right, result revealed when the last one lands
    setTimeout(() => setFrozen(1), 900)
    setTimeout(() => setFrozen(2), 1300)
    setTimeout(() => {
      setFrozen(3)
      setOutcome(oc)
      setSpinning(false)
      refresh()
    }, 1700)
  }

  if (!state) {
    return (
      <div className="flex h-screen items-center justify-center font-mono">
        Loading...
      </div>
    )
  }

  const resultLine =
    outcome?.result?.Jackpot != null
      ? `JACKPOT! ${outcome.reward.title}`
      : outcome?.result?.Bonus
        ? `BONUS SPIN! Next habit is on the house`
        : outcome?.result?.Reward
          ? outcome.reward.title
          : null

  return (
    <div className="flex h-screen flex-col bg-[#faf3e0] p-4 font-mono">
      <div className="flex min-h-0 flex-1 gap-4">
        {/* habits */}
        <div className="flex w-56 flex-col gap-2">
          <div className="text-sm font-bold uppercase">Habits</div>
          {state.habits.map((h, i) => (
            <div key={i} className={`${CARD} flex items-center gap-2 p-2`}>
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold">{h.name}</div>
                <div className="text-xs text-gray-500">
                  {h.completions} done
                </div>
              </div>
              <button className={`${BTN} px-2 py-1 text-sm`} onClick={complete}>
                Done
              </button>
            </div>
          ))}
        </div>

        {/* machine */}
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-6">
          <div className={`${CARD} flex gap-2 bg-[#1c1b29] p-6`}>
            {reels.map((clip, i) => (
              <div
                key={i}
                className={`flex h-24 w-20 items-center justify-center border-2 border-black text-3xl font-black ${
                  i < frozen ? 'bg-white' : 'animate-pulse bg-white'
                }`}
                style={{ color: CLIPS[clip] }}
              >
                {clip[0]}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            {state.tiers.map((t) => (
              <button
                key={t}
                onClick={() => setTier(t)}
                className={`${CARD} px-4 py-2 font-bold ${
                  tier === t ? 'bg-[#ffd60a]' : 'bg-white'
                }`}
              >
                Tier {t}
              </button>
            ))}
          </div>

          <button
            className={`${BTN} px-10 py-3 text-2xl tracking-widest uppercase`}
            disabled={spinning}
            onClick={spin}
          >
            {spinning ? '...' : 'Spin'}
          </button>

          {resultLine && (
            <div className={`${CARD} bg-[#ffd60a] px-6 py-4 text-lg font-bold`}>
              {resultLine}
              {outcome.reward && (
                <div className="mt-1 text-xs font-normal">
                  {outcome.reward.description}
                </div>
              )}
            </div>
          )}
          {error && (
            <div className={`${CARD} bg-[#e63946] px-6 py-4 font-bold text-white`}>
              {error}
            </div>
          )}
        </div>
      </div>

      {/* clip wallet */}
      <div className={`${CARD} mt-4 flex items-center gap-4 bg-white p-3`}>
        <span className="text-sm font-bold uppercase">Clips</span>
        {Object.entries(state.inventory).length === 0 && (
          <span className="text-sm text-gray-400">empty — go do a habit</span>
        )}
        {Object.entries(state.inventory).map(([clip, count]) => (
          <span key={clip} className="flex items-center gap-1 font-bold">
            <span
              className="inline-block h-4 w-4 border border-black"
              style={{ background: CLIPS[clip] }}
            />
            {clip} ×{count}
          </span>
        ))}
      </div>
    </div>
  )
}

function randomClip() {
  const names = Object.keys(CLIPS)
  return names[Math.floor(Math.random() * names.length)]
}
