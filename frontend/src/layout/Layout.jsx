import { Outlet } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";

/**
 * The root layout component for the entire application. It renders the main
 * layout structure, including the header, main outlet, and footer.
 *
 * @returns {JSX.Element} The rendered layout component.
 */
export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}
