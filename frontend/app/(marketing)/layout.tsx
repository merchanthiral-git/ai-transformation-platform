import Navbar from "../components/marketing/Navbar";
import Footer from "../components/marketing/Footer";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#0F1C2A" }}>
      <Navbar />
      <main style={{ flex: 1, paddingTop: 72 }}>{children}</main>
      <Footer />
    </div>
  );
}
