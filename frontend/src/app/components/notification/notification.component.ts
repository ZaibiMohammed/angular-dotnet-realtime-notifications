import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { NgEventBus } from 'ng-event-bus';
import { NotificationService, NotificationEvent } from '../../services/notification.service';
import { Notification, NotificationType } from '../../models/notification.model';

@Component({
  selector: 'app-notification',
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.scss']
})
export class NotificationComponent implements OnInit, OnDestroy {
  notifications$: Observable<Notification[]>;
  unreadCount$: Observable<number>;
  
  // We need to maintain both the observable and the subscription
  private subscription = new Subscription();
  private userId = 'user1'; // Example user ID - this would typically come from auth service

  // For template access
  notificationType = NotificationType;

  constructor(
    private notificationService: NotificationService,
    private eventBus: NgEventBus
  ) {
    this.notifications$ = this.notificationService.notifications$;
    this.unreadCount$ = this.notificationService.unreadCount$;
  }

  ngOnInit(): void {
    // Initialize the notification service and load initial data
    this.notificationService.initialize(this.userId).catch(err => {
      console.error('Failed to initialize notification service:', err);
    });

    // Subscribe to notification events
    this.subscribeToNotificationEvents();
  }

  /**
   * Subscribe to events from the notification service via NgEventBus
   */
  private subscribeToNotificationEvents(): void {
    // Notification received
    this.subscription.add(
      this.eventBus.on(NotificationEvent.NOTIFICATION_ADDED).subscribe(() => {
        // You could play a sound, show a toast, etc.
        this.playNotificationSound();
      })
    );
  }

  /**
   * Play a notification sound
   */
  private playNotificationSound(): void {
    // You could implement sound notifications here
    console.log('New notification received');
  }

  /**
   * Mark a notification as read
   */
  markAsRead(notification: Notification): void {
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id).subscribe(
        () => console.log('Notification marked as read'),
        error => console.error('Error marking notification as read:', error)
      );
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    this.notificationService.markAllAsRead(this.userId).subscribe(
      () => console.log('All notifications marked as read'),
      error => console.error('Error marking all notifications as read:', error)
    );
  }

  /**
   * Delete a notification
   */
  deleteNotification(notification: Notification, event: Event): void {
    event.stopPropagation(); // Prevent the click from triggering the markAsRead
    
    this.notificationService.deleteNotification(notification.id).subscribe(
      () => console.log('Notification deleted'),
      error => console.error('Error deleting notification:', error)
    );
  }

  /**
   * Generate a test notification
   */
  createTestNotification(): void {
    this.notificationService.sendTestNotification().subscribe(
      () => console.log('Test notification sent'),
      error => console.error('Error sending test notification:', error)
    );
  }

  /**
   * Create a custom notification
   */
  createCustomNotification(type: NotificationType = NotificationType.Info): void {
    const notification = {
      title: 'Custom Notification',
      message: `This is a custom ${NotificationType[type].toLowerCase()} notification created at ${new Date().toLocaleTimeString()}.`,
      type: type,
      userId: this.userId
    };

    this.notificationService.sendNotification(notification).subscribe(
      () => console.log('Custom notification sent'),
      error => console.error('Error sending custom notification:', error)
    );
  }

  /**
   * Get the CSS class for a notification based on its type
   */
  getNotificationClass(type: NotificationType): string {
    switch (type) {
      case NotificationType.Success:
        return 'notification-success';
      case NotificationType.Warning:
        return 'notification-warning';
      case NotificationType.Error:
        return 'notification-error';
      case NotificationType.Info:
      default:
        return 'notification-info';
    }
  }

  /**
   * Get the icon for a notification based on its type
   */
  getNotificationIcon(type: NotificationType): string {
    switch (type) {
      case NotificationType.Success:
        return 'check_circle';
      case NotificationType.Warning:
        return 'warning';
      case NotificationType.Error:
        return 'error';
      case NotificationType.Info:
      default:
        return 'info';
    }
  }

  /**
   * Format notification timestamp
   */
  formatTime(timestamp: Date): string {
    if (!timestamp) {
      return '';
    }
    
    const now = new Date();
    const date = new Date(timestamp);
    
    // If it's today, just show the time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Otherwise show the date
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscription.unsubscribe();
  }
}
