/**
 * StatusBar：编辑器底部状态栏（React 版）
 * - 左：分支 / 诊断计数（示例）
 * - 右：光标位置 / 选区字数 / 编码 / 语言 / 保存状态（真实联动）
 */
import { Icon } from '../common/Icon'
import type { EditorFile } from '@/data/editorFiles'

export interface StatusBarProps {
  file: EditorFile
  line: number
  col: number
  selected: number
  /** 当前文件总行数（0 表示空文件不显示） */
  totalLines?: number
}

export function StatusBar({ file, line, col, selected, totalLines = 0 }: StatusBarProps) {
  return (
    <footer className="ed-status">
      <div className="ed-status-left">
        <span className="ed-status-item">
          <Icon name="branch" size={12} />
          main
        </span>
        <span className="ed-status-item" title="0 个错误，0 个警告">
          <i className="ed-status-dot is-error" />0
          <i className="ed-status-dot is-warn" />0
        </span>
      </div>

      <div className="ed-status-right">
        <span className="ed-status-item">
          Ln {line}, Col {col}
        </span>
        {totalLines > 0 && <span className="ed-status-item">{totalLines} 行</span>}
        {selected > 1 && <span className="ed-status-item">{selected} 个字符已选中</span>}
        <span className="ed-status-item">UTF-8</span>
        <span className="ed-status-item">{file.language}</span>
        <span className="ed-status-item">空格：2</span>
        <span className="ed-status-item" title={file.modified ? '有未保存的修改' : '已保存'}>
          {!file.modified ? (
            <Icon name="check" size={11} className="ed-status-saved" />
          ) : (
            <span className="ed-status-dot is-dirty" />
          )}
          {file.modified ? '未保存' : '已保存'}
        </span>
      </div>
    </footer>
  )
}
