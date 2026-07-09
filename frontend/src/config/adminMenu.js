/**
 * Shared admin menu definition.
 *
 * Single source of truth for the admin console sidebar (AdminView.vue) AND the
 * permission tree (AdminPermissions.vue). Keeping this in one place ensures the
 * "扫描站点页面" feature can reliably enumerate every backend admin page.
 *
 * Each item: { key, label, icon }
 * Each group: { title, items: [...] }
 */
export const adminMenuGroups = [
  {
    title: '会议管理',
    items: [
      { key: 'meeting',      label: '会议信息',  icon: 'circle-info' },
      { key: 'schedule',     label: '日程安排',  icon: 'calendar-days' },
      { key: 'meetingGuide', label: '参会须知',  icon: 'clipboard-check' },
      { key: 'notification', label: '发送邮件',  icon: 'paper-plane' },
    ],
  },
  {
    title: '人员与组织',
    items: [
      { key: 'attendees',     label: '参会人员',  icon: 'users' },
      { key: 'departments',   label: '部门维护',  icon: 'building' },
      { key: 'organizations', label: '组织维护',  icon: 'globe' },
    ],
  },
  {
    title: '内容管理',
    items: [
      { key: 'homeSections', label: '首页管理', icon: 'cubes' },
      { key: 'reflections',  label: '反思管理',  icon: 'comments' },
      { key: 'gallery',      label: '剪影管理',  icon: 'images' },
      { key: 'past',         label: '往届会议',  icon: 'clock-rotate-left' },
    ],
  },
  {
    title: '数据与设置',
    items: [
      { key: 'analytics',   label: '数据分析',  icon: 'chart-bar' },
      { key: 'settings',    label: '系统设置',  icon: 'gear' },
      { key: 'permissions', label: '权限设置',  icon: 'shield-halved' },
      { key: 'users',       label: '角色管理',   icon: 'users-gear',  superAdminOnly: true },
      { key: 'fileManager', label: '文件管理',  icon: 'folder-open' },
      { key: 'faIcons',     label: 'FA图标库',  icon: 'icons' },
    ],
  },
];

/**
 * Human-readable labels for known frontend routes.
 * Used when scanning router.getRoutes() so the permission tree shows friendly
 * names instead of raw paths. Unknown paths fall back to the route name/path.
 */
export const frontendRouteLabels = {
  '/':               '首页',
  '/schedule':       '日程安排',
  '/venue':          '会议地点',
  '/meeting-guide':  '参会须知',
  '/entry-guide':    '入校指引',
  '/attendees':      '参会人员',
  '/reflections':    '会后反思',
  '/gallery':        '会议剪影',
  '/past-meetings':  '往届会议',
  '/weather':        '天气',
};

/**
 * Frontend routes that are part of the auth/login flow (or the admin SPA entry)
 * and therefore should NOT appear as configurable public pages in the tree.
 */
export const excludedFrontendPaths = new Set([
  '/login',
  '/auth/callback',
  '/admin',
]);
