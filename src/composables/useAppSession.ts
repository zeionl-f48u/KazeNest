/**
 * 全局会话持久化（useAppSession）
 * - 共享同一份 AppSessionSnapshot（模块级单例），App / Editor / AISidebar 各自读写自己那块
 * - restore()：启动时从 settings.json 读一次（模块内缓存，后续组件拿同一份）
 * - save()：防抖落盘（300ms），恢复过程中调用被忽略（避免把默认值覆盖到已保存状态）
 * - flush()：关闭/卸载前立即落盘（防抖窗口内的最后改动不丢）
 *
 * 用法（组件里）：
 *   const { session, restore, save, flush } = useAppSession()
 *   onMounted(async () => {
 *     const s = await restore()
 *     if (s) applySaved(s)   // 把快照里自己的那部分应用到本地状态
 *     window.addEventListener('beforeunload', flush)
 *   })
 *   watch(myState, () => {
 *     writeBackToSession()   // 把本地状态写回 session
 *     save()
 *   }, { deep: true })
 */
import { ref } from 'vue'
import { getAppSession, setAppSession } from '../utils'
import type { AppSessionSnapshot } from '../utils'

/** 快照单例：restore 后所有调用方共享，避免重复读盘 */
const session = ref<AppSessionSnapshot | null>(null)
/** 恢复中标志：restore 期间 save() 一律忽略 */
let restoring = false
let timer: number | undefined

export function useAppSession() {
  /** 读取已保存快照（仅首次真正读盘；返回 null 表示从未保存过） */
  async function restore(): Promise<AppSessionSnapshot | null> {
    if (session.value) return session.value
    restoring = true
    try {
      session.value = await getAppSession()
      return session.value
    } finally {
      restoring = false
    }
  }

  /** 防抖落盘：连续改动只写最后一次（300ms 内无新改动才写） */
  function save() {
    if (restoring || !session.value) return
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      setAppSession(session.value!)
    }, 300)
  }

  /** 立即落盘（beforeunload / 组件卸载前调用，防抖窗口内的改动不丢） */
  function flush() {
    window.clearTimeout(timer)
    if (!restoring && session.value) setAppSession(session.value)
  }

  return { session, restore, save, flush }
}