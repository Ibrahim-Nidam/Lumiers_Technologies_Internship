import { useEffect, useState } from 'react'
import axios from 'axios'

function App() {
  const [msg, setMsg] = useState('')

  useEffect(() => {
    axios.get('http://localhost:3001/api/test')
      .then(res => setMsg(res.data.message))
      .catch(err => console.error(err))
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-800">
      <h1 className="text-4xl font-bold mb-4">✅ Tailwind is working!</h1>
      <p className="text-lg">You're now using Tailwind with React + Vite 🎉</p>
      <p>{msg}</p>
    </div>
  );
}

export default App
