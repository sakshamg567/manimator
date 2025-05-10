import Chat from "./pages/Chat"
import Home from "./pages/Home"
import { BrowserRouter, Route, Router, Routes } from "react-router-dom"
function App() {

  return (
    <>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home/>}/>
        <Route path="/chat" element={<Chat/>}/>
      </Routes>
    </BrowserRouter>
    </>
  )
}

export default App
