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

const CARD = 'border-2 border-black shadow-[4px_4px_0_#000]'
const BTN =
  'border-2 border-black bg-[#ffd60a] font-bold shadow-[3px_3px_0_#000] ' +
  'transition-transform active:translate-x-[3px] active:translate-y-[3px] active:shadow-none'

const TIER_NUM = { One: 1, Two: 2, Three: 3 }

const TABS = [
  ['habits', 'Habits'],
  ['clips', 'Stash'],
]

export default function App() {
  const [state, setState] = useState(null)
  const [rewardLog, setRewardLog] = useState([])
  const [view, setView] = useState('home')
  const [tab, setTab] = useState('habits')
  const [casino, setCasino] = useState(null)
  const [newName, setNewName] = useState('')
  const [newMins, setNewMins] = useState('')

  const refresh = () =>
    Promise.all([invoke('game_state'), invoke('reward_log')]).then(
      ([s, log]) => {
        setState(s)
        setRewardLog(log)
      }
    )
  useEffect(() => {
    refresh()
  }, [])

  async function complete(i) {
    const res = await invoke('complete_habit', { index: i })
    const grabbed = res.Normal ? res.Normal.clip : null
    await refresh()
    setCasino({ name: state.habits[i].name, grabbed })
    setView('casino')
  }

  async function addHabit() {
    const name = newName.trim()
    if (!name) return
    await invoke('add_habit', {
      name,
      repeatMins: newMins ? Number(newMins) : null,
    })
    setNewName('')
    setNewMins('')
    refresh()
  }

  async function removeHabit(i) {
    await invoke('remove_habit', { index: i })
    refresh()
  }

  async function useReward(id) {
    await invoke('use_reward', { id })
    refresh()
  }

  if (!state) {
    return (
      <div className="flex h-screen items-center justify-center font-mono">
        Loading...
      </div>
    )
  }

  if (view === 'casino') {
    return (
      <Casino
        state={state}
        casino={casino}
        onHome={() => {
          setCasino(null)
          setView('home')
          refresh()
        }}
      />
    )
  }

  const totalDone = state.habits.reduce((n, h) => n + h.completions, 0)
  const totalClips = Object.values(state.inventory).reduce((a, b) => a + b, 0)
  const pending = rewardLog.filter((r) => !r.used)
  const used = rewardLog.filter((r) => r.used)

  return (
    <div className="flex h-screen flex-col bg-[#faf3e0] p-4 font-mono">
      {/* nav */}
      <div className={`${CARD} mb-4 flex bg-white`}>
        {TABS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 px-4 py-2 text-sm font-bold uppercase ${
              tab === id ? 'bg-[#ffd60a]' : ''
            }`}
          >
            Your {label}
          </button>
        ))}
      </div>

      {tab === 'habits' && (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          <div className="flex flex-col gap-2">
            <div className="text-sm font-bold uppercase">Your Habits</div>
            {state.habits.map((h, i) => (
            <div key={i} className={`${CARD} bg-white flex items-center gap-2 p-2`}>
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold">{h.name}</div>
                <div className="text-xs text-gray-500">
                  {h.completions} done
                  {h.repeat_mins ? ` · every ${h.repeat_mins} min` : ''}
                </div>
              </div>
              <button
                className={`${BTN} px-4 py-1 text-sm`}
                onClick={() => complete(i)}
              >
                Done
              </button>
              <button
                className="text-lg leading-none text-gray-400 hover:text-black"
                title="Remove"
                onClick={() => removeHabit(i)}
              >
                ×
              </button>
            </div>
          ))}
          <div className={`${CARD} flex gap-1 bg-white p-2`}>
            <input
              className="min-w-0 flex-1 border-2 border-black px-2 py-1 text-sm"
              placeholder="New habit"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addHabit()}
            />
            <input
              className="w-20 border-2 border-black px-2 py-1 text-sm"
              placeholder="mins"
              inputMode="numeric"
              value={newMins}
              onChange={(e) => setNewMins(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && addHabit()}
            />
            <button className={`${BTN} px-4 py-1 text-sm`} onClick={addHabit}>
              Add
            </button>
          </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-sm font-bold uppercase">Your Stats</div>
            <div className="grid grid-cols-4 gap-3">
              {[
                ['Habits done', totalDone],
                ['Clips in wallet', totalClips],
                ['Rewards banked', rewardLog.length],
                ['Rewards used', used.length],
              ].map(([label, n]) => (
                <div key={label} className={`${CARD} bg-white p-3 text-center`}>
                  <div className="text-3xl font-black">{n}</div>
                  <div className="text-xs uppercase text-gray-500">{label}</div>
                </div>
              ))}
            </div>
            <div className={`${CARD} bg-white p-3`}>
              {state.habits.map((h) => (
                <div key={h.name} className="flex justify-between py-1 text-sm">
                  <span className="truncate">{h.name}</span>
                  <span className="font-bold">{h.completions}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'clips' && (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          <div className="flex flex-col gap-3">
            <div className="text-sm font-bold uppercase">Your Clips</div>
            {Object.entries(state.inventory).length === 0 && (
              <div className={`${CARD} bg-white p-6 text-center text-gray-400`}>
                empty — go do a habit
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(state.inventory).map(([clip, count]) => (
                <div key={clip} className={`${CARD} bg-white p-4 text-center`}>
                  <div
                    className="mx-auto h-10 w-10 border-2 border-black"
                    style={{ background: CLIPS[clip] }}
                  />
                  <div className="mt-2 font-bold">{clip}</div>
                  <div className="text-2xl font-black">×{count}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-sm font-bold uppercase">Your Rewards</div>
            {pending.length === 0 && used.length === 0 && (
              <div className={`${CARD} bg-white p-6 text-center text-gray-400`}>
                no rewards yet — spin the wheel
              </div>
            )}
            {pending.map((r) => (
              <div key={r.id} className={`${CARD} bg-white flex items-center gap-3 p-2`}>
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{r.reward.title}</div>
                  <div className="text-xs text-gray-500">
                    {r.reward.duration} min · {r.reward.description}
                  </div>
                </div>
                <button className={`${BTN} px-3 py-1 text-sm`} onClick={() => useReward(r.id)}>
                  Used
                </button>
              </div>
            ))}
            {used.length > 0 && (
              <div className="mt-2 text-xs font-bold uppercase text-gray-400">
                Used
              </div>
            )}
            {used.map((r) => (
              <div
                key={r.id}
                className={`${CARD} flex items-center gap-3 bg-gray-100 p-2 opacity-60`}
              >
                <div className="min-w-0 flex-1 line-through">
                  <div className="font-bold">{r.reward.title}</div>
                </div>
                <span className="text-xs uppercase text-gray-400">used</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Casino({ state, casino, onHome }) {
  const [tier, setTier] = useState('One')
  const [reels, setReels] = useState(['Gold', 'Gold', 'Gold'])
  const [frozen, setFrozen] = useState(3)
  const [spinning, setSpinning] = useState(false)
  const [outcome, setOutcome] = useState(null)
  const [error, setError] = useState(null)

  async function spin() {
    setError(null)
    setOutcome(null)
    setSpinning(true)
    setFrozen(3)
    const iv = setInterval(() => {
      setReels((r) => r.map((c, i) => (i < frozen ? c : randomClip())))
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

    setTimeout(() => setFrozen(1), 900)
    setTimeout(() => setFrozen(2), 1300)
    setTimeout(() => {
      setFrozen(3)
      setOutcome(oc)
      setSpinning(false)
      if (oc.result.Bonus == null) setTimeout(onHome, 3000)
    }, 1700)
  }

  const resultLine =
    outcome?.result === 'Jackpot'
      ? `JACKPOT! ${outcome.reward.title}`
      : outcome?.result?.Bonus != null
        ? 'BONUS SPIN! Your next spin is upgraded'
        : outcome?.result?.Reward != null
          ? outcome.reward.title
          : null

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[#faf3e0] p-4 font-mono">
      <div className="text-lg font-bold uppercase">
        {casino.name} — casino time
      </div>
      {casino.grabbed && (
        <div className="flex items-center gap-2 text-sm">
          you grabbed
          <span
            className="inline-block h-4 w-4 border-2 border-black"
            style={{ background: CLIPS[casino.grabbed] }}
          />
          <span className="font-bold">{casino.grabbed}</span>
        </div>
      )}

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

      {!outcome && !spinning && (
        <>
          <div className="flex gap-3">
            {state.tiers.map((t) => {
              const cost = tierCost(state.inventory, t)
              const ok = state.tiers.includes(t)
              return (
                <button
                  key={t}
                  disabled={!ok}
                  onClick={() => setTier(t)}
                  className={`${CARD} flex flex-col items-center gap-2 px-4 py-3 ${
                    tier === t ? 'bg-[#ffd60a]' : ok ? 'bg-white' : 'bg-gray-200 opacity-50'
                  }`}
                >
                  <div className="text-2xl font-black">T{TIER_NUM[t]}</div>
                  <div className="text-xs font-bold">
                    {t === 'One' ? 'FREE' : 'UPGRADE'}
                  </div>
                  <div className="flex h-5 items-center gap-1">
                    {cost.map(([c, n]) => (
                      <span key={c} className="flex items-center gap-0.5">
                        <span
                          className="inline-block h-3 w-3 border border-black"
                          style={{ background: CLIPS[c] }}
                        />
                        <span className="text-[10px] font-bold">×{n}</span>
                      </span>
                    ))}
                    {t === 'One' && <span className="text-[10px]">—</span>}
                  </div>
                </button>
              )
            })}
          </div>

          <button
            className={`${BTN} px-10 py-3 text-2xl uppercase tracking-widest`}
            disabled={spinning}
            onClick={spin}
          >
            SPIN
          </button>
        </>
      )}

      {spinning && <div className="text-xl font-bold">...</div>}

      {resultLine && (
        <div className={`${CARD} bg-[#ffd60a] px-6 py-4 text-center text-lg font-bold`}>
          {resultLine}
          {outcome.reward && (
            <div className="mt-1 text-xs font-normal">
              {outcome.reward.description}
            </div>
          )}
        </div>
      )}
      {outcome?.result?.Bonus != null && (
        <button className={`${BTN} px-6 py-2`} onClick={onHome}>
          Back
        </button>
      )}
      {error && (
        <div className={`${CARD} bg-[#e63946] px-6 py-4 font-bold text-white`}>
          {error}
        </div>
      )}
    </div>
  )
}

function tierCost(inventory, t) {
  if (t === 'Two') {
    return Object.entries(inventory)
      .filter(([, n]) => n >= 2)
      .map(([c]) => [c, 2])
  }
  if (t === 'Three') {
    if ((inventory.Gold ?? 0) > 0) return [['Gold', 1]]
    return Object.entries(inventory)
      .filter(([c, n]) => c !== 'Gold' && n >= 3)
      .map(([c]) => [c, 3])
  }
  return []
}

function randomClip() {
  const names = Object.keys(CLIPS)
  return names[Math.floor(Math.random() * names.length)]
}
