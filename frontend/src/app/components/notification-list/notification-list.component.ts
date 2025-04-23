import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { NotificationService, NotificationEvent } from '../../services/notification.service';
import { SignalRService, SignalREvent } from '../../services/signalr.service';
import { Notification, NotificationType } from '../../models/notification.model';
import { NgEventBus } from 'ng-event-bus';

@Component({
  selector: 'app-notification-list',
  templateUrl: './notification-list.component.html',
  styleUrls: ['./notification-list.component.scss']
})
export class NotificationListComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  isLoading: boolean = true;
  connectionEstablished: boolean = false;
  unreadCount: number = 0;
  
  // For filtering
  selectedType: string = 'all';
  showUnreadOnly: boolean = false;
  
  // Expose NotificationType enum to template
  NotificationType = NotificationType;
  
  // Mock user ID (in a real app this would come from authentication)
  private readonly mockUserId: string = 'user1';
  
  // Subscriptions to clean up on destroy
  private subscriptions: Subscription[] = [];

  constructor(
    private notificationService: NotificationService,
    private signalRService: SignalRService,
    private eventBus: NgEventBus
  ) {}

  async ngOnInit(): Promise<void> {
    // Initialize notification service with mock user ID
    await this.notificationService.initialize(this.mockUserId);
    
    // Subscribe to notifications
    const notificationsSub = this.notificationService.notifications$.subscribe(
      notifications => {
        this.notifications = notifications;
        this.isLoading = false;
      }
    );
    this.subscriptions.push(notificationsSub);
    
    // Subscribe to unread count
    const unreadSub = this.notificationService.unreadCount$.subscribe(
      count => this.unreadCount = count
    );
    this.subscriptions.push(unreadSub);
    
    // Subscribe to connection state
    const connectionSub = this.signalRService.connectionState$.subscribe(
      connected => this.connectionEstablished = connected
    );
    this.subscriptions.push(connectionSub);
    
    // Subscribe to notification events from EventBus
    this.subscribeToEventBus();
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Subscribe to relevant events from the EventBus
   */
  private subscribeToEventBus(): void {
    // Notification received event
    const receivedSub = this.eventBus.on(SignalREvent.NOTIFICATION_RECEIVED).subscribe(() => {
      // We don't need to do anything here because the notification service
      // already updates its state, which we're subscribed to
    });
    this.subscriptions.push(receivedSub);
    
    // Connection state changed event
    const connectionSub = this.eventBus.on(SignalREvent.CONNECTION_STATE_CHANGED).subscribe(() => {
      // Update connection state flag (already handled by subscribing to connectionState$)
    });
    this.subscriptions.push(connectionSub);
  }

  /**
   * Mark a notification as read
   */
  onMarkAsRead(notificationId: string): void {
    this.notificationService.markAsRead(notificationId).subscribe();
  }

  /**
   * Delete a notification
   */
  onDelete(notificationId: string): void {
    this.notificationService.deleteNotification(notificationId).subscribe();
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    this.notificationService.markAllAsRead(this.mockUserId).subscribe();
  }

  /**
   * Send a test notification
   */
  sendTestNotification(): void {
    this.notificationService.sendTestNotification().subscribe();
  }

  /**
   * Filter notifications by type
   */
  onTypeFilterChange(event: Event): void {
    this.selectedType = (event.target as HTMLSelectElement).value;
  }

  /**
   * Toggle showing unread notifications only
   */
  toggleUnreadOnly(): void {
    this.showUnreadOnly = !this.showUnreadOnly;
  }

  /**
   * Get filtered notifications based on selected filters
   */
  get filteredNotifications(): Notification[] {
    return this.notifications.filter(notification => {
      // Filter by type
      if (this.selectedType !== 'all') {
        const typeValue = Number(this.selectedType);
        if (notification.type !== typeValue) {
          return false;
        }
      }
      
      // Filter by read status
      if (this.showUnreadOnly && notification.isRead) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Get notification type label for display
   */
  getNotificationTypeLabel(type: NotificationType): string {
    switch (type) {
      case NotificationType.Info:
        return 'Info';
      case NotificationType.Success:
        return 'Success';
      case NotificationType.Warning:
        return 'Warning';
      case NotificationType.Error:
        return 'Error';
      default:
        return 'Unknown';
    }
  }
}
