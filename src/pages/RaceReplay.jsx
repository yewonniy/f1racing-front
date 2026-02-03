import { useState, useEffect, useRef, useMemo } from 'react';
import api, { API_BASE_URL } from '../api/axiosConfig';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Play, Pause, Loader2, Gauge, Wifi, WifiOff, Flag, Timer } from 'lucide-react';

// 드라이버 이니셜 매핑
const DRIVER_INITIALS = {
    1: 'VER',
    11: 'PER',
    16: 'LEC',
    55: 'SAI',
    44: 'HAM',
    12: 'ANT',
    63: 'RUS',
    4: 'NOR',
    81: 'PIA',
    14: 'ALO',
    18: 'STR',
    10: 'GAS',
    31: 'OCO',
    61: 'DOO',
    23: 'ALB',
    2: 'SAR',
    43: 'COL',
    22: 'TSU',
    3: 'RIC',
    30: 'LAW',
    7: 'HAD',
    77: 'BOT',
    24: 'ZHO',
    27: 'HUL',
    87: 'BEA',
    20: 'MAG',
    5: 'BOR',
};

const ROSTER_2024 = {
    1: 'Red Bull Racing',
    11: 'Red Bull Racing',
    44: 'Mercedes',
    63: 'Mercedes',
    16: 'Ferrari',
    55: 'Ferrari',
    4: 'McLaren',
    81: 'McLaren',
    14: 'Aston Martin',
    18: 'Aston Martin',
    10: 'Alpine',
    31: 'Alpine',
    23: 'Williams',
    2: 'Williams',
    43: 'Williams',
    22: 'RB',
    3: 'RB',
    30: 'RB',
    77: 'Kick Sauber',
    24: 'Kick Sauber',
    27: 'Haas',
    20: 'Haas',
    87: 'Haas', // Bearman (Reserve)
};

// 2025년 시즌 로스터 (이적 시장 반영)
const ROSTER_2025 = {
    1: 'Red Bull Racing',
    22: 'Red Bull Racing', // (Perez 잔류 가정)
    63: 'Mercedes',
    12: 'Mercedes', // Russell, Antonelli
    16: 'Ferrari',
    44: 'Ferrari', // Leclerc, Hamilton
    4: 'McLaren',
    81: 'McLaren',
    14: 'Aston Martin',
    18: 'Aston Martin',
    10: 'Alpine',
    61: 'Alpine', // Gasly, Doohan
    23: 'Williams',
    55: 'Williams', // Albon, Sainz
    30: 'RB',
    7: 'RB', // Tsunoda, Lawson/Hadjar (예상)
    5: 'Sauber',
    27: 'Sauber', // (Hulkenberg -> Sauber?)
    31: 'Haas',
    87: 'Haas', // Ocon, Bearman
};

// [복구됨] 정렬 순서 키워드
const TEAM_PRIORITY_KEYWORDS = [
    'Red Bull',
    'Mercedes',
    'Ferrari',
    'McLaren',
    'Aston Martin',
    'Alpine',
    'Williams',
    'RB',
    'Sauber',
    'Haas',
];

