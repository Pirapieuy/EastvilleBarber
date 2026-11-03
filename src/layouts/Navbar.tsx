import { ReactNode } from "react"

export interface NavbarProps {
  children?: ReactNode
  className?: string
}

export function Navbar({ children, className = "" }: NavbarProps) {
  return <nav className={`app-navbar ${className}`}>{children}</nav>
}

export default Navbar
