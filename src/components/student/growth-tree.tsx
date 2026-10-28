import type { CSSProperties } from "react"

// Original illustration from Pablo's student-experience prototype.
export function GrowthTree({
  progress,
  compact = false,
  decorative = false,
}: {
  progress: number
  compact?: boolean
  decorative?: boolean
}) {
  const value = Math.max(0, Math.min(100, progress))
  const clamp = (n: number) => Math.max(0, Math.min(1, n))
  const sprout = clamp(value / 33),
    branch = clamp((value - 33) / 34),
    crown = clamp((value - 67) / 33)
  const style = {
    "--sx-stem-visible": sprout,
    "--sx-branch-visible": branch,
    "--sx-crown-visible": crown,
    "--sx-stem-draw": 100 - sprout * 100,
    "--sx-branch-draw": 100 - branch * 100,
    "--sx-crown-draw": 100 - crown * 100,
    "--sx-sprout-leaves": clamp((value - 9) / 24),
    "--sx-branch-leaves": clamp((value - 40) / 27),
    "--sx-crown-leaves": clamp((value - 73) / 27),
  } as CSSProperties
  return (
    <div
      className={`sx-growth-tree ${compact ? "student-tree-compact" : ""}`}
      style={style}
      role={decorative ? undefined : "progressbar"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : "Onboarding progress"}
      aria-valuemin={decorative ? undefined : 0}
      aria-valuemax={decorative ? undefined : 100}
      aria-valuenow={decorative ? undefined : value}
      aria-valuetext={decorative ? undefined : `${value}% complete`}
    >
      <svg
        className="sx-growth-art"
        viewBox="0 0 280 300"
        aria-hidden="true"
        focusable="false"
        xmlns="http://www.w3.org/2000/svg"
      >
        <ellipse className="sx-tree-soil" cx="141" cy="267" rx="53" ry="6" />
        <path className="sx-tree-ground" d="M79 267 C111 269 167 269 201 267" />
        <g className="sx-tree-future">
          <TreeShape />
        </g>
        <g className="sx-tree-seed">
          <path d="M135 267 C132 260 139 256 148 261 C150 269 143 274 135 267Z" />
          <path className="sx-tree-seed-line" d="M137 267 Q141 263 146 262" />
        </g>

        <TreeShape />
      </svg>
    </div>
  )
}

