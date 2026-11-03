import { ReactNode } from "react"
import { IconName } from "../../types"

const iconPaths: Record<IconName, ReactNode> = {
  alert: (
    <>
      <path d="M12 8v4.5M12 16.3v.2" />
      <circle cx="12" cy="12" r="9" />
    </>
  ),
  arrow: <path d="M5 12h14M14 7l5 5-5 5" />,
  back: <path d="m14 6-6 6 6 6M8 12h11" />,
  calendar: (
    <>
      <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" />
      <path d="M8 3.5v4M16 3.5v4M3.5 10h17" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h4l1.5-2h5L16 8h4v11H4V8Z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  cash: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <circle cx="12" cy="12" r="3" />
      <path d="M6.5 9h.01M17.5 15h.01" />
    </>
  ),
  cashier: (
    <>
      <path d="M5 4h14v5H5zM4 9h16v11H4z" />
      <path d="M8 13h3M8 16h3M15.5 13.5v3" />
    </>
  ),
  chart: (
    <>
      <path d="M5 20V10M12 20V4M19 20v-7" />
      <path d="M3 20h18" />
    </>
  ),
  check: <path d="m5 12 4.2 4.2L19 6.8" />,
  chevron: <path d="m8 10 4 4 4-4" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  expense: (
    <>
      <path d="M12 3v18M7.5 7.5H15a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h7.5" />
      <path d="m5 5-2 2 2 2" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.75" />
    </>
  ),
  file: (
    <>
      <path d="M6 3h8l4 4v14H6V3Z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </>
  ),
  history: (
    <>
      <path d="M4 7v5h5M4.8 11a8 8 0 1 1 2.1 6.8" />
      <path d="M12 8v4l3 2" />
    </>
  ),
  home: (
    <>
      <path d="m3 11 9-8 9 8" />
      <path d="M5.5 9.5V21h13V9.5M9.5 21v-7h5v7" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10" width="15" height="10" rx="2.5" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
    </>
  ),
  logout: (
    <>
      <path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  minus: <path d="M6 12h12" />,
  pencil: (
    <>
      <path d="m14 5 5 5L9 20l-5 1 1-5L15 6Z" />
      <path d="m12 8 5 5" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c.5-3.7 2.3-5.5 5.5-5.5s5 1.8 5.5 5.5M15 5.5a3 3 0 0 1 0 5.8M16 14c2.7.2 4.2 1.9 4.5 5" />
    </>
  ),
  plus: <path d="M12 6v12M6 12h12" />,
  print: (
    <>
      <path d="M7 9V3h10v6M7 18H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M7 14h10v7H7z" />
    </>
  ),
  product: (
    <>
      <path d="m4 8 8-4 8 4-8 4-8-4Z" />
      <path d="m4 8 8 4 8-4v9l-8 4-8-4V8ZM12 12v9" />
    </>
  ),
  qris: (
    <>
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" />
      <path d="M15 14h2v2h-2zM18 18h2v2h-2zM14 19h2M19 14h1" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </>
  ),
  restore: <path d="M4 7v5h5M4.8 11a8 8 0 1 1 2.1 6.8" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 13.5v-3l-2-.7-.7-1.7.9-1.9-2.1-2.1-1.9.9-1.7-.7-.7-2h-3l-.7 2-1.7.7-1.9-.9-2.1 2.1.9 1.9-.7 1.7-2 .7v3l2 .7.7 1.7-.9 1.9 2.1 2.1 1.9-.9 1.7.7.7 2h3l.7-2 1.7-.7 1.9.9 2.1-2.1-.9-1.9.7-1.7 2-.7Z" />
    </>
  ),
  team: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c.5-3.7 2.3-5.5 5.5-5.5s5 1.8 5.5 5.5M15 5.5a3 3 0 0 1 0 5.8M16 14c2.7.2 4.2 1.9 4.5 5" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9 3h6l1 4H8l1-4ZM7 7l1 14h8l1-14" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20c.6-4 2.8-6 6.5-6s5.9 2 6.5 6" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 7.5h14.5A2.5 2.5 0 0 1 21 10v8a2.5 2.5 0 0 1-2.5 2.5h-14A2.5 2.5 0 0 1 2 18V6a2.5 2.5 0 0 1 2.5-2.5H17" />
      <path d="M16 12h5v4h-5a2 2 0 0 1 0-4Z" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M20.5 11.7a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.4-4.7A8.5 8.5 0 1 1 20.5 11.7Z" />
      <path d="M8.2 7.8c.3-.5.7-.5 1-.1l1 1.8c.2.3.1.7-.2 1l-.6.6c.8 1.6 2 2.7 3.6 3.4l.6-.7c.3-.3.6-.4 1-.2l1.8.9c.4.2.4.7.2 1-1 1.6-2.4 1.8-4.2 1.1-3.1-1.2-5.3-3.4-6.4-6.4-.5-1.2.2-2.2 1.2-2.4Z" />
    </>
  ),
}

export function Icon({
  name,
  className = "",
}: {
  name: IconName
  className?: string
}) {
  return (
    <svg
      className={`icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      {iconPaths[name]}
    </svg>
  )
}
