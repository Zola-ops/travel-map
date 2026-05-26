const UUID_KEY = 'journey-map-user-id'

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function getUserId(): string {
  let id = localStorage.getItem(UUID_KEY)
  if (!id) {
    id = generateUUID()
    localStorage.setItem(UUID_KEY, id)
  }
  return id
}