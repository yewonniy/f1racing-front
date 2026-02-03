import React, { useState, useEffect } from 'react';
import axios from 'axios';

// ==========================================
// 1. 타입 정의 (Types)
// ==========================================
export interface LapAndFastestDriver {
    driverName: string; // 드라이버 번호 혹은 이름
    lapNumber: number; // 랩 번호
    dateStart: string; // LocalDateTime (ISO String)
    lapDuration: number; // 랩 소요 시간
}

interface LiveRaceInfoProps {
    year: number;
    sessionKey: number;
    currentTime: Date; // 타임슬라이더나 영상 플레이어에서 넘어오는 현재 시간
}

// ==========================================
// 2. API 호출 함수 (API)
// ==========================================
const fetchLapInfo = async (year: number, sessionKey: number): Promise<LapAndFastestDriver[]> => {
    try {
        // 백엔드 API 주소에 맞게 수정 필요 (예: http://localhost:8080/api/race/lapInfo)
        const response = await axios.get<LapAndFastestDriver[]>(`/race/lapInfo`, {
            params: { year, sessionKey },
        });
        return response.data;
    } catch (error) {
        console.error('랩 정보 로딩 실패:', error);
        return [];
    }
};

// ==========================================
// 3. 커스텀 훅 (Logic)
// ==========================================
const useRaceLapInfo = (year: number, sessionKey: number, currentTime: Date) => {
    const [lapList, setLapList] = useState<LapAndFastestDriver[]>([]);
    const [currentLapInfo, setCurrentLapInfo] = useState<LapAndFastestDriver | null>(null);

    // (1) 데이터 초기 로드
    useEffect(() => {
        if (!year || !sessionKey) return;

        fetchLapInfo(year, sessionKey).then((data) => {
            // 혹시 모를 순서 꼬임 방지를 위해 lapNumber 오름차순 정렬
            const sortedData = data.sort((a, b) => a.lapNumber - b.lapNumber);
            setLapList(sortedData);
        });
    }, [year, sessionKey]);

    // (2) 현재 시간에 맞는 랩 찾기 (currentTime이 변할 때마다 실행)
    useEffect(() => {
        if (!currentTime || lapList.length === 0) return;

        const currentTs = currentTime.getTime();
        let foundLap = null;

        // 리스트를 역순(최신 랩부터)으로 돌면서, 시작 시간이 현재 시간보다 '이전'인 첫 번째 랩을 찾음
        for (let i = lapList.length - 1; i >= 0; i--) {
            const lapStartTime = new Date(lapList[i].dateStart).getTime();

            if (lapStartTime <= currentTs) {
                foundLap = lapList[i];
                break;
            }
        }

        // 랩이 실제로 변경되었을 때만 상태 업데이트 (렌더링 최적화)
        if (foundLap && foundLap.lapNumber !== currentLapInfo?.lapNumber) {
            setCurrentLapInfo(foundLap);
        }
    }, [currentTime, lapList, currentLapInfo]);

    return { currentLapInfo };
};

// ==========================================
// 4. 메인 컴포넌트 (UI)
// ==========================================
const LiveRaceInfo: React.FC<LiveRaceInfoProps> = ({ year, sessionKey, currentTime }) => {
    const { currentLapInfo } = useRaceLapInfo(year, sessionKey, currentTime);

    // 데이터가 아직 없거나 레이스 시작 전일 때
    if (!currentLapInfo) {
        return (
            <div className="w-64 p-4 bg-gray-900 text-gray-500 rounded-lg shadow-lg border border-gray-800 text-center">
                <span className="text-sm">Waiting for Start...</span>
            </div>
        );
    }

    return (
        <div className="w-64 p-4 bg-gray-900 text-white rounded-lg shadow-lg border border-gray-700">
            <h3 className="text-gray-400 text-xs font-semibold uppercase mb-2 tracking-wider">Live Session Info</h3>

            {/* 현재 랩 정보 */}
            <div className="flex justify-between items-end mb-4 border-b border-gray-800 pb-3">
                <span className="text-sm font-medium text-gray-300">Current Lap</span>
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-red-500">{currentLapInfo.lapNumber}</span>
                    <span className="text-xs text-gray-500">Lap</span>
                </div>
            </div>

            {/* 패스티스트 랩 정보 */}
            <div>
                <span className="text-xs text-gray-400 mb-1 block">Current Fastest Lap</span>
                <div className="flex justify-between items-center bg-gray-800 rounded px-3 py-2">
                    {/* 드라이버 번호/이름 */}
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-400">Driver</span>
                        <span className="text-lg font-bold text-yellow-400">NO. {currentLapInfo.driverName}</span>
                    </div>
                    {/* 기록 */}
                    <div className="text-right">
                        <span className="text-xs text-gray-400">Time</span>
                        <span className="block font-mono text-sm text-white">{currentLapInfo.lapDuration}s</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveRaceInfo;
