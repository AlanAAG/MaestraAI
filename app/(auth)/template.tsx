import PageTransition from '@/components/ui/PageTransition'

// Templates remount on every navigation → PageTransition animates each page enter.
export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>
}
