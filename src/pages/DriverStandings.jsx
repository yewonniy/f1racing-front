import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { Trophy, Flag, X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

export default function DriverStandings() {
    const [year, setYear] = useState(2024);
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(false);

    // 🔥 [추가] 이미지 확대 모달 상태
    const [selectedImage, setSelectedImage] = useState(null); // { src: string, name: string }
    const [isZoomed, setIsZoomed] = useState(false);

    // 드라이버 데이터 가져오기
    const fetchDrivers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/api/drivers', { params: { year } });
            if (response.data && response.data.success) {
                const driverData = response.data.data?.drivers || response.data.drivers;
                setDrivers(Array.isArray(driverData) ? driverData : []);
            } else {
                setDrivers([]);
            }
        } catch (error) {
            console.error('드라이버 정보 로드 실패:', error);
            setDrivers([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDrivers();
    }, [year]);

    // 이미지 경로 생성 헬퍼
    const getDriverImageSrc = (driverLastName) => {
        if (!driverLastName) return '/drivers/default.png';
        return `/drivers/${year}/${driverLastName.toLowerCase()}.png`;
    };

    // 🎨 팀 컬러 매핑
    const getTeamColor = (teamName) => {
        if (!teamName) return '#9CA3AF';
        const name = teamName.toLowerCase();

        if (name.includes('red bull')) return '#3671C6';
        if (name.includes('mercedes')) return '#27F4D2';
        if (name.includes('ferrari')) return '#E8002D';
        if (name.includes('mclaren')) return '#FF8000';
        if (name.includes('aston')) return '#229971';
        if (name.includes('alpine')) return '#FF87BC';
        if (name.includes('williams')) return '#64C4FF';
        if (name.includes('rb') || name.includes('alphatauri')) return '#6692FF';
        if (name.includes('sauber') || name.includes('alfa')) return '#52E252';
        if (name.includes('haas')) return '#B6BABD';

        return '#9CA3AF';
    };

    // 🔥 [추가] 모달 열기 핸들러
    const openModal = (src, name) => {
        setSelectedImage({ src, name });
        setIsZoomed(false); // 줌 초기화
        document.body.style.overflow = 'hidden'; // 배경 스크롤 막기
    };

    // 🔥 [추가] 모달 닫기 핸들러
    const closeModal = () => {
        setSelectedImage(null);
        setIsZoomed(false);
        document.body.style.overflow = 'auto'; // 스크롤 복구
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 bg-[#222222] min-h-screen transition-colors duration-300 relative">
            {/* 상단 헤더 영역 */}
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-gray-600 pb-6">
                <div>
                    <h2 className="text-4xl md:text-5xl font-black italic uppercase text-white tracking-tighter leading-none">
                        F1 Driver <span className="text-red-500">Standings</span>
                    </h2>
                    <p className="text-gray-300 font-mono mt-2 tracking-widest">SEASON {year}</p>
                </div>

                <div className="flex gap-2 mt-6 md:mt-0">
                    {[2024, 2025].map((y) => (
                        <button
                            key={y}
                            onClick={() => setYear(y)}
                            className={`px-6 py-2 rounded-full font-bold text-sm transition-all border ${
                                year === y
                                    ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-900/40 transform scale-105'
                                    : 'bg-[#333333] border-gray-500 text-gray-300 hover:border-gray-400 hover:text-white'
                            }`}
                        >
                            {y}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col justify-center items-center h-96">
                    <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-6"></div>
                    <p className="text-gray-300 font-mono text-lg animate-pulse">Loading Grid...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mb-12">
                    {drivers && drivers.length > 0 ? (
                        drivers.map((driver, index) => {
                            const isFirst = index === 0;
                            const teamColor = getTeamColor(driver.team);
                            const imgSrc = getDriverImageSrc(driver.driverId);
                            const driverName = `${driver.firstName} ${driver.lastName}`;

                            return (
                                <div
                                    key={driver.driverId || index}
                                    className={`group bg-[#333333] rounded-3xl overflow-hidden shadow-xl border transition-all duration-300 hover:-translate-y-3 hover:shadow-2xl flex flex-col relative`}
                                    style={{
                                        borderColor: isFirst ? teamColor : 'rgba(255,255,255,0.2)',
                                        boxShadow: isFirst
                                            ? `0 0 30px ${teamColor}40`
                                            : '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
                                    }}
                                >
                                    {/* 1. 상단 영역 */}
                                    <div className="relative pt-10 pb-2 flex flex-col items-center bg-gradient-to-b from-[#4a4a4a] to-[#333333]">
                                        {/* 순위 배지 */}
                                        <div
                                            className={`absolute top-0 left-0 px-6 py-4 rounded-br-3xl font-black italic text-5xl leading-none z-10 shadow-lg ${
                                                isFirst ? 'bg-yellow-400 text-black' : 'bg-[#262626] text-white'
                                            }`}
                                        >
                                            {driver.position}
                                        </div>

                                        {/* 📸 드라이버 사진 (클릭 이벤트 추가) */}
                                        <div
                                            // 🔥 [추가] 클릭 시 모달 열기 + 커서 변경
                                            onClick={() => openModal(imgSrc, driverName)}
                                            className="relative w-48 h-48 rounded-full overflow-hidden border-[6px] shadow-2xl z-10 bg-[#333333] cursor-zoom-in group-hover:ring-4 ring-white/10 transition-all"
                                            style={{
                                                borderColor: isFirst ? teamColor : '#444',
                                            }}
                                        >
                                            <img
                                                src={imgSrc}
                                                alt={driver.driverId}
                                                onError={(e) => {
                                                    e.target.src = '/drivers/default.png';
                                                }}
                                                className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-110"
                                            />
                                            {/* 호버 시 확대 아이콘 힌트 */}
                                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                                                <Maximize2 className="text-white drop-shadow-md" size={32} />
                                            </div>
                                        </div>

                                        <div
                                            className="absolute top-10 w-full h-32 opacity-15 blur-3xl rounded-full pointer-events-none"
                                            style={{ backgroundColor: teamColor }}
                                        ></div>
                                    </div>

                                    {/* 2. 하단 정보 영역 */}
                                    <div className="px-6 pb-6 pt-2 flex flex-col flex-grow relative z-10">
                                        <div className="text-center mb-5">
                                            <div className="flex items-center justify-center gap-2 text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">
                                                <Flag size={12} />
                                                {driver.nationality}
                                                <span className="text-gray-500">|</span>
                                                <span className="font-mono text-gray-400">#{driver.driverNumber}</span>
                                            </div>
                                            <div className="leading-tight">
                                                <span className="block text-lg font-bold text-gray-200">
                                                    {driver.firstName}
                                                </span>
                                                <span
                                                    className={`block text-4xl font-black italic uppercase tracking-tight ${
                                                        isFirst ? 'text-yellow-400' : 'text-red-500'
                                                    }`}
                                                >
                                                    {driver.lastName}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="text-center mb-8">
                                            <span
                                                className="inline-block px-6 py-2 rounded-full text-sm font-bold uppercase tracking-widest shadow-lg transform transition-transform group-hover:scale-105"
                                                style={{
                                                    backgroundColor: teamColor,
                                                    color: '#ffffff',
                                                    textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                                                    boxShadow: `0 4px 15px ${teamColor}55`,
                                                }}
                                            >
                                                {driver.team}
                                            </span>
                                        </div>

                                        <div className="border-t border-gray-600 mt-auto mb-5"></div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="text-center p-2 rounded-xl bg-[#262626] border border-gray-700">
                                                <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1">
                                                    Points
                                                </div>
                                                <div className="text-3xl font-black text-white italic tracking-tighter">
                                                    {driver.points}
                                                </div>
                                            </div>

                                            <div className="text-center p-2 rounded-xl bg-[#262626] border border-gray-700">
                                                <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1">
                                                    Wins
                                                </div>
                                                <div
                                                    className={`text-3xl font-black italic tracking-tighter flex items-center justify-center gap-1 ${
                                                        driver.wins > 0 ? 'text-yellow-400' : 'text-gray-500'
                                                    }`}
                                                >
                                                    {driver.wins > 0 && (
                                                        <Trophy size={20} className="fill-yellow-400" />
                                                    )}
                                                    {driver.wins}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="col-span-full py-32 text-center text-gray-500 bg-[#333333] rounded-3xl border border-gray-600 border-dashed">
                            <Trophy size={64} className="mx-auto mb-6 opacity-20" />
                            <p className="text-2xl font-bold text-gray-300">데이터가 없습니다.</p>
                            <p className="text-sm mt-2 font-mono">해당 시즌의 드라이버 정보를 불러올 수 없습니다.</p>
                        </div>
                    )}
                </div>
            )}

            {/* 🔥 [추가] 이미지 확대 모달 */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                    onClick={closeModal} // 배경 클릭 시 닫기
                >
                    {/* 닫기 버튼 */}
                    <button
                        onClick={closeModal}
                        className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors bg-white/10 p-2 rounded-full"
                    >
                        <X size={32} />
                    </button>

                    {/* 이미지 컨테이너 */}
                    <div
                        className="relative max-w-4xl max-h-[80vh] flex flex-col items-center"
                        onClick={(e) => e.stopPropagation()} // 내부 클릭 시 닫기 방지
                    >
                        {/* 이미지 */}
                        <img
                            src={selectedImage.src}
                            alt={selectedImage.name}
                            className={`rounded-2xl shadow-2xl transition-transform duration-300 cursor-zoom-in ${
                                isZoomed ? 'scale-[2.0] cursor-zoom-out' : 'scale-100'
                            }`}
                            style={{ maxHeight: '70vh' }}
                            onClick={() => setIsZoomed(!isZoomed)} // 이미지 클릭 시 확대/축소 토글
                        />

                        {/* 하단 캡션 */}
                        <div
                            className={`mt-6 text-center transition-opacity duration-300 ${isZoomed ? 'opacity-0' : 'opacity-100'}`}
                        >
                            <h3 className="text-3xl font-black italic text-white uppercase tracking-tight">
                                {selectedImage.name}
                            </h3>
                            <p className="text-gray-400 text-sm mt-2 flex items-center justify-center gap-2">
                                {isZoomed ? <ZoomOut size={16} /> : <ZoomIn size={16} />}
                                {isZoomed ? 'Click to Zoom Out' : 'Click Image to Zoom In'}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