function TreeShape() {
  return (
    <>
      <g className="sx-tree-wood">
        <path className="sx-tree-stem" pathLength="100" d="M141 266 C137 247 140 229 143 209" />
        <path
          className="sx-tree-sprout-branch"
          pathLength="100"
          d="M140 240 Q128 230 116 229 M142 225 Q154 218 163 210"
        />
        <path
          className="sx-tree-branch sx-tree-main-branch"
          pathLength="100"
          d="M143 209 C148 186 143 171 147 149"
        />
        <path className="sx-tree-branch" pathLength="100" d="M145 203 C131 192 112 180 95 176" />
        <path className="sx-tree-branch" pathLength="100" d="M146 185 C157 177 176 167 187 151" />
        <path className="sx-tree-branch" pathLength="100" d="M146 160 C133 150 123 140 119 126" />
        <path
          className="sx-tree-crown sx-tree-main-crown"
          pathLength="100"
          d="M147 149 C154 127 150 108 147 88"
        />
        <path className="sx-tree-crown" pathLength="100" d="M152 124 C167 111 181 102 188 89" />
        <path className="sx-tree-crown" pathLength="100" d="M145 145 C124 140 107 122 102 102" />
        <path className="sx-tree-crown" pathLength="100" d="M145 201 C154 197 172 195 185 184" />
        <path className="sx-tree-crown" pathLength="100" d="M119 188 C105 188 89 189 76 180" />
        <path className="sx-tree-crown" pathLength="100" d="M168 172 C179 172 193 173 205 166" />
      </g>

      <g className="sx-tree-leaf sx-tree-sprout-leaf">
        <path
          className="sx-leaf-deep"
          d="M140 240 C119 241 104 230 108 214 C126 211 141 222 140 240Z"
        />
        <path className="sx-leaf-vein" d="M140 240 Q127 230 116 222" />
      </g>
      <g className="sx-tree-leaf sx-tree-sprout-leaf">
        <path
          className="sx-leaf-light"
          d="M142 225 C140 207 153 194 172 198 C175 215 160 228 142 225Z"
        />
        <path className="sx-leaf-vein" d="M142 225 Q155 214 164 205" />
      </g>

      <g className="sx-tree-leaf sx-tree-branch-leaf">
        <path className="sx-leaf-mid" d="M105 180 C83 183 66 169 70 150 C90 147 109 158 105 180Z" />
        <path className="sx-leaf-vein" d="M105 180 Q91 167 79 159" />
      </g>
      <g className="sx-tree-leaf sx-tree-branch-leaf">
        <path
          className="sx-leaf-light"
          d="M123 165 C104 158 97 142 104 127 C123 129 134 145 123 165Z"
        />
        <path className="sx-leaf-vein" d="M123 165 Q115 148 110 138" />
      </g>
      <g className="sx-tree-leaf sx-tree-branch-leaf">
        <path
          className="sx-leaf-deep"
          d="M175 168 C169 148 181 130 201 131 C208 150 194 167 175 168Z"
        />
        <path className="sx-leaf-vein" d="M175 168 Q186 153 194 140" />
      </g>
      <g className="sx-tree-leaf sx-tree-branch-leaf">
        <path
          className="sx-leaf-mid"
          d="M120 130 C103 122 99 105 109 92 C127 98 133 114 120 130Z"
        />
        <path className="sx-leaf-vein" d="M120 130 Q117 113 113 102" />
      </g>

      <g className="sx-tree-leaf sx-tree-crown-leaf">
        <path className="sx-leaf-deep" d="M148 104 C130 93 130 72 145 58 C163 69 166 91 148 104Z" />
        <path className="sx-leaf-vein" d="M148 104 Q146 85 146 69" />
      </g>
      <g className="sx-tree-leaf sx-tree-crown-leaf">
        <path
          className="sx-leaf-light"
          d="M155 129 C152 109 165 94 184 98 C188 116 174 130 155 129Z"
        />
        <path className="sx-leaf-vein" d="M155 129 Q166 117 176 105" />
      </g>
      <g className="sx-tree-leaf sx-tree-crown-leaf">
        <path className="sx-leaf-mid" d="M184 97 C176 78 186 61 206 59 C216 76 205 94 184 97Z" />
        <path className="sx-leaf-vein" d="M184 97 Q193 83 201 69" />
      </g>
      <g className="sx-tree-leaf sx-tree-crown-leaf">
        <path className="sx-leaf-light" d="M111 121 C88 121 73 106 78 86 C98 85 116 100 111 121Z" />
        <path className="sx-leaf-vein" d="M111 121 Q97 105 86 94" />
      </g>
      <g className="sx-tree-leaf sx-tree-crown-leaf">
        <path
          className="sx-leaf-mid"
          d="M145 152 C128 144 123 124 133 110 C151 116 157 134 145 152Z"
        />
        <path className="sx-leaf-vein" d="M145 152 Q139 132 136 120" />
      </g>
      <g className="sx-tree-leaf sx-tree-crown-leaf">
        <path
          className="sx-leaf-mid"
          d="M180 188 C185 168 204 160 220 171 C217 190 197 200 180 188Z"
        />
        <path className="sx-leaf-vein" d="M180 188 Q196 184 210 177" />
      </g>
      <g className="sx-tree-leaf sx-tree-crown-leaf">
        <path className="sx-leaf-light" d="M87 186 C69 191 53 180 54 164 C72 158 87 169 87 186Z" />
        <path className="sx-leaf-vein" d="M87 186 Q73 175 62 169" />
      </g>
      <g className="sx-tree-leaf sx-tree-crown-leaf">
        <path
          className="sx-leaf-light"
          d="M196 170 C198 151 213 140 230 147 C231 164 215 177 196 170Z"
        />
        <path className="sx-leaf-vein" d="M196 170 Q210 160 222 153" />
      </g>
    </>
  )
}
