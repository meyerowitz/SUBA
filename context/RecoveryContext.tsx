import React, { createContext, useContext, useState } from "react"

interface RecoveryContextType {
  email: string
  setEmail: (email: string) => void
  verificationCode: string
  setVerificationCode: (code: string) => void
  resetContext: () => void
}

const RecoveryContext = createContext<RecoveryContextType | undefined>(undefined)

export const RecoveryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [email, setEmail] = useState("")
  const [verificationCode, setVerificationCode] = useState("")

  const resetContext = () => {
    setEmail("")
    setVerificationCode("")
  }

  return (
    <RecoveryContext.Provider value={{ email, setEmail, verificationCode, setVerificationCode, resetContext }}>
      {children}
    </RecoveryContext.Provider>
  )
}

export const useRecovery = () => {
  const context = useContext(RecoveryContext)
  if (!context) {
    throw new Error("useRecovery must be used within RecoveryProvider")
  }
  return context
}
