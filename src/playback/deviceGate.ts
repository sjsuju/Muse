interface WaitingDevice {
  resolve: (deviceId: string) => void
  reject: (error: Error) => void
  timeout: ReturnType<typeof setTimeout>
}

export function createDeviceGate(timeoutMs = 10_000) {
  let deviceId: string | null = null
  const waiting = new Set<WaitingDevice>()

  const fail = (message: string) => {
    for (const waiter of waiting) {
      clearTimeout(waiter.timeout)
      waiter.reject(new Error(message))
    }
    waiting.clear()
  }

  return {
    ready(nextDeviceId: string) {
      deviceId = nextDeviceId
      for (const waiter of waiting) {
        clearTimeout(waiter.timeout)
        waiter.resolve(nextDeviceId)
      }
      waiting.clear()
    },
    unavailable() {
      deviceId = null
    },
    wait(): Promise<string> {
      if (deviceId) return Promise.resolve(deviceId)
      return new Promise((resolve, reject) => {
        const waiter: WaitingDevice = {
          resolve,
          reject,
          timeout: setTimeout(() => {
            waiting.delete(waiter)
            reject(new Error('Spotify did not provide a playback device within 10 seconds'))
          }, timeoutMs),
        }
        waiting.add(waiter)
      })
    },
    fail,
    dispose() {
      fail('Spotify playback was disconnected')
    },
  }
}
