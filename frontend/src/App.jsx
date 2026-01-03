import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  // --- CONFIGURATION ---
  // If accessing via Ingress (Day 10+): Use "http://localhost/api"
  // If accessing via Port-Forward (Day 3-9): Use "http://localhost:5000"
  const API_URL = "http://localhost/api" 
  // const API_URL = "http://localhost:5000"
  
  // --- STATE ---
  const [token, setToken] = useState(localStorage.getItem('token') || "")
  const [tasks, setTasks] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)

  // Login Form
  const [username, setUsername] = useState("admin")
  const [password, setPassword] = useState("password123")

  // Request Form
  const [formData, setFormData] = useState({
    resource_name: "",
    environment: "dev",
    instance_type: "micro",
    encrypted: "true", // string initially for select input
    owner_tag: "DevOpsTeam",
    cidr: "10.0.0.1/32"
  })

  // --- HELPERS ---
  const addLog = (msg) => {
    const time = new Date().toLocaleTimeString()
    setLogs(prev => [`[${time}] ${msg}`, ...prev])
  }

  // --- API ACTIONS ---

  // 1. LOGIN
  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      addLog(`Attempting login to ${API_URL}/login...`)
      const res = await axios.post(`${API_URL}/login`, { username, password })
      
      const newToken = res.data.access_token
      setToken(newToken)
      localStorage.setItem('token', newToken)
      addLog("✅ Login Successful!")
      fetchTasks() // Load data immediately
    } catch (err) {
      console.error(err)
      addLog(`❌ Login Failed: ${err.message}`)
      if (err.response) addLog(`Server says: ${JSON.stringify(err.response.data)}`)
    } finally {
      setLoading(false)
    }
  }

  // 2. SUBMIT REQUEST
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!token) return alert("Please login first")
    setLoading(true)

    // Construct Payload matches Python Pydantic Schema exactly
    const payload = {
      resource_name: formData.resource_name,
      environment: formData.environment,
      instance_type: formData.instance_type,
      encrypted: formData.encrypted === "true", // Convert string to boolean
      tags: { 
        "Owner": formData.owner_tag,
        "Project": "AI-Advisor"
      },
      security_group: {
        "allowed_cidrs": [formData.cidr] // Nested List
      }
    }

    try {
      addLog("Sending Provisioning Request...")
      await axios.post(`${API_URL}/submit-resource`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      })
      addLog("✅ Request Sent! Worker is processing...")
      fetchTasks()
    } catch (err) {
      console.error(err)
      addLog(`❌ Error: ${err.message}`)
      if (err.response) addLog(`Details: ${JSON.stringify(err.response.data)}`)
    } finally {
      setLoading(false)
    }
  }

  // 3. FETCH TASKS (POLLING)
  const fetchTasks = async () => {
    try {
      // Note: This endpoint is public in our Python code, but if you secured it, add headers
      const res = await axios.get(`${API_URL}/tasks`)
      setTasks(res.data)
    } catch (err) {
      // Don't log every poll error to avoid spamming UI, just console
      console.warn("Polling error:", err.message)
    }
  }

  // --- EFFECTS ---
  
  // Auto-refresh every 2 seconds
  useEffect(() => {
    fetchTasks()
    const interval = setInterval(fetchTasks, 2000)
    return () => clearInterval(interval)
  }, [])

  // --- RENDER ---

  // VIEW 1: LOGIN
  if (!token) {
    return (
      <div className="container center">
        <div className="card">
          <h1>🔐 Cloud Advisor Login</h1>
          <form onSubmit={handleLogin} className="form-col">
            <input 
              type="text" 
              placeholder="Username"
              value={username} 
              onChange={e=>setUsername(e.target.value)} 
            />
            <input 
              type="password" 
              placeholder="Password"
              value={password} 
              onChange={e=>setPassword(e.target.value)} 
            />
            <button type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
          <div className="logs-mini">
            {logs.slice(0, 3).map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </div>
      </div>
    )
  }

  // VIEW 2: DASHBOARD
  return (
    <div className="container">
      <header>
        <h1>☁️ AI Infrastructure Advisor</h1>
        <button onClick={() => {setToken(""); localStorage.removeItem('token')}} className="btn-secondary">
          Logout ({username})
        </button>
      </header>

      <main className="grid">
        {/* LEFT COLUMN: FORM */}
        <section className="card">
          <h2>🚀 New Resource</h2>
          <form onSubmit={handleSubmit} className="form-grid">
            
            <label>Resource Name</label>
            <input required value={formData.resource_name} onChange={e=>setFormData({...formData, resource_name: e.target.value})} />

            <label>Environment</label>
            <select value={formData.environment} onChange={e=>setFormData({...formData, environment: e.target.value})}>
              <option value="dev">Development</option>
              <option value="prod">Production</option>
            </select>

            <label>Instance Type</label>
            <select value={formData.instance_type} onChange={e=>setFormData({...formData, instance_type: e.target.value})}>
              <option value="micro">Micro (Low Cost)</option>
              <option value="large">Large (High Cost)</option>
            </select>

            <label>Encrypted?</label>
            <select value={formData.encrypted} onChange={e=>setFormData({...formData, encrypted: e.target.value})}>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>

            <label>Allowed IP (CIDR)</label>
            <input value={formData.cidr} onChange={e=>setFormData({...formData, cidr: e.target.value})} />

            <label>Owner Tag</label>
            <input value={formData.owner_tag} onChange={e=>setFormData({...formData, owner_tag: e.target.value})} />

            <div className="full-width">
              <button type="submit" disabled={loading}>
                {loading ? "Submitting..." : "Provision Resource"}
              </button>
            </div>
          </form>
        </section>

        {/* RIGHT COLUMN: LOGS & STATUS */}
        <section className="card">
          <h2>📡 Live Status</h2>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Compliance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(t => (
                  <tr key={t.id}>
                    <td>{t.id}</td>
                    <td>{t.resource}</td>
                    <td>
                      {t.score >= 80 ? "✅" : "⚠️"} {t.score}/100
                      {t.suggestions && t.suggestions.length > 0 && (
                        <div className="suggestion">{t.suggestions[0]}</div>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${t.status}`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {tasks.length === 0 && <tr><td colSpan="4">No tasks found.</td></tr>}
              </tbody>
            </table>
          </div>
          
          <h3>System Logs</h3>
          <div className="logs-panel">
            {logs.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App