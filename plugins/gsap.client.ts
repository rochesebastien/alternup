import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Defaults pleasants
gsap.defaults({ ease: 'power3.out', duration: 0.6 })

export default defineNuxtPlugin(() => {
  return {
    provide: {
      gsap,
      ScrollTrigger
    }
  }
})
