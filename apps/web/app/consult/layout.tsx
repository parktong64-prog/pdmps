import { SiteFooter } from "../SiteFooter";

export default function ConsultLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SiteFooter />
    </>
  );
}
