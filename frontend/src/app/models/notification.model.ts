/**
 * Enumeration of notification types
 */
export enum NotificationType {
  Info = 0,
  Success = 1,
  Warning = 2,
  Error = 3
}

/**
 * Interface representing a notification entity
 */
export interface Notification {
  /**
   * Unique identifier for the notification
   */
  id: string;
  
  /**
   * The title of the notification
   */
  title: string;
  
  /**
   * The message content of the notification
   */
  message: string;
  
  /**
   * The type of notification (info, warning, error, success)
   */
  type: NotificationType;
  
  /**
   * The timestamp when the notification was created
   */
  timestamp: Date;
  
  /**
   * Flag indicating if the notification has been read
   */
  isRead: boolean;
  
  /**
   * Optional user ID that the notification is targeted to
   */
  userId?: string;
}
