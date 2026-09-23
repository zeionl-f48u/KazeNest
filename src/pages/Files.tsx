/**
 * Files：文件管理页面（React 版）
 * - 顶部三 Tab：文件夹（资源管理器）/ 资料空间 / 私有空间
 * - 各空间实现见 component/files：FilesExplorer / FilesLibrary / PrivateVault
 * - 启动恢复：目录树 / 空间文件（含标签注释）关闭后重开恢复（幂等）
 */
import { useEffect, useState } from 'react'
import { Icon } from '@/component/common/Icon'
import { FilesExplorer } from '@/component/files/FilesExplorer'
import { FilesLibrary } from '@/component/files/FilesLibrary'
import { PrivateVault } from '@/component/files/PrivateVault'
import { useFileManager, restoreFiles } from '@/hooks/useFileManager'
import { HookSidebar } from '@/component/ui/hook-sidebar'
import '@/component/files/files.css'

export function Files() {
  const fm = useFileManager()
  /* Rare UI：快捷视图（演示：仅切换选中态，不参与筛选） */
  const [quick, setQuick] = useState(0)

  useEffect(() => {
    void restoreFiles()
  }, [])

  return (
    <div className="fm fm-with-rail">
      <aside className="fm-rail">
        <HookSidebar
          label="快捷视图"
          items={['全部', '最近', '收藏', '共享', '回收站']}
          value={quick}
          onChange={setQuick}
          color="var(--kn-brand-500)"
        />
      </aside>

      <div className="fm-page">
        <div className="fm-tabs">
        <button
          type="button"
          className={fm.space === 'folder' ? 'is-on' : ''}
          onClick={() => fm.setSpace('folder')}
        >
          <Icon name="folder" size={13} />
          <span>文件夹</span>
          {fm.folderOpened && <span className="fm-tabs-count">{fm.folderFiles.length}</span>}
        </button>
        <button
          type="button"
          className={fm.space === 'library' ? 'is-on' : ''}
          onClick={() => fm.setSpace('library')}
        >
          <Icon name="tag" size={13} />
          <span>资料空间</span>
          <span className="fm-tabs-count">{fm.libraryFiles.length}</span>
        </button>
        <button
          type="button"
          className={fm.space === 'private' ? 'is-on' : ''}
          onClick={() => fm.setSpace('private')}
        >
          <Icon name="lock" size={13} />
          <span>私有空间</span>
          <span className="fm-tabs-count">{fm.privateFiles.length}</span>
        </button>
      </div>

        {fm.space === 'folder' && <FilesExplorer />}
        {fm.space === 'library' && <FilesLibrary />}
        {fm.space === 'private' && <PrivateVault />}
      </div>
    </div>
  )
}
