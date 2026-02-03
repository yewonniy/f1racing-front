import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import DriverStandings from './pages/DriverStandings';
import RaceReplay from './pages/RaceReplay';

function App() {
    return (
        <Router>
            <div className="min-h-screen bg-gray-900 text-white font-sans selection:bg-red-500 selection:text-white">
                {/* 네비게이션 바 */}
                <nav className="bg-red-600 p-4 shadow-lg sticky top-0 z-50">
                    <div className="container mx-auto flex justify-between items-center">
                        <h1 className="text-2xl font-black italic tracking-tighter flex items-center gap-2">
                            <span className="text-3xl">🏎️</span> F1 RACING REPLAY
                        </h1>
                        <div className="space-x-6 font-bold text-sm uppercase tracking-wide">
                            <Link to="/" className="hover:text-black transition duration-300">
                                Drivers
                            </Link>
                            <Link to="/replay" className="hover:text-black transition duration-300">
                                Race Replay
                            </Link>
                        </div>
                    </div>
                </nav>

                {/* 페이지 컨텐츠 */}
                <div className="container mx-auto p-4 py-8">
                    <Routes>
                        <Route path="/" element={<DriverStandings />} />
                        <Route path="/replay" element={<RaceReplay />} />
                    </Routes>
                </div>
            </div>
        </Router>
    );
}

export default App;
