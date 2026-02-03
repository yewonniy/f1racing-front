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
                        {/* 로고 + 타이틀 영역 */}
                        <h1 className="text-2xl font-black italic tracking-tighter flex items-center gap-1">
                            {/* 🔥 [수정] public 폴더의 f1.png 불러오기 */}
                            <img
                                src="/whitef1.png"
                                alt="F1 Logo"
                                className="h-7 w-auto object-contain rounded px-1" // 흰 배경을 살짝 깔아주면 빨간 배경 위에서도 로고가 잘 보입니다
                            />
                            <span>RACE REPLAY</span>
                        </h1>

                        <div className="flex flex-row items-center gap-4 md:gap-6 font-bold text-xs md:text-sm uppercase tracking-wide">
                            {/* Drivers: 한 줄 유지 */}
                            <Link to="/" className="hover:text-gray-900 transition duration-300">
                                Drivers
                            </Link>

                            {/* Race Replay: 모바일에서만 두 줄로 꺾임 */}
                            <Link
                                to="/replay"
                                className="hover:text-gray-900 transition duration-300 text-center leading-tight"
                            >
                                Race
                                {/* md:hidden -> PC(md이상)에서는 숨김 = PC에선 한 줄 */}
                                <br className="md:hidden" /> Replay
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
