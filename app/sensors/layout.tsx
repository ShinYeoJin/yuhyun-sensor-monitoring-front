import { Sidebar } from '@/components/layout/Sidebar'

export default function SensorsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-surface-page">
      <Sidebar />
      {children}
    </div>
  )
}