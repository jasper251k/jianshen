import { RPE_SCALE } from '../util'

// RPE 对照表：平常不显示，点「RPE」弹出；点某一级可直接填进去
export default function RpeSheet({ onPick, onClose }: { onPick?: (n: number) => void; onClose: () => void }) {
  return (
    <div
      className="sheet-mask"
      onClick={(e) => {
        e.stopPropagation() // 从「改一组」里打开时，别把那个也关掉
        onClose()
      }}
    >
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>RPE 对照</h2>
        <ul className="rpe-list">
          {RPE_SCALE.map(([n, text]) => (
            <li key={n}>
              <button
                onClick={() => {
                  onPick?.(n)
                  onClose()
                }}
              >
                <b>{n}</b>
                <span>{text}</span>
              </button>
            </li>
          ))}
        </ul>
        <button className="btn" onClick={onClose}>
          关闭
        </button>
      </div>
    </div>
  )
}
