/**
 * Files：文件管理页面（React 版）
 * - 顶部三 Tab：文件夹（资源管理器）/ 资料空间 / 私有空间
 * - 各空间实现见 component/files：FilesExplorer / FilesLibrary / PrivateVault
 * - 启动恢复：目录树 / 空间文件（含标签注释）关闭后重开恢复（幂等）
 */
import { useEffect } from 'react'
import { Icon } from '@/component/common/Icon'
import { FilesExplorer } from '@/component/files/FilesExplorer'
import { FilesLibrary } from '@/component/files/FilesLibrary'
import { PrivateVault } from '@/component/files/PrivateVault'
import { useFileManager, restoreFiles } from '@/hooks/useFileManager'
import '@/component/files/files.css'

export function Files() {
  const fm = useFileManager()

  useEffect(() => {
    void restoreFiles()
  }, [])

  return (
    <div className="fm">
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
  )
}
