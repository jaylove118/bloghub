import { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { api, setToken, clearToken } from './api'

const AuthContext = createContext(null)

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

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  useEffect(() => {
    const initAuth = async () => {
      try {
        const user = await api.auth.getCurrentUser()
        dispatch({ type: 'SET_USER', payload: user })
      } catch (error) {
        dispatch({ type: 'SET_USER', payload: null })
      }
    }
    initAuth()
  }, [])

  const login = async (email, password) => {
    const { user } = await api.auth.login(email, password)
    dispatch({ type: 'SET_USER', payload: user })
    return user
  }

  const register = async (userData) => {
    const { user } = await api.auth.register(userData)
    dispatch({ type: 'SET_USER', payload: user })
    return user
  }

  const logout = async () => {
    await api.auth.logout()
    dispatch({ type: 'LOGOUT' })
  }

  const loginWithToken = useCallback(async (token) => {
    setToken(token)
    try {
      const user = await api.auth.getCurrentUser()
      dispatch({ type: 'SET_USER', payload: user })
    } catch {
      clearToken()
      dispatch({ type: 'SET_USER', payload: null })
    }
  }, [])

  const updateProfile = async (updates) => {
    const updatedUser = await api.auth.updateProfile(updates)
    dispatch({ type: 'UPDATE_USER', payload: updatedUser })
    return updatedUser
  }

  return (
    <AuthContext.Provider value={{ ...state, isAdmin: state.user?.role === 'admin', login, register, logout, loginWithToken, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
