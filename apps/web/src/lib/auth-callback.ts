export function getSafeCallbackUrl(callbackUrl: string | null) {
  if (
    callbackUrl?.startsWith('/') &&
    !callbackUrl.startsWith('//') &&
    callbackUrl !== '/login' &&
    callbackUrl !== '/register'
  ) {
    return callbackUrl
  }

  return '/workspace'
}
