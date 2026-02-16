// src/services/fcm/index.js
export {
  isFCMSupported,
  initializeMessaging,
  requestNotificationPermission,
  getFCMToken,
  getFCMTokenWithRetry,
  onForegroundMessage,
  showLocalNotification,
  deleteFCMToken,
  getPermissionStatus,
  checkFCMReadiness,
  default as fcmService
} from './fcmService';