import { describe, it, expect } from 'vitest'

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
}

function authReducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        isLoading: false,
      }
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      }
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      }
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      }
    default:
      return state
  }
}

describe('authReducer', () => {
  it('SET_USER with a user sets authenticated and stops loading', () => {
    const user = { id: 1, username: 'alice' }
    const state = authReducer(initialState, { type: 'SET_USER', payload: user })
    expect(state.user).toEqual(user)
    expect(state.isAuthenticated).toBe(true)
    expect(state.isLoading).toBe(false)
  })

  it('SET_USER with null sets unauthenticated and stops loading', () => {
    const state = authReducer(
      { user: { id: 1 }, isAuthenticated: true, isLoading: true },
      { type: 'SET_USER', payload: null }
    )
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isLoading).toBe(false)
  })

  it('LOGOUT clears user and sets unauthenticated', () => {
    const state = authReducer(
      { user: { id: 1, username: 'alice' }, isAuthenticated: true, isLoading: false },
      { type: 'LOGOUT' }
    )
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isLoading).toBe(false)
  })

  it('UPDATE_USER updates the user object without changing auth status', () => {
    const oldUser = { id: 1, username: 'alice' }
    const newUser = { id: 1, username: 'alice_updated', bio: 'new bio' }
    const state = authReducer(
      { user: oldUser, isAuthenticated: true, isLoading: false },
      { type: 'UPDATE_USER', payload: newUser }
    )
    expect(state.user).toEqual(newUser)
    expect(state.isAuthenticated).toBe(true)
    expect(state.isLoading).toBe(false)
  })

  it('SET_LOADING changes loading state', () => {
    const state1 = authReducer(initialState, { type: 'SET_LOADING', payload: true })
    expect(state1.isLoading).toBe(true)

    const state2 = authReducer(state1, { type: 'SET_LOADING', payload: false })
    expect(state2.isLoading).toBe(false)
  })

  it('returns current state for unknown action types', () => {
    const state = authReducer(initialState, { type: 'UNKNOWN' })
    expect(state).toBe(initialState)
  })
})
