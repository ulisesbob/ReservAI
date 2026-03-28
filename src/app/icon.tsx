import { ImageResponse } from "next/og"

export const runtime = "edge"
export const size = { width: 32, height: 32 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 64 72"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Rounded rect + speech bubble tail */}
          <path
            d="M4 14C4 6.268 10.268 0 18 0h28c7.732 0 14 6.268 14 14v34c0 7.732-6.268 14-14 14H38l-3.8 8.2a2.5 2.5 0 0 1-4.4 0L26 62H18C10.268 62 4 55.732 4 48V14Z"
            fill="#059669"
          />

          {/* Calendar grid row 1 */}
          <rect x="12" y="14" width="9" height="9" rx="2" fill="white" />
          <rect x="27.5" y="14" width="9" height="9" rx="2" fill="white" />
          <rect x="43" y="14" width="9" height="9" rx="2" fill="white" />

          {/* Calendar grid row 2 */}
          <rect x="12" y="32" width="9" height="9" rx="2" fill="white" />
          <rect x="27.5" y="32" width="9" height="9" rx="2" fill="white" />

          {/* Checkmark bottom-right */}
          <path
            d="M43.5 37.5l3.5 3.5 6-6.5"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { ...size },
  )
}
