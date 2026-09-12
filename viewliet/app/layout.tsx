import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Viewliet — 사진에서 시작하는 나의 공간",
  description:
    "원룸 사진과 전용면적으로 추정 평면도와 3D 공간을 만들어 보세요.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
