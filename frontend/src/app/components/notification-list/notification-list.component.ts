import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { NgEventBus } from 'ng-event-bus';

import { Notification, NotificationType } from '../../models/notification.model';
import { NotificationService, NotificationEvent } from '../../services/notification.service';
import { SignalRService, SignalREvent } from '../../services/signalr.service';

@Component({
  selector: 'app-notification-list',
  templateUrl: './notification-list.component.html',
  styleUrls: ['./notification-list.component.scss']
})
export class NotificationListComponent implements OnInit, OnDestroy {
  // Notifications to display
  notifications: Notification[] = [];
  
  // Connection status
  isConnected = false;
  
  // Filter states
  showReadNotifications = true;
  selectedType: NotificationType | null = null;
  
  // Track subscriptions for cleanup
  private subscriptions: Subscription[] = [];
  
  constructor(
    private notificationService: NotificationService,
    private signalRService: SignalRService,
    private eventBus: NgEventBus
  ) {}

  ngOnInit(): void {
    // Subscribe to notifications changes
    this.subscriptions.push(
      this.notificationService.notifications$.subscribe(
        notifications => {
          this.notifications = this.applyFilters(notifications);
        }
      )
    );

    // Subscribe to connection state changes
    this.subscriptions.push(
      this.signalRService.connectionState$.subscribe(
        isConnected => {
          this.isConnected = isConnected;
        }
      )
    );

    // Initialize the service and load notifications
    this.initialize();
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Initialize the notification service
   */
  async initialize(): Promise<void> {
    try {
      await this.notificationService.initialize();
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  }

  /**
   * Filter the notifications based on user selections
   */
  private applyFilters(notifications: Notification[]): Notification[] {
    return notifications.filter(notification => {
      // Filter by read status
      if (!this.showReadNotifications && notification.isRead) {
        return false;
      }
      
      // Filter by type
      if (this.selectedType !== null && notification.type !== this.selectedType) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Toggle showing read notifications
   */
  toggleReadNotifications(): void {
    this.showReadNotifications = !this.showReadNotifications;
    this.updateFilteredNotifications();
  }

  /**
   * Set the type filter
   */
  setTypeFilter(type: NotificationType | null): void {
    this.selectedType = type;
    this.updateFilteredNotifications();
  }

  /**
   * Update the filtered notifications based on current filters
   */
  updateFilteredNotifications(): void {
    this.notifications = this.applyFilters(this.notificationService.notifications$.getValue());
  }

  /**
   * Mark a notification as read
   */
  markAsRead(notification: Notification): void {
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id).subscribe(
        () => {
          console.log('Notification marked as read:', notification.id);
        },
        error => {
          console.error('Error marking notification as read:', error);
        }
      );
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    // Get the notifications that are currently unread
    const unreadNotifications = this.notifications.filter(n => !n.isRead);
    
    if (unreadNotifications.length > 0) {
      // This would normally use a user ID in a real application
      // For this example, we'll use a default user ID
      this.notificationService.markAllAsRead('default-user').subscribe(
        () => {
          console.log('All notifications marked as read');
        },
        error => {
          console.error('Error marking all notifications as read:', error);
        }
      );
    }
  }

  /**
   * Delete a notification
   */
  deleteNotification(notification: Notification): void {
    this.notificationService.deleteNotification(notification.id).subscribe(
      () => {
        console.log('Notification deleted:', notification.id);
      },
      error => {
        console.error('Error deleting notification:', error);
      }
    );
  }

  /**
   * Send a test notification
   */
  sendTestNotification(): void {
    this.notificationService.sendTestNotification().subscribe(
      notification => {
        console.log('Test notification sent:', notification);
      },
      error => {
        console.error('Error sending test notification:', error);
      }
    );
  }

  /**
   * Refresh the connection to SignalR
   */
  refreshConnection(): void {
    this.signalRService.stopConnection().then(() => {
      this.signalRService.startConnection();
    });
  }

  /**
   * Get a CSS class for a notification type
   */
  getNotificationClass(type: NotificationType): string {
    return this.notificationService.getNotificationClass(type);
  }

  /**
   * Get an icon for a notification type
   */
  getNotificationIcon(type: NotificationType): string {
    return this.notificationService.getNotificationIcon(type);
  }

  /**
   * Get a human-readable name for a notification type
   */
  getNotificationTypeName(type: NotificationType): string {
    switch (type) {
      case NotificationType.Success:
        return 'Success';
      case NotificationType.Warning:
        return 'Warning';
      case NotificationType.Error:
        return 'Error';
      case NotificationType.Info:
      default:
        return 'Info';
    }
  }

  /**
   * Format a timestamp as a relative time (e.g., "5 minutes ago")
   */
  getRelativeTime(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    
    // Convert milliseconds to appropriate units
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days} day${days === 1 ? '' : 's'} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    } else {
      return 'Just now';
    }
  }
}
