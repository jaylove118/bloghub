export function handleError(error, setError) {
  const message = error?.message || '操作失败，请稍后重试'
  if (setError) setError(message)
}

export function showToast(message) {
  alert(message)
}
