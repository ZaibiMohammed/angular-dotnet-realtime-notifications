import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { NgEventBus } from 'ng-event-bus';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NotificationService, NotificationEvent } from '../../services/notification.service';
import { Notification, NotificationType } from '../../models/notification.model';
import { environment } from '../../../environments/environment';

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

  // Direct API URL for HTTP requests
  private apiUrl = `${environment.apiUrl}/notifications`;
  
  // HTTP options with headers
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    })
  };

  constructor(
    private notificationService: NotificationService,
    private eventBus: NgEventBus,
    private http: HttpClient
  ) {
    this.notifications$ = this.notificationService.notifications$;
    this.unreadCount$ = this.notificationService.unreadCount$;
    
    // Log the notification service instance to verify it's properly injected
    console.log('NotificationService instance:', this.notificationService);
    console.log('API URL from environment:', this.notificationService.getApiUrl());
    console.log('Direct API URL:', this.apiUrl);
  }

  ngOnInit(): void {
    console.log('NotificationComponent.ngOnInit called');
    
    // Initialize the notification service and load initial data
    this.notificationService.initialize(this.userId)
      .then(() => {
        console.log('Notification service initialized successfully');
        // Force load notifications after initialization
        this.loadNotifications();
      })
      .catch(err => {
        console.error('Failed to initialize notification service:', err);
        // Try to load notifications anyway
        this.loadNotifications();
      });

    // Subscribe to notification events
    this.subscribeToNotificationEvents();
  }
  
  /**
   * Load notifications from the API
   */
  private loadNotifications(): void {
    console.log('Loading notifications for user:', this.userId);
    this.notificationService.getUserNotifications(this.userId).subscribe(
      notifications => {
        console.log('Loaded notifications:', notifications);
      },
      error => {
        console.error('Error loading notifications:', error);
      }
    );
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
    console.log('markAsRead method called with notification:', notification);
    if (!notification.isRead) {
      console.log('Calling notificationService.markAsRead with ID:', notification.id);
      this.notificationService.markAsRead(notification.id).subscribe(
        () => console.log('Notification marked as read successfully'),
        error => console.error('Error marking notification as read:', error)
      );
    } else {
      console.log('Notification is already marked as read, skipping');
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    console.log('markAllAsRead method called for user:', this.userId);
    this.notificationService.markAllAsRead(this.userId).subscribe(
      () => console.log('All notifications marked as read successfully'),
      error => console.error('Error marking all notifications as read:', error)
    );
  }

  /**
   * Delete a notification
   */
  deleteNotification(notification: Notification, event: Event): void {
    console.log('deleteNotification method called with notification:', notification);
    event.stopPropagation(); // Prevent the click from triggering the markAsRead
    
    console.log('Calling notificationService.deleteNotification with ID:', notification.id);
    this.notificationService.deleteNotification(notification.id).subscribe(
      () => console.log('Notification deleted successfully'),
      error => console.error('Error deleting notification:', error)
    );
  }

  /**
   * Generate a test notification
   */
  createTestNotification(): void {
    console.log('createTestNotification method called');
    console.log('Sending direct HTTP request to:', `${this.apiUrl}/test`);
    
    // Use direct HTTP request instead of the notification service
    this.http.post(`${this.apiUrl}/test`, {}, this.httpOptions).subscribe(
      (response) => {
        console.log('Test notification sent successfully, response:', response);
        alert('Test notification sent successfully!');
      },
      error => {
        console.error('Error sending test notification:', error);
        alert('Error sending test notification. See console for details.');
      }
    );
  }

  /**
   * Create a custom notification
   */
  createCustomNotification(type: NotificationType = NotificationType.Info): void {
    console.log(`createCustomNotification method called with type: ${NotificationType[type]}`);
    
    const notification = {
      title: 'Custom Notification',
      message: `This is a custom ${NotificationType[type].toLowerCase()} notification created at ${new Date().toLocaleTimeString()}.`,
      type: type,
      userId: this.userId
    };

    console.log('Notification object created:', notification);
    console.log('Sending direct HTTP request to:', this.apiUrl);
    
    // Use direct HTTP request instead of the notification service
    this.http.post(this.apiUrl, notification, this.httpOptions).subscribe(
      (response) => {
        console.log('Custom notification sent successfully, response:', response);
        alert(`Custom ${NotificationType[type].toLowerCase()} notification sent successfully!`);
      },
      error => {
        console.error('Error sending custom notification:', error);
        alert('Error sending custom notification. See console for details.');
      }
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
