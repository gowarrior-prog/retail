'use client';
import Sidebar from './Sidebar';
import Header from './Header';

export default function SidebarWrapper() {
  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50">
        <Header />
      </div>
      <Sidebar />
    </>
  );
}
