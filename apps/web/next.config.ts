import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // 영상/사진 업로드(관리자)와 AI 시뮬레이션 사진 전송(환자) 모두
      // 기본 1MB 제한을 넘기 때문에 procedure-media 버킷 제한(50MB)에 맞춘다.
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
