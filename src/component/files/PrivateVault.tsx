/**
 * PrivateVault：私有空间（React 版）
 * - 锁定态：密码解锁卡片（演示：任意非空密码）
 * - 解锁态：内部搜索（仅此一处，不参与统一搜索）+ 锁定按钮 + 列表 + 详情
 * - 重新锁定清空内部搜索与选择（不留访问痕迹）
 */
import { useMemo, useRef, useState } from 'react'
import { Icon } from '@/component/common/Icon'
import { FileTable } from './FileTable'
import { FileDetail } from './FileDetail'
import { Button } from '@/component/ui/button'
import { useFileManager } from '@/hooks/useFileManager'
import { parseQuery, matchFile } from '@/utils/fileSearch'
import './files.css'

export function PrivateVault() {
  const fm = useFileManager()
  const [locked, setLocked] = useState(true)
  const [password, setPassword] = useState('')
  const [unlocking, setUnlocking] = useState(false)
  const [privateQuery, setPrivateQuery] = useState('')
  const unlockTimer = useRef<number | undefined>(undefined)

  const unlock = () => {
    if (!password || unlocking) return
    setUnlocking(true)
    unlockTimer.current = window.setTimeout(() => {
      setUnlocking(false)
      setLocked(false)
      setPassword('')
    }, 400)
  }

  const lockVault = () => {
    setLocked(true)
    setPrivateQuery('')
    fm.clearSelection()
  }

  const parsed = useMemo(() => parseQuery(privateQuery), [privateQuery])
  const filtered = useMemo(
    () => fm.privateFiles.filter((f) => matchFile(f, parsed, [])),
    [fm.privateFiles, parsed, fm]
  )

  const privateTags = useMemo(() => {
    const set = new Set<string>()
    for (const f of fm.privateFiles) for (const t of f.tags) set.add(t)
    return [...set]
  }, [fm.privateFiles, fm])

  const single =
    fm.selectedIds.length === 1
      ? (fm.privateFiles.find((f) => f.id === fm.selectedIds[0]) ?? null)
      : null

  if (locked) {
    return (
      <div className="fm-lock">
        <div className="fm-lock-card">
          <div className="fm-lock-icon">
            <Icon name="lock" size={26} />
          </div>
          <h2 className="fm-lock-title">私有空间已锁定</h2>
          <p className="fm-lock-desc">
            空间内文件以加密方式存储，输入密码后访问；为保护隐私，私有空间不参与全局统一搜索
          </p>

          <form
            className="fm-lock-form"
            onSubmit={(e) => {
              e.preventDefault()
              unlock()
            }}
          >
            <div className="fm-lock-field">
              <Icon name="lock" size={13} className="fm-lock-field-icon" />
              <input
                className="fm-lock-input"
                type="password"
                placeholder="输入访问密码"
                autoComplete="off"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button variant="primary" className="fm-lock-btn" disabled={!password || unlocking} onClick={unlock}>
              {unlocking ? '验证中…' : '解锁'}
            </Button>
          </form>

          <p className="fm-lock-hint">演示模式：输入任意密码即可解锁（未接入真实加密）</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="fm-tools">
        <div className="fm-vault-badge">
          <Icon name="shield" size={12} />
          <span>私有空间 · 加密</span>
        </div>
        <div className="fm-search is-private">
          <Icon name="search" size={14} className="fm-search-icon" />
          <input
            className="fm-search-input"
            placeholder="私有空间内搜索，支持 #类型 @标签"
            title="示例：合同 #pdf @合同（# 可搜扩展名/类别，条件可叠加）"
            spellCheck={false}
            value={privateQuery}
            onChange={(e) => setPrivateQuery(e.target.value)}
          />
          {privateQuery && (
            <button type="button" className="fm-search-x" aria-label="清空搜索" onClick={() => setPrivateQuery('')}>
              <Icon name="times" size={11} />
            </button>
          )}
        </div>
        <button type="button" className="fm-btn" onClick={lockVault}>
          <Icon name="unlock" size={13} />
          锁定
        </button>
      </div>

      <div className="fm-body">
        <div className="fm-main">
          <div className="fm-crumbs">
            <span className="fm-crumb is-static">
              <Icon name="shield" size={12} /> 私有空间
            </span>
            <span className="fm-crumbs-count">{filtered.length} 个文件</span>
          </div>
          <FileTable
            files={filtered}
            selectedIds={fm.selectedIds}
            emptyHint="试试 #类型（如 #pdf）或 @标签（如 @合同）组合筛选"
            onSelect={(id) => fm.setSelection([id])}
          />
        </div>

        {single && (
          <FileDetail
            file={single}
            availableTags={privateTags}
            onClose={fm.clearSelection}
            onUpdateTags={(tags) => {
              single.tags = tags
              fm.setSelection([single.id])
            }}
            onUpdateNote={(note) => {
              single.note = note
              fm.setSelection([single.id])
            }}
          />
        )}
      </div>
    </>
  )
}
