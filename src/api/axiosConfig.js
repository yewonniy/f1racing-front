import axios from 'axios';

// 배포 상태(production)일 때는 빈 문자열 -> vercel.json 프록시가 작동
// 로컬 개발(development)일 때는 AWS IP 직접 호출
export const API_BASE_URL = process.env.NODE_ENV === 'production' ? '' : 'http://34.221.206.128:8080';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;
