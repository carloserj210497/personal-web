import './style.css'

const formatUnit = (value: number): string => value.toString().padStart(2, '0')

const initializeCountdown = (countdownPanel: HTMLElement): void => {
  const launchAt = countdownPanel.dataset.launchAt
  const launchLabel = countdownPanel.dataset.launchLabel ?? 'Project'
  const countdown = countdownPanel.querySelector<HTMLElement>('[role="timer"]')
  const countdownStatus = countdownPanel.querySelector<HTMLElement>(
    '[data-countdown-status]',
  )
  const daysElement = countdownPanel.querySelector<HTMLElement>(
    '[data-countdown-days]',
  )
  const hoursElement = countdownPanel.querySelector<HTMLElement>(
    '[data-countdown-hours]',
  )
  const minutesElement = countdownPanel.querySelector<HTMLElement>(
    '[data-countdown-minutes]',
  )
  const secondsElement = countdownPanel.querySelector<HTMLElement>(
    '[data-countdown-seconds]',
  )

  if (
    !launchAt ||
    !countdown ||
    !countdownStatus ||
    !daysElement ||
    !hoursElement ||
    !minutesElement ||
    !secondsElement
  ) {
    return
  }

  const launchTime = new Date(launchAt).getTime()

  if (Number.isNaN(launchTime)) {
    console.warn(`Invalid launch date for ${launchLabel}: ${launchAt}`)
    return
  }

  const updateCountdown = (): boolean => {
    const remainingTime = launchTime - Date.now()

    if (remainingTime <= 0) {
      daysElement.textContent = '00'
      hoursElement.textContent = '00'
      minutesElement.textContent = '00'
      secondsElement.textContent = '00'
      countdownStatus.textContent = `${launchLabel} launched`
      countdown.setAttribute('aria-label', `${launchLabel} launched`)
      countdownPanel.classList.add('is-complete')

      return true
    }

    const totalSeconds = Math.ceil(remainingTime / 1_000)
    const days = Math.floor(totalSeconds / 86_400)
    const hours = Math.floor((totalSeconds % 86_400) / 3_600)
    const minutes = Math.floor((totalSeconds % 3_600) / 60)
    const seconds = totalSeconds % 60

    daysElement.textContent = formatUnit(days)
    hoursElement.textContent = formatUnit(hours)
    minutesElement.textContent = formatUnit(minutes)
    secondsElement.textContent = formatUnit(seconds)
    countdown.setAttribute(
      'aria-label',
      `${days} days, ${hours} hours, ${minutes} minutes, and ${seconds} seconds until ${launchLabel} launches`,
    )

    return false
  }

  const launchReached = updateCountdown()

  if (!launchReached) {
    const intervalId = window.setInterval(() => {
      if (updateCountdown()) {
        window.clearInterval(intervalId)
      }
    }, 1_000)
  }
}

document
  .querySelectorAll<HTMLElement>('[data-launch-at]')
  .forEach(initializeCountdown)

const cursorDot = document.querySelector<HTMLElement>('.cursor-dot')
const cursorRing = document.querySelector<HTMLElement>('.cursor-ring')
const finePointer = window.matchMedia('(pointer: fine)')
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

if (cursorDot && cursorRing && finePointer.matches && !reducedMotion.matches) {
  document.body.classList.add('custom-cursor')

  let pointerX = window.innerWidth / 2
  let pointerY = window.innerHeight / 2
  let ringX = pointerX
  let ringY = pointerY
  let cursorIsVisible = false

  const showCursor = (): void => {
    if (!cursorIsVisible) {
      ringX = pointerX
      ringY = pointerY
      cursorIsVisible = true
    }

    cursorDot.classList.add('is-visible')
    cursorRing.classList.add('is-visible')
  }

  const hideCursor = (): void => {
    cursorIsVisible = false
    cursorDot.classList.remove('is-visible')
    cursorRing.classList.remove('is-visible', 'is-interactive', 'is-clicking')
  }

  const animateCursor = (): void => {
    ringX += (pointerX - ringX) * 0.18
    ringY += (pointerY - ringY) * 0.18
    cursorRing.style.left = `${ringX}px`
    cursorRing.style.top = `${ringY}px`
    window.requestAnimationFrame(animateCursor)
  }

  window.addEventListener('pointermove', (event) => {
    pointerX = event.clientX
    pointerY = event.clientY
    cursorDot.style.left = `${pointerX}px`
    cursorDot.style.top = `${pointerY}px`

    const target = event.target instanceof Element ? event.target : null
    cursorRing.classList.toggle(
      'is-interactive',
      Boolean(target?.closest('a, button')),
    )
    showCursor()
  })

  window.addEventListener('pointerdown', () => {
    cursorRing.classList.add('is-clicking')
  })

  window.addEventListener('pointerup', () => {
    cursorRing.classList.remove('is-clicking')
  })

  window.addEventListener('mouseout', (event) => {
    if (!event.relatedTarget) {
      hideCursor()
    }
  })
  window.addEventListener('blur', hideCursor)

  animateCursor()
}

const soundToggle = document.querySelector<HTMLButtonElement>('.sound-toggle')
let audioContext: AudioContext | null = null
let ambientOscillators: OscillatorNode[] = []

const updateSoundToggle = (soundIsOn: boolean): void => {
  if (!soundToggle) {
    return
  }

  soundToggle.textContent = soundIsOn ? 'Sound: on' : 'Sound: off'
  soundToggle.setAttribute('aria-pressed', String(soundIsOn))
  soundToggle.setAttribute(
    'aria-label',
    soundIsOn ? 'Turn ambient sound off' : 'Turn ambient sound on',
  )
}

const startAmbientSound = async (): Promise<void> => {
  const context = new AudioContext()
  const filter = context.createBiquadFilter()
  const masterGain = context.createGain()
  const baseTone = context.createOscillator()
  const harmonicTone = context.createOscillator()
  const pulse = context.createOscillator()
  const pulseDepth = context.createGain()

  filter.type = 'lowpass'
  filter.frequency.value = 240
  masterGain.gain.value = 0.02

  baseTone.type = 'sine'
  baseTone.frequency.value = 55
  harmonicTone.type = 'triangle'
  harmonicTone.frequency.value = 82.41
  pulse.type = 'sine'
  pulse.frequency.value = 0.12
  pulseDepth.gain.value = 0.007

  baseTone.connect(filter)
  harmonicTone.connect(filter)
  filter.connect(masterGain)
  pulse.connect(pulseDepth)
  pulseDepth.connect(masterGain.gain)
  masterGain.connect(context.destination)

  baseTone.start()
  harmonicTone.start()
  pulse.start()

  audioContext = context
  ambientOscillators = [baseTone, harmonicTone, pulse]
  await context.resume()
}

const stopAmbientSound = async (): Promise<void> => {
  ambientOscillators.forEach((oscillator) => oscillator.stop())
  ambientOscillators = []

  if (audioContext) {
    const context = audioContext
    audioContext = null
    await context.close()
  }
}

soundToggle?.addEventListener('click', async () => {
  soundToggle.disabled = true

  try {
    if (audioContext) {
      await stopAmbientSound()
      updateSoundToggle(false)
    } else {
      await startAmbientSound()
      updateSoundToggle(true)
    }
  } catch (error) {
    console.error('Ambient sound could not be started:', error)
    updateSoundToggle(false)
  } finally {
    soundToggle.disabled = false
  }
})

document.addEventListener('visibilitychange', () => {
  if (!audioContext) {
    return
  }

  if (document.hidden) {
    void audioContext.suspend()
  } else {
    void audioContext.resume()
  }
})
