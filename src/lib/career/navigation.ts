export const careerNavigationEvent = "vistern:career-navigation"

export function navigateCareer(href: string, replace = false) {
  const target = new URL(href, window.location.origin)
  const url = `${target.pathname}${target.search}${target.hash}`
  if (replace) window.history.replaceState(null, "", url)
  else window.history.pushState(null, "", url)
  window.dispatchEvent(new Event(careerNavigationEvent))
  window.scrollTo({ top: 0, behavior: "instant" })
}
