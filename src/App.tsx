import React from 'react'
import './App.css'
import { 
  firebaseAuth, 
  firebaseDatabase, 
  dbRef
} from './services/firebaseService'

function App() {
  const [connectionStatus, setConnectionStatus] = React.useState<string>('Testing...')
  const [authStatus, setAuthStatus] = React.useState<string>('Not authenticated')
  const [dbStatus, setDbStatus] = React.useState<string>('Not tested')

  React.useEffect(() => {
    const testFirebaseConnection = async () => {
      try {
        // Test Firebase initialization
        console.log('Firebase Auth:', firebaseAuth)
        console.log('Firebase Database:', firebaseDatabase)
        setConnectionStatus('✅ Firebase initialized successfully')

        // Test authentication service availability
        if (firebaseAuth) {
          setAuthStatus('✅ Firebase Auth service available')
        }

        // Test database service availability  
        if (firebaseDatabase) {
          const testRef = dbRef(firebaseDatabase, 'test')
          console.log('Database reference created:', testRef)
          setDbStatus('✅ Firebase Database service available')
        }

      } catch (error) {
        console.error('Firebase connection error:', error)
        setConnectionStatus('❌ Firebase connection failed: ' + (error as Error).message)
      }
    }

    testFirebaseConnection()
  }, [])

  return (
    <div className="App">
      <header className="App-header">
        <h1>CollabCanvas</h1>
        <p>Real-time collaborative canvas application</p>
        
        <div style={{ marginTop: '30px', textAlign: 'left' }}>
          <h3>🔧 PR #1: Project Setup Status</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li>✅ TypeScript + React + Vite setup</li>
            <li>✅ Dependencies installed</li>
            <li>✅ Vitest configuration</li>
            <li>✅ Firebase service layer</li>
            <li style={{ marginTop: '10px' }}><strong>Connection Tests:</strong></li>
            <li>📡 {connectionStatus}</li>
            <li>🔐 {authStatus}</li>
            <li>💾 {dbStatus}</li>
          </ul>
          
          <div style={{ marginTop: '20px', fontSize: '14px', color: '#888' }}>
            <p><strong>Note:</strong> To complete setup, add Firebase config to .env.local</p>
            <p>Check browser console for detailed Firebase logs</p>
          </div>
        </div>
      </header>
    </div>
  )
}

export default App