export default function RaceReplay() {
    const [year, setYear] = useState(2024);
    const [sessions, setSessions] = useState([]);
    const [selectedSession, setSelectedSession] = useState(null);

    const [realStartTime, setRealStartTime] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [sliderUiValue, setSliderUiValue] = useState(0);

    const [trackPaths, setTrackPaths] = useState({});
    const [mapBounds, setMapBounds] = useState(null);
    const [raceData, setRaceData] = useState({});
    const [isLoadingMap, setIsLoadingMap] = useState(false);

    // 랩 정보 관련 State
    const [lapList, setLapList] = useState([]);
    const [currentLapInfo, setCurrentLapInfo] = useState(null);

    // 연결 상태 모니터링
    const [isConnected, setIsConnected] = useState(false);
    const [lastDataTime, setLastDataTime] = useState(null);

    const clientId = useRef(`client-${Math.floor(Math.random() * 100000)}`);
    const stompClient = useRef(null);

    // 드라이버 별 팀 정보 저장용 State (Map)
    const [driverTeamMap, setDriverTeamMap] = useState({});

    // 1. 초기 로드 (세션 목록 & 드라이버 팀 정보)
    useEffect(() => {
        // (1) 세션 목록
        api.get(`/api/race/sessions?year=${year}`).then((res) => {
            // res.data가 배열인지 확인 후 정렬
            const sessionList = Array.isArray(res.data) ? res.data : [];
            const sorted = sessionList.sort((a, b) => new Date(a.dateStart) - new Date(b.dateStart));
            setSessions(sorted);
        });

        // (2) 드라이버 정보 (팀 매핑용) - [에러 수정된 부분]
        api.get(`/api/drivers`, { params: { year } })
            .then((res) => {
                console.log('🔥 드라이버 API 원본 응답:', res.data); // 구조 확인용 로그

                // 데이터가 배열이 아니라면(Page 객체 등), 내부의 content를 찾거나 빈 배열 처리
                let driverList = [];
                if (Array.isArray(res.data)) {
                    driverList = res.data;
                } else if (res.data && Array.isArray(res.data.content)) {
                    // Spring Data JPA의 Page 객체인 경우
                    driverList = res.data.content;
                } else {
                    console.warn('드라이버 데이터가 배열이 아닙니다. 구조를 확인하세요.');
                }

                const map = {};
                driverList.forEach((driver) => {
                    if (driver.driverNumber && driver.team) {
                        map[driver.driverNumber] = driver.team;
                    }
                });
                console.log(`${year}년 드라이버 팀 정보 로드 완료:`, map);
                setDriverTeamMap(map);
            })
            .catch((err) => console.error('드라이버 정보 로드 실패:', err));
    }, [year]);

    // 2. 세션 선택
    const handleSessionSelect = async (session) => {
        setSelectedSession(session);
        setIsPlaying(false);
        setSliderUiValue(0);
        setRaceData({});
        setIsLoadingMap(true);
        setIsConnected(false);
        setLapList([]);
        setCurrentLapInfo(null);

        try {
            // (1) Start Time
            const timeRes = await api.get('/race/startTime', { params: { year, sessionKey: session.sessionKey } });
            let timeString = timeRes.data;
            if (typeof timeString === 'string' && !timeString.endsWith('Z')) {
                timeString += 'Z';
            }
            const startMs = new Date(timeString).getTime();
            setRealStartTime(startMs);
            setCurrentTime(startMs);

            // (2) Lap Info
            const lapRes = await api.get('/race/lapInfo', { params: { year, sessionKey: session.sessionKey } });
            const formattedLaps = lapRes.data.map((lap) => {
                let ds = lap.dateStart;
                if (typeof ds === 'string' && !ds.endsWith('Z')) {
                    ds += 'Z';
                }
                return { ...lap, dateStart: ds };
            });
            setLapList(formattedLaps.sort((a, b) => a.lapNumber - b.lapNumber));

            // (3) Track Map
            const trackRes = await api.get('/api/race/track-map', { params: { year, sessionKey: session.sessionKey } });
            setTrackPaths(trackRes.data);

            let allPoints = [];
            Object.values(trackRes.data).forEach((points) => {
                allPoints = [...allPoints, ...points];
            });

            if (allPoints.length > 0) {
                const xs = allPoints.map((p) => p.x);
                const ys = allPoints.map((p) => p.y);
                const padding = 300;
                setMapBounds({
                    minX: Math.min(...xs) - padding,
                    maxX: Math.max(...xs) + padding,
                    minY: Math.min(...ys) - padding,
                    maxY: Math.max(...ys) + padding,
                });
            }
            connectWebSocket(session.sessionKey);
        } catch (e) {
            console.error('초기화 실패:', e);
            alert('데이터 로드 실패');
        } finally {
            setIsLoadingMap(false);
        }
    };

    // 3. WebSocket
    const connectWebSocket = (sessionKey) => {
        if (stompClient.current) stompClient.current.deactivate();

        const socket = new SockJS(`${API_BASE_URL}/ws-f1`);
        const client = new Client({
            webSocketFactory: () => socket,
            heartbeatIncoming: 0,
            heartbeatOutgoing: 0,
            onConnect: () => {
                setIsConnected(true);
                const subPath = `/topic/race/${sessionKey}/${clientId.current}`;
                client.subscribe(subPath, (message) => {
                    const dataList = JSON.parse(message.body);
                    console.log(`📦 [WS] 파싱된 데이터 개수: ${dataList.length}개`);
                    if (dataList.length > 0) {
                        // [로그 추가됨] 시간 오차 디버깅용
                        const serverTs = dataList[0].timestamp;
                        console.log(
                            `📡 [WS] Server: ${serverTs} | ⏱️ [Front] Current: ${new Date(currentTime).toISOString()}`,
                        );

                        setLastDataTime(new Date());
                        setRaceData((prev) => {
                            const next = { ...prev };
                            dataList.forEach((d) => (next[d.driverNumber] = d));
                            return next;
                        });
                    }
                });
            },
            onDisconnect: () => setIsConnected(false),
            onWebSocketClose: () => setIsConnected(false),
        });
        client.activate();
        stompClient.current = client;
    };

    // 4. 데이터 요청
    const requestRaceData = (timestampMs) => {
        if (!selectedSession || !stompClient.current || !stompClient.current.connected) return;

        stompClient.current.publish({
            destination: '/app/race/data',
            body: JSON.stringify({
                year: year,
                sessionKey: selectedSession.sessionKey,
                startTime: timestampMs,
                clientId: clientId.current,
            }),
        });
    };

    const getTeamRank = (teamName) => {
        if (!teamName) return 999;
        // [복구됨] TEAM_PRIORITY_KEYWORDS 참조
        const index = TEAM_PRIORITY_KEYWORDS.findIndex((keyword) =>
            teamName.toLowerCase().includes(keyword.toLowerCase()),
        );
        return index === -1 ? 999 : index;
    };

    // 5. 타이머
    useEffect(() => {
        let interval;
        if (isPlaying && selectedSession) {
            interval = setInterval(() => {
                setCurrentTime((prev) => {
                    const nextTime = prev + 1000;
                    requestRaceData(nextTime);
                    const offsetMin = Math.floor((nextTime - realStartTime) / 60000);
                    setSliderUiValue(offsetMin);
                    return nextTime;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isPlaying, selectedSession, realStartTime]);

    // 6. 랩 정보 업데이트
    useEffect(() => {
        if (!currentTime || lapList.length === 0) return;
        let foundLap = null;
        for (let i = lapList.length - 1; i >= 0; i--) {
            const lapStartTime = new Date(lapList[i].dateStart).getTime();
            if (lapStartTime <= currentTime) {
                foundLap = lapList[i];
                break;
            }
        }
        if (!foundLap && lapList.length > 0) {
            const firstLapTime = new Date(lapList[0].dateStart).getTime();
            if (currentTime >= firstLapTime - 60000) {
                foundLap = lapList[0];
            }
        }
        if (foundLap && foundLap.lapNumber !== currentLapInfo?.lapNumber) {
            setCurrentLapInfo(foundLap);
        }
    }, [currentTime, lapList, currentLapInfo]);

    const handleSliderDrag = (e) => {
        const val = parseInt(e.target.value);
        setSliderUiValue(val);
        const previewTime = realStartTime + val * 60 * 1000;
        setCurrentTime(previewTime);
    };

    const handleSliderCommit = () => {
        const newTime = realStartTime + sliderUiValue * 60 * 1000;
        setCurrentTime(newTime);
        requestRaceData(newTime);
        setRaceData({});
    };

    const renderedTrack = useMemo(() => {
        if (!trackPaths || Object.keys(trackPaths).length === 0) return null;
        return Object.entries(trackPaths).map(([dNum, points]) => (
            <polyline
                key={`track-${dNum}`}
                points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="#333"
                strokeOpacity="0.5"
                strokeWidth="120"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        ));
    }, [trackPaths]);

    const getDriverLabel = (num) => DRIVER_INITIALS[num] || num;

    return (
        <div className="min-h-screen bg-[#0f0f0f] text-white p-4 lg:p-8 flex flex-col gap-6 relative">
            {/* 상단 컨트롤 */}
            <div className="bg-[#151515] border border-white/10 p-6 rounded-3xl shadow-2xl flex flex-col xl:flex-row gap-6 items-center justify-between backdrop-blur-md">
                <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                    <select
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="bg-black/40 text-white font-bold py-3 px-6 rounded-full border border-white/10 min-w-[140px]"
                    >
                        <option value={2024}>2024</option>
                        <option value={2025}>2025</option>
                    </select>
                    <select
                        className="bg-black/40 text-white py-3 px-6 rounded-full border border-white/10 flex-1 xl:min-w-[300px]"
                        onChange={(e) => {
                            const s = sessions.find((item) => item.sessionKey === Number(e.target.value));
                            if (s) handleSessionSelect(s);
                        }}
                        value={selectedSession?.sessionKey || ''}
                    >
                        <option value="">Select Grand Prix...</option>
                        {sessions.map((s) => (
                            <option key={s.sessionKey} value={s.sessionKey}>
                                {s.countryName} - {s.circuitShortName}
                            </option>
                        ))}
                    </select>
                </div>

                {selectedSession && (
                    <div className="flex flex-col xl:flex-row gap-6 w-full xl:justify-end">
                        {currentLapInfo ? (
                            <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
                                <div className="flex flex-col items-center px-2 border-r border-white/10">
                                    <div className="flex items-center gap-1 text-gray-400 text-xs font-bold mb-1">
                                        <Flag size={12} /> LAP
                                    </div>
                                    <span className="text-2xl font-bold text-red-500 tabular-nums">
                                        {currentLapInfo.lapNumber}
                                    </span>
                                </div>
                                <div className="flex flex-col px-2">
                                    <div className="flex items-center gap-1 text-gray-400 text-xs font-bold mb-1">
                                        <Timer size={12} /> FASTEST Driver 기록
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-lg font-bold text-yellow-400">
                                            {getDriverLabel(currentLapInfo.driverName)}
                                        </span>
                                        <span className="text-sm font-mono text-gray-300">
                                            {currentLapInfo.lapDuration}s
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            lapList.length > 0 &&
                            currentTime < new Date(lapList[0].dateStart).getTime() && (
                                <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
                                    <div className="flex flex-col items-center px-4">
                                        <div className="flex items-center gap-1 text-blue-400 text-xs font-bold mb-1 animate-pulse">
                                            BEFORE RACE START
                                        </div>
                                        <span className="text-2xl font-mono font-bold text-white tabular-nums">
                                            레이스 시작{' '}
                                            {Math.ceil(
                                                (new Date(lapList[0].dateStart).getTime() - currentTime) / 1000,
                                            ) - 60}{' '}
                                            초 전
                                        </span>
                                    </div>
                                </div>
                            )
                        )}

                        <div className="flex items-center gap-6 flex-1 xl:flex-none bg-white/5 p-4 rounded-2xl">
                            <button
                                onClick={() => setIsPlaying(!isPlaying)}
                                className={`p-4 rounded-full shadow-lg ${isPlaying ? 'bg-yellow-400 text-black' : 'bg-red-600 text-white'}`}
                            >
                                {isPlaying ? (
                                    <Pause size={24} fill="currentColor" />
                                ) : (
                                    <Play size={24} fill="currentColor" />
                                )}
                            </button>
                            <div className="flex-1 w-full flex flex-col gap-2 min-w-[200px]">
                                <input
                                    type="range"
                                    min="0"
                                    max="120"
                                    value={sliderUiValue}
                                    onInput={handleSliderDrag}
                                    onMouseUp={handleSliderCommit}
                                    onTouchEnd={handleSliderCommit}
                                    className="w-full h-2 bg-gray-700 rounded-lg accent-red-500 cursor-pointer"
                                />
                                <div className="flex justify-between text-xs font-mono text-gray-400">
                                    <span>START</span>
                                    <span className="text-white font-bold">+{sliderUiValue} MIN</span>
                                    <span>+120 MIN</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 bg-black/60 px-5 py-3 rounded-xl border border-white/10 min-w-[140px] justify-center">
                                {isConnected ? (
                                    <Wifi size={18} className="text-green-500" />
                                ) : (
                                    <WifiOff size={18} className="text-red-500 animate-pulse" />
                                )}
                                <span className="font-mono text-xl font-bold text-white tabular-nums">
                                    {new Date(currentTime).toLocaleTimeString('en-GB', {
                                        hour12: false,
                                        timeZone: 'UTC',
                                    })}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-6">
                <div className="flex-[3] h-[600px] bg-[#151515] border border-white/10 rounded-3xl relative overflow-hidden group shadow-inner">
                    {!selectedSession ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-700">
                            <Gauge size={80} className="mb-6 opacity-50" />
                            <span className="text-2xl font-black uppercase tracking-widest text-gray-600">
                                Select Session
                            </span>
                        </div>
                    ) : (
                        mapBounds && (
                            <svg
                                className="w-full h-full p-12"
                                preserveAspectRatio="xMidYMid meet"
                                viewBox={`${mapBounds.minX} ${mapBounds.minY} ${mapBounds.maxX - mapBounds.minX} ${mapBounds.maxY - mapBounds.minY}`}
                                transform="scale(1, -1)"
                            >
                                {renderedTrack}
                                {Object.values(raceData).map((car) => (
                                    <g
                                        key={car.driverNumber}
                                        style={{
                                            transform: `translate(${car.x}px, ${car.y}px)`,
                                            transition: 'transform 2000ms linear',
                                        }}
                                    >
                                        <circle
                                            r="400"
                                            fill={getTeamColor(car.driverNumber, year)}
                                            fillOpacity="0.9"
                                            stroke="white"
                                            strokeWidth="50"
                                        />
                                        <text
                                            transform="scale(1, -1)"
                                            fill="white"
                                            fontSize="240"
                                            fontWeight="bold"
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            dy="80"
                                            fontFamily="monospace"
                                        >
                                            {getDriverLabel(car.driverNumber)}
                                        </text>
                                    </g>
                                ))}
                            </svg>
                        )
                    )}
                </div>

                {/* [복구됨] 리더보드 Wrapper & Header */}
                <div className="lg:w-[400px] h-[600px] bg-[#151515] border border-white/10 rounded-3xl flex flex-col overflow-hidden">
                    <div className="p-5 bg-red-700 shadow-lg relative z-10 flex justify-between items-center">
                        <span className="font-black text-white uppercase tracking-widest text-sm">Live Timing</span>
                        <div className="flex items-center gap-2">
                            <div
                                className={`w-2 h-2 rounded-full ${lastDataTime && new Date() - lastDataTime < 2000 ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`}
                            ></div>
                            <span className="text-[10px] text-red-100 font-bold">POS ORDER</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-[#1a1a1a]">
                        {Object.values(raceData)
                            .sort((a, b) => {
                                const fallbackMap = year === 2025 ? ROSTER_2025 : ROSTER_2024;
                                const teamA = driverTeamMap[a.driverNumber] || fallbackMap[a.driverNumber] || '';
                                const teamB = driverTeamMap[b.driverNumber] || fallbackMap[b.driverNumber] || '';

                                const getRank = (name) => {
                                    if (!name) return 999;
                                    const idx = TEAM_PRIORITY_KEYWORDS.findIndex((k) =>
                                        name.toString().toLowerCase().includes(k.toLowerCase()),
                                    );
                                    return idx === -1 ? 999 : idx;
                                };

                                const rankA = getRank(teamA);
                                const rankB = getRank(teamB);

                                if (rankA !== rankB) return rankA - rankB;
                                return a.driverNumber - b.driverNumber;
                            })
                            .map((car) => {
                                const fallbackMap = year === 2025 ? ROSTER_2025 : ROSTER_2024;
                                const teamName = driverTeamMap[car.driverNumber] || fallbackMap[car.driverNumber];

                                return (
                                    <div
                                        key={car.driverNumber}
                                        className="bg-white/5 p-3 rounded-xl flex items-center justify-between border border-white/5 transition-colors hover:bg-white/10"
                                    >
                                        <div className="flex items-center gap-4">
                                            <span
                                                className={`font-mono font-bold text-sm w-6 text-right ${car.position && car.position <= 3 ? 'text-yellow-400' : 'text-gray-500'}`}
                                            >
                                                {car.position && car.position > 0 ? car.position : '-'}
                                            </span>
                                            <div
                                                className="w-10 h-8 rounded flex items-center justify-center font-bold text-xs text-white shadow-sm"
                                                style={{ backgroundColor: getTeamColor(car.driverNumber, year) }}
                                            >
                                                {getDriverLabel(car.driverNumber)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm text-gray-200">
                                                    {getDriverLabel(car.driverNumber)}{' '}
                                                    <span className="text-xs text-gray-500 font-normal">
                                                        #{car.driverNumber}
                                                    </span>
                                                </div>
                                                <div className="text-[10px] text-gray-500 font-mono truncate w-24">
                                                    {teamName || '-'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-white font-mono font-bold">
                                                {car.speed}{' '}
                                                <span className="text-xs text-gray-500 font-normal">km/h</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                        {Object.keys(raceData).length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-2">
                                <Loader2 className="animate-spin" />
                                <span className="text-sm">Waiting for data...</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function getTeamColor(number, year) {
    const num = parseInt(number);
    if (num === 1 || (year == 2024) & (num === 11) || (year == 2025) & (num === 22)) return '#3671C6';
    if (num === 16 || (year === 2024) & (num === 55) || (year === 2025) & (num === 44)) return '#E8002D';
    if (num === 4 || num === 81) return '#FF8000';
    if (num === 63 || (year === 2024) & (num === 44) || (year === 2025) & (num === 12)) return '#27F4D2';
    if (num === 14 || num === 18) return '#229971';
    if (num === 23 || num === 2 || num === 43 || (year === 2025) & (num === 55)) return '#64C4FF';
    if (num === 10 || num === 31 || num === 61) return '#FF87BC';
    if (num === 3 || num === 22 || num === 30) return '#52E252';
    if (num === 20 || num === 27 || num === 87) return '#B6BABD';
    return '#666666';
}
