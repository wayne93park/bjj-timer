import { useEffect, useRef } from 'react'

export function useWakeLock(active) {
  const wakeLockRef = useRef(null)

  useEffect(() => {
    if (!('wakeLock' in navigator)) return

    let cancelled = false

    async function acquire() {
      try {
        const lock = await navigator.wakeLock.request('screen')
        if (cancelled) {
          lock.release().catch(() => {})
          return
        }
        wakeLockRef.current = lock
      } catch {
        wakeLockRef.current = null
      }
    }

    function release() {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {})
        wakeLockRef.current = null
      }
    }

    function handleVisibilityChange() {
      if (active && document.visibilityState === 'visible' && !wakeLockRef.current) {
        acquire()
      }
    }

    if (active) {
      acquire()
    } else {
      release()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      release()
    }
  }, [active])
}
